import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { parse } from 'csv-parse/sync';
import { Op, WhereOptions } from 'sequelize';
import { PlayerModel } from './repositories/sequelize/player.model';
import { PlayerVersionModel } from './repositories/sequelize/player-version.model';

export interface PlayerFilters {
  name?: string;
  club?: string;
  position?: string;
  nationality?: string;
  gender?: string;
}

export interface PlayerInput {
  name?: string;
  position?: string;
  club?: string;
  nationality?: string;
  gender?: 'Male' | 'Female';
  rating?: number;
  age?: number;
  year?: number;
  pace?: number;
  shooting?: number;
  passing?: number;
  dribbling?: number;
  defending?: number;
  physical?: number;
}

const SKILLS = [
  'pace',
  'shooting',
  'passing',
  'dribbling',
  'defending',
  'physical',
] as const;
type Skill = (typeof SKILLS)[number];

// Reúne reglas de negocio y acceso a los modelos para jugadores e historial.
@Injectable()
export class PlayersService {
  constructor(
    @InjectModel(PlayerModel)
    private readonly players: typeof PlayerModel,
    @InjectModel(PlayerVersionModel)
    private readonly versions: typeof PlayerVersionModel,
  ) {}

  // Construye filtros, limita resultados a una página y devuelve el total coincidente.
  async list(filters: PlayerFilters, page: number, limit: number) {
    const where = this.filterWhere(filters);
    const { rows, count } = await this.players.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      order: [
        ['longName', 'ASC'],
        ['id', 'ASC'],
      ],
    });
    return {
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    };
  }

  // Combina las ediciones del dataset con los cambios manuales guardados por la app.
  async get(id: number) {
    const player = await this.players.findByPk(id);
    if (!player) throw new NotFoundException('Jugador no encontrado');

    const [sourceRows, editedVersions] = await Promise.all([
      this.players.findAll({
        where: { longName: player.longName, gender: player.gender },
        order: [['fifaVersion', 'ASC']],
      }),
      this.versions.findAll({
        where: { playerId: id },
        order: [['year', 'ASC']],
      }),
    ]);

    const byYear = new Map<number, Record<string, number>>();
    // Si existen varias actualizaciones de una edición, conserva la más reciente.
    for (const row of sourceRows) {
      const year = this.yearNumber(row.fifaVersion);
      if (!year) continue;
      const current = byYear.get(year);
      const update = Number(row.fifaUpdate) || 0;
      const currentUpdate = Number(current?.['sourceUpdate']) || -1;
      if (!current || update >= currentUpdate) {
        byYear.set(year, {
          year,
          sourceUpdate: update,
          rating: row.overall,
          pace: row.pace ?? row.overall,
          shooting: row.shooting ?? row.overall,
          passing: row.passing ?? row.overall,
          dribbling: row.dribbling ?? row.overall,
          defending: row.defending ?? row.overall,
          physical: row.physic ?? row.overall,
        });
      }
    }
    // La edición guardada manualmente tiene prioridad para ese jugador y año.
    for (const version of editedVersions) {
      byYear.set(version.year, {
        year: version.year,
        rating: version.rating,
        pace: version.pace,
        shooting: version.shooting,
        passing: version.passing,
        dribbling: version.dribbling,
        defending: version.defending,
        physical: version.physical,
      });
    }
    return { ...player.toJSON(), versions: [...byYear.values()] };
  }

  // Valida el formulario, guarda el registro y crea la primera versión.
  async create(input: PlayerInput) {
    const values = this.validate(input);
    const player = await this.players.create({
      fifaVersion: String(values.year % 100).padStart(2, '0'),
      fifaUpdate: '0',
      playerFaceUrl: '',
      longName: values.name,
      playerPositions: values.position,
      clubName: values.club || null,
      nationalityName: values.nationality || null,
      overall: values.rating,
      potential: values.rating,
      age: values.age,
      gender: values.gender,
      pace: values.pace,
      shooting: values.shooting,
      passing: values.passing,
      dribbling: values.dribbling,
      defending: values.defending,
      physic: values.physical,
    });
    await this.saveVersion(player.id, values);
    return this.get(player.id);
  }

  // Actualiza el registro actual y hace upsert de su versión para evitar duplicados.
  async update(id: number, input: PlayerInput) {
    const player = await this.players.findByPk(id);
    if (!player) throw new NotFoundException('Jugador no encontrado');
    const values = this.validate(input);
    await player.update({
      longName: values.name,
      playerPositions: values.position,
      clubName: values.club || null,
      nationalityName: values.nationality || null,
      overall: values.rating,
      age: values.age,
      gender: values.gender,
      pace: values.pace,
      shooting: values.shooting,
      passing: values.passing,
      dribbling: values.dribbling,
      defending: values.defending,
      physic: values.physical,
    });
    await this.saveVersion(id, values);
    return this.get(id);
  }

  // Prepara puntos y una descripción sencilla de la tendencia de la habilidad elegida.
  async timeline(id: number, skillName: string) {
    if (!SKILLS.includes(skillName as Skill)) {
      throw new BadRequestException('Habilidad inválida');
    }
    const player = await this.players.findByPk(id);
    if (!player) throw new NotFoundException('Jugador no encontrado');
    const skill = skillName as Skill;
    const details = await this.get(id);
    const points = details.versions.map(
      (version: Record<string, number>) => ({
        year: version['year'],
        value: version[skill],
      }),
    );
    let insight = 'Historial insuficiente para identificar una tendencia.';
    if (points.length > 1) {
      const first = points[0];
      const last = points[points.length - 1];
      const peak = points.reduce((best, point) =>
        point.value > best.value ? point : best,
      );
      const direction =
        last.value >= first.value ? 'mejoró' : 'descendió';
      insight = `${player.longName} ${direction} en ${skill} de ${first.value} (${first.year}) a ${last.value} (${last.year}); su mejor registro fue ${peak.value} en ${peak.year}.`;
    }
    return { skill, points, insight };
  }

  // Exporta el mismo subconjunto que se obtiene al filtrar el catálogo.
  async exportCsv(filters: PlayerFilters) {
    const rows = await this.players.findAll({
      where: this.filterWhere(filters),
      order: [['longName', 'ASC']],
    });
    const fields = [
      'id',
      'longName',
      'playerPositions',
      'clubName',
      'overall',
      'nationalityName',
      'age',
      'gender',
    ];
    const escape = (value: unknown) => {
      const text = String(value ?? '');
      // Anteponer apóstrofo neutraliza fórmulas si alguien abre el CSV en una hoja de cálculo.
      const safeText = /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safeText.replaceAll('"', '""')}"`;
    };
    return [
      fields.join(','),
      ...rows.map((row) =>
        fields.map((field) => escape(row.get(field))).join(','),
      ),
    ].join('\r\n');
  }

  // Acepta nombres de columnas equivalentes y procesa filas válidas en lotes.
  async importCsv(buffer: Buffer) {
    let rows: Record<string, string>[];
    try {
      rows = parse(buffer, {
        columns: true,
        bom: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as Record<string, string>[];
    } catch {
      throw new BadRequestException('El archivo CSV no tiene un formato válido');
    }
    if (!rows.length) throw new BadRequestException('El CSV no contiene filas');

    const normalize = (value: string) =>
      value.toLowerCase().replace(/[^a-z0-9]/g, '');
    // Normalizar encabezados admite variantes como "long_name" y "Long Name".
    const imported = rows.map((row) => {
      const values = new Map(
        Object.entries(row).map(([key, value]) => [normalize(key), value]),
      );
      const get = (...keys: string[]) => {
        for (const key of keys) {
          const value = values.get(normalize(key));
          if (value) return value;
        }
        return '';
      };
      const integer = (value: string, fallback: number) => {
        const parsed = Number(value);
        return Number.isInteger(parsed) ? parsed : fallback;
      };
      const bounded = (
        value: string,
        fallback: number,
        min: number,
        max: number,
      ) => {
        const parsed = integer(value, fallback);
        return parsed >= min && parsed <= max ? parsed : fallback;
      };
      const name = get('long_name', 'short_name', 'name');
      if (!name) return null;
      const rating = bounded(get('overall', 'rating'), 50, 1, 99);
      const rawYear = integer(get('fifa_version', 'year'), 23);
      const rawGender = get('gender');
      const gender: 'Male' | 'Female' = rawGender.toLowerCase().startsWith('f')
        ? 'Female'
        : 'Male';
      return {
        fifaVersion: String(rawYear < 100 ? rawYear : rawYear % 100).padStart(
          2,
          '0',
        ),
        fifaUpdate: get('fifa_update') || '0',
        playerFaceUrl: get('player_face_url').slice(0, 255),
        longName: name.slice(0, 255),
        playerPositions: (get('player_positions', 'position') || 'Unknown').slice(
          0,
          255,
        ),
        clubName: get('club_name', 'club').slice(0, 255) || null,
        nationalityName: get('nationality_name', 'nationality').slice(0, 255) || null,
        overall: this.rating(rating),
        potential: this.rating(integer(get('potential'), rating)),
        age: bounded(get('age'), 18, 1, 100),
        gender,
        pace: bounded(get('pace'), rating, 1, 99),
        shooting: bounded(get('shooting'), rating, 1, 99),
        passing: bounded(get('passing'), rating, 1, 99),
        dribbling: bounded(get('dribbling'), rating, 1, 99),
        defending: bounded(get('defending'), rating, 1, 99),
        physic: bounded(get('physic', 'physical'), rating, 1, 99),
      };
    });
    const validRows = imported.filter(
      (row): row is NonNullable<typeof row> => row !== null,
    );
    if (!validRows.length) {
      throw new BadRequestException('No se encontraron jugadores válidos');
    }
    let count = 0;
    for (let offset = 0; offset < validRows.length; offset += 500) {
      const batch = validRows.slice(offset, offset + 500);
      await this.players.bulkCreate(batch);
      count += batch.length;
    }
    return { imported: count };
  }

  // Una misma edición por jugador se reemplaza en lugar de duplicarse.
  private async saveVersion(playerId: number, values: Required<PlayerInput>) {
    await this.versions.upsert({
      playerId,
      year: values.year,
      rating: values.rating,
      pace: values.pace,
      shooting: values.shooting,
      passing: values.passing,
      dribbling: values.dribbling,
      defending: values.defending,
      physical: values.physical,
    });
  }

  // Centraliza rangos y valores obligatorios para altas y modificaciones.
  private validate(input: PlayerInput): Required<PlayerInput> {
    const name = String(input.name ?? '').trim();
    const position = String(input.position ?? '').trim();
    if (name.length < 2 || name.length > 255) {
      throw new BadRequestException('El nombre debe tener entre 2 y 255 caracteres');
    }
    if (!position || position.length > 255) {
      throw new BadRequestException('Indica una posición válida');
    }
    const rating = this.rating(input.rating);
    const year = this.range(input.year ?? 2023, 2015, 2023, 'edición');
    const age = this.range(input.age ?? 18, 1, 100, 'edad');
    const gender = input.gender ?? 'Male';
    if (gender !== 'Male' && gender !== 'Female') {
      throw new BadRequestException('El género no es válido');
    }
    const skill = (value: number | undefined) =>
      this.range(value ?? rating, 1, 99, 'habilidad');
    return {
      name,
      position,
      club: String(input.club ?? '').trim(),
      nationality: String(input.nationality ?? '').trim(),
      gender,
      rating,
      age,
      year,
      pace: skill(input.pace),
      shooting: skill(input.shooting),
      passing: skill(input.passing),
      dribbling: skill(input.dribbling),
      defending: skill(input.defending),
      physical: skill(input.physical),
    };
  }

  private rating(value: number | undefined) {
    return this.range(value, 1, 99, 'rating');
  }

  private range(value: number | undefined, min: number, max: number, label: string) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < min || number > max) {
      throw new BadRequestException(`${label} debe estar entre ${min} y ${max}`);
    }
    return number;
  }

  private yearNumber(value: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    const year = parsed < 100 ? 2000 + parsed : parsed;
    return year >= 2015 && year <= 2023 ? year : 0;
  }

  // Evita construir condiciones con filtros que no pertenecen a la API.
  private filterWhere(filters: PlayerFilters): WhereOptions {
    const where: Record<string, unknown> = {};
    for (const [key, column] of [
      ['name', 'longName'],
      ['club', 'clubName'],
      ['position', 'playerPositions'],
      ['nationality', 'nationalityName'],
    ]) {
      const rawValue = filters[key as keyof PlayerFilters];
      if (rawValue !== undefined && typeof rawValue !== 'string') {
        throw new BadRequestException(`El filtro ${key} debe ser texto`);
      }
      const value = rawValue?.trim();
      if (value) where[column] = { [Op.like]: `%${value}%` };
    }
    if (filters.gender && filters.gender !== 'Male' && filters.gender !== 'Female') {
      throw new BadRequestException('El género no es válido');
    }
    if (filters.gender === 'Male' || filters.gender === 'Female') {
      where['gender'] = filters.gender;
    }
    return where as WhereOptions;
  }
}
