import { Module } from '@nestjs/common';
import { PlayersService } from './players.service';
import { PlayersController } from './players.controller';
import { PlayerModel } from './repositories/sequelize/player.model';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthModule } from '../auth/auth.module';
import { PlayerVersionModel } from './repositories/sequelize/player-version.model';
import { AuthGuard } from '../auth/auth.guard';
import { DatasetImportModel } from './repositories/sequelize/dataset-import.model';

// Registra modelos, controlador y servicio del área de jugadores.
@Module({
  imports: [
    SequelizeModule.forFeature([
      PlayerModel,
      PlayerVersionModel,
      DatasetImportModel,
    ]),
    AuthModule,
  ],
  controllers: [PlayersController],
  providers: [PlayersService, AuthGuard],
})
export class PlayersModule {}
