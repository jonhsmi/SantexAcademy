// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import sequelizeConfig from './config/sequelize.config';
import { PlayersModule } from './modules/players/players.module';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseSchemaService } from './database-schema.service';
import { HealthController } from './health.controller';
import { DatasetImportService } from './dataset-import.service';

// Ensambla los módulos de la aplicación y los procesos que corren al iniciar Nest.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
    }),
    SequelizeModule.forRoot(sequelizeConfig),
    AuthModule,
    PlayersModule,
  ],
  controllers: [HealthController],
  providers: [DatabaseSchemaService, DatasetImportService],
})
export class AppModule {}
