import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { createReadStream, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse';
import { InferCreationAttributes } from 'sequelize';
import { PlayerModel } from './modules/players/repositories/sequelize/player.model';
import { DatasetImportModel } from './modules/players/repositories/sequelize/dataset-import.model';

const BATCH_SIZE = 500;

interface DatasetRow {
  fifa_version: string;
  fifa_update: string;
  long_name: string;
  player_positions: string;
  player_face_url: string;
  club_name: string;
  nationality_name: string;
  overall: string;
  potential: string;
  age: string;
  pace: string;
  shooting: string;
  passing: string;
  dribbling: string;
  defending: string;
  physic: string;
}

// Carga los CSV iniciales por streaming para no mantener archivos grandes en memoria.
@Injectable()
export class DatasetImportService implements OnApplicationBootstrap {
  // Se ejecuta después de conectar con la base; Nest espera a que termine antes de escuchar.
  async onApplicationBootstrap() {
    const datasets = [
      {
        key: 'male_players-1.csv',
        path:
          process.env.MALE_PLAYERS_CSV ||
          resolve(process.cwd(), '../../male_players-1.csv'),
        gender: 'Male' as const,
      },
      {
        key: 'female_players-1.csv',
        path:
          process.env.FEMALE_PLAYERS_CSV ||
          resolve(process.cwd(), '../../female_players-1.csv'),
        gender: 'Female' as const,
      },
    ];

    for (const dataset of datasets) {
      if (!existsSync(dataset.path)) {
        throw new Error(
          `Required ${dataset.gender.toLowerCase()} FIFA dataset not found: ${dataset.path}`,
        );
      }
      await this.importDataset(dataset);
    }
  }

  private async importDataset(dataset: {
    key: string;
    path: string;
    gender: 'Male' | 'Female';
  }) {
    // La marca de finalización hace que los reinicios no vuelvan a insertar el dataset.
    const previous = await DatasetImportModel.findByPk(dataset.key);
    if (previous?.completedAt) {
      console.log(`Dataset ${dataset.key} already imported`);
      return;
    }

    console.log(`Importing ${dataset.gender.toLowerCase()} FIFA dataset`);
    // El parser lee cada registro conforme llega desde el archivo.
    const parser = createReadStream(dataset.path).pipe(
      parse({ columns: true, bom: true, skip_empty_lines: true }),
    );
    let activeVersion: string | null = null;
    let existingSignatures = new Map<string, number>();
    let batch: Omit<InferCreationAttributes<PlayerModel>, 'id'>[] = [];
    let imported = 0;
    let skipped = 0;

    const flush = async () => {
      if (!batch.length) return;
      const currentBatch = batch;
      batch = [];
      await PlayerModel.bulkCreate(currentBatch);
      imported += currentBatch.length;
    };

    for await (const rawRow of parser) {
      const row = rawRow as DatasetRow;
      const version = this.normalizeVersion(row.fifa_version);
      if (!version) continue;

      if (activeVersion !== version) {
        await flush();
        activeVersion = version;
        // Carga solo las firmas de la edición actual para omitir filas ya existentes.
        const existing = await PlayerModel.findAll({
          where: { fifaVersion: version, gender: dataset.gender },
          attributes: ['longName', 'fifaUpdate'],
        });
        existingSignatures = new Map<string, number>();
        for (const player of existing) {
          const signature = this.signature(player.longName, player.fifaUpdate);
          existingSignatures.set(
            signature,
            (existingSignatures.get(signature) || 0) + 1,
          );
        }
      }

      const name = String(row.long_name || '').trim();
      if (!name) continue;
      const fifaUpdate = String(row.fifa_update || '0');
      const signature = this.signature(name, fifaUpdate);
      const matchCount = existingSignatures.get(signature) || 0;
      if (matchCount > 0) {
        // Consumir el contador permite manejar duplicados reales del mismo nombre/actualización.
        existingSignatures.set(signature, matchCount - 1);
        skipped++;
        continue;
      }

      const rating = this.integer(row.overall, 50, 1, 99);
      batch.push({
        fifaVersion: version,
        fifaUpdate,
        playerFaceUrl: String(row.player_face_url || '').slice(0, 255),
        longName: name.slice(0, 255),
        playerPositions: String(row.player_positions || 'Unknown').slice(0, 255),
        clubName: String(row.club_name || '').slice(0, 255) || null,
        nationalityName: String(row.nationality_name || '').slice(0, 255) || null,
        overall: rating,
        potential: this.integer(row.potential, rating, 1, 99),
        age: this.integer(row.age, 18, 1, 100),
        gender: dataset.gender,
        pace: this.integer(row.pace, rating, 1, 99),
        shooting: this.integer(row.shooting, rating, 1, 99),
        passing: this.integer(row.passing, rating, 1, 99),
        dribbling: this.integer(row.dribbling, rating, 1, 99),
        defending: this.integer(row.defending, rating, 1, 99),
        physic: this.integer(row.physic, rating, 1, 99),
      });
      if (batch.length >= BATCH_SIZE) await flush();
    }
    await flush();
    await DatasetImportModel.upsert({
      key: dataset.key,
      completedAt: new Date(),
    });
    console.log(
      `Imported ${dataset.key}: ${imported} rows inserted, ${skipped} existing rows kept`,
    );
  }

  private normalizeVersion(value: string) {
    // La base guarda la edición en dos dígitos, por ejemplo "23".
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 15 || parsed > 23) return null;
    return String(parsed).padStart(2, '0');
  }

  private integer(value: string, fallback: number, min: number, max: number) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= min && parsed <= max
      ? parsed
      : fallback;
  }

  private signature(name: string, update: string) {
    return `${name}\u0000${update}`;
  }
}
