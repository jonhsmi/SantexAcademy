// src/config/sequelize.config.ts
import { SequelizeModuleOptions } from '@nestjs/sequelize';
import * as dotenv from 'dotenv';
import { PlayerModel } from '../modules/players/repositories/sequelize/player.model';
import { UserModel } from 'src/modules/auth/user.model';
import { PlayerVersionModel } from 'src/modules/players/repositories/sequelize/player-version.model';

dotenv.config({ path: process.env.ENV_FILE || '../.env' }); // carga el archivo .env si aún no lo hizo

// Sequelize traduce los modelos TypeScript a consultas para MySQL.
const sequelizeConfig: SequelizeModuleOptions = {
  dialect: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || '3306'),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'football_db',
  models: [PlayerModel, UserModel, PlayerVersionModel],
  autoLoadModels: true,
  logging: false, // set to true for verbose SQL logs
};

export default sequelizeConfig;
