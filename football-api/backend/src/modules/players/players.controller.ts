import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { PlayersService, PlayerFilters, PlayerInput } from './players.service';

// Las rutas de jugadores se protegen en conjunto: todas requieren una sesión.
@Controller('api/players')
@UseGuards(AuthGuard)
@ApiTags('Jugadores')
@ApiBearerAuth()
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  // Convierte los parámetros de consulta en filtros y límites seguros de paginación.
  @Get()
  @ApiOperation({ summary: 'Listar jugadores con filtros y paginación' })
  @ApiQuery({ name: 'name', required: false })
  @ApiQuery({ name: 'club', required: false })
  @ApiQuery({ name: 'position', required: false })
  @ApiQuery({ name: 'nationality', required: false })
  @ApiQuery({ name: 'gender', required: false, enum: ['Male', 'Female'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  list(
    @Query() query: PlayerFilters,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.playersService.list(
      query,
      this.positiveInteger(page, 1, 'página'),
      Math.min(this.positiveInteger(limit, 10, 'límite'), 100),
    );
  }

  // Reutiliza los filtros del listado y devuelve el resultado como archivo descargable.
  @Get('export')
  @ApiOperation({ summary: 'Exportar como CSV con los filtros seleccionados' })
  async export(
    @Query() query: PlayerFilters,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="players.csv"',
    );
    return this.playersService.exportCsv(query);
  }

  // Recibe el archivo del formulario; el servicio valida su contenido y filas.
  @Post('import')
  @ApiOperation({ summary: 'Importar jugadores desde un archivo CSV' })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  import(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Selecciona un archivo CSV');
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('Solo se aceptan archivos CSV');
    }
    return this.playersService.importCsv(file.buffer);
  }

  // Expone la evolución de una habilidad concreta en las distintas ediciones.
  @Get(':id/timeline/:skill')
  @ApiOperation({ summary: 'Consultar la evolución histórica de una habilidad' })
  timeline(
    @Param('id', ParseIntPipe) id: number,
    @Param('skill') skill: string,
  ) {
    return this.playersService.timeline(id, skill);
  }

  // Devuelve una ficha con sus datos e historial combinado.
  @Get(':id')
  @ApiOperation({ summary: 'Obtener perfil y ediciones de un jugador' })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.playersService.get(id);
  }

  // Crea tanto la ficha actual como su primera versión histórica.
  @Post()
  @ApiOperation({ summary: 'Crear un jugador y su edición inicial' })
  create(@Body() body: PlayerInput) {
    return this.playersService.create(body);
  }

  // Actualiza la ficha y conserva la edición indicada en el formulario.
  @Put(':id')
  @ApiOperation({ summary: 'Editar un jugador y guardar una edición' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: PlayerInput,
  ) {
    return this.playersService.update(id, body);
  }

  // Rechaza páginas/límites inválidos en vez de enviar valores silenciosos a SQL.
  private positiveInteger(value: string | undefined, fallback: number, label: string) {
    if (value === undefined) return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException(`El ${label} debe ser un entero positivo`);
    }
    return parsed;
  }
}
