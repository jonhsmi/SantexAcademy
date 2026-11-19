import { Player } from '../../entities/player.entity';
import { IPlayerRepository } from '../../interfaces/player-repository.interface';

// Repositorio de demostración en memoria; no persiste y no está cableado al runtime.
export class InMemoryPlayerRepository implements IPlayerRepository {
  private players: Player[] = [];

  async findAll(): Promise<Player[]> {
    // Devuelve una copia para no exponer directamente el arreglo interno.
    return Promise.resolve([...this.players]);
  }

  async findOneById(id: number): Promise<Player | undefined> {
    return Promise.resolve(this.players.find((p) => p.id === id));
  }
}
