import { BadRequestException } from '@nestjs/common';
import { Op } from 'sequelize';
import { PlayerModel } from './repositories/sequelize/player.model';
import { PlayerVersionModel } from './repositories/sequelize/player-version.model';
import { PlayersService } from './players.service';

// Prueba reglas del servicio sin conectarse a una base de datos real.
describe('PlayersService', () => {
  it('returns a paginated player list with filters', async () => {
    const findAndCountAll = jest.fn().mockResolvedValue({ rows: [], count: 0 });
    const service = new PlayersService(
      { findAndCountAll } as unknown as typeof PlayerModel,
      {} as typeof PlayerVersionModel,
    );

    await expect(
      service.list({ name: 'Messi' }, 2, 10),
    ).resolves.toEqual({
      data: [],
      pagination: { page: 2, limit: 10, total: 0, pages: 0 },
    });
    expect(findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
        offset: 10,
        where: { longName: { [Op.like]: '%Messi%' } },
      }),
    );
  });

  it('rejects unsupported timeline skills', async () => {
    const service = new PlayersService(
      {} as typeof PlayerModel,
      {} as typeof PlayerVersionModel,
    );
    await expect(service.timeline(1, 'unknown')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
