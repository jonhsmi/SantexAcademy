import { Player } from '../entities/player.entity';

// Contrato mínimo compartido por los ejemplos de repositorio del proyecto base.
export interface IPlayerRepository {
  findAll(): Promise<Player[]>;
  findOneById(id: number): Promise<Player | undefined>;
}
