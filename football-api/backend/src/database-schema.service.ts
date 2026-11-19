import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { DataType, Sequelize } from 'sequelize-typescript';
import { PlayerModel } from './modules/players/repositories/sequelize/player.model';
import { PlayerVersionModel } from './modules/players/repositories/sequelize/player-version.model';
import { UserModel } from './modules/auth/user.model';
import { DatasetImportModel } from './modules/players/repositories/sequelize/dataset-import.model';

// Crea tablas faltantes y adapta instalaciones existentes sin borrar sus datos.
@Injectable()
export class DatabaseSchemaService implements OnModuleInit {
  constructor(@InjectConnection() private readonly sequelize: Sequelize) {}

  async onModuleInit() {
    // sync() crea cada tabla si todavía no existe; no fuerza una recreación destructiva.
    await PlayerModel.sync();
    await PlayerVersionModel.sync();
    await UserModel.sync();
    await DatasetImportModel.sync();

    const queryInterface = this.sequelize.getQueryInterface();
    const columns = await queryInterface.describeTable('players');
    if (!columns['gender']) {
      // Compatibilidad con la base inicial, que solo traía jugadores masculinos.
      await queryInterface.addColumn('players', 'gender', {
        type: DataType.ENUM('Male', 'Female'),
        allowNull: false,
        defaultValue: 'Male',
      });
    }

    const playerIndexes = (await queryInterface.showIndex(
      'players',
    )) as { name: string }[];
    if (!playerIndexes.some((index) => index.name === 'idx_players_name_gender')) {
      // Acelera la búsqueda de historial por nombre y género.
      await queryInterface.addIndex(
        'players',
        ['long_name', 'gender'],
        { name: 'idx_players_name_gender' },
      );
    }

    const versionIndexes = (await queryInterface.showIndex(
      'player_versions',
    )) as { name: string }[];
    if (!versionIndexes.some((index) => index.name === 'uq_player_versions_year')) {
      // Impide guardar más de una versión del mismo jugador para un mismo año.
      await queryInterface.addIndex(
        'player_versions',
        ['player_id', 'year'],
        { unique: true, name: 'uq_player_versions_year' },
      );
    }
  }
}
