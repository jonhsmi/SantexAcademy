import { scryptSync } from 'node:crypto';
import { UserModel } from './user.model';
import { AuthService } from './auth.service';

// Prueba login, normalización del correo y rechazo de una firma alterada.
describe('AuthService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('creates a verifiable session after a valid login', async () => {
    const salt = 'test-salt';
    const passwordHash = scryptSync('secret123', salt, 64).toString('hex');
    jest.spyOn(UserModel, 'findOne').mockResolvedValue({
      id: 12,
      name: 'Demo',
      email: 'demo@example.test',
      passwordHash: `${salt}:${passwordHash}`,
    } as UserModel);

    const service = new AuthService();
    const session = await service.login(' DEMO@example.test ', 'secret123');

    expect(session.user).toEqual({
      id: 12,
      name: 'Demo',
      email: 'demo@example.test',
    });
    expect(service.verifyToken(session.token)).toEqual(session.user);
    expect(() => service.verifyToken(`${session.token.slice(0, -1)}x`)).toThrow();
  });
});
