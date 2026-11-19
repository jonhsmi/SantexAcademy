import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { UserModel } from './user.model';

const scryptAsync = promisify(scrypt);
const TOKEN_LIFETIME_SECONDS = 8 * 60 * 60;

// Datos públicos del usuario: la contraseña nunca forma parte de una sesión.
export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

interface TokenPayload extends AuthUser {
  exp: number;
}

@Injectable()
export class AuthService {
  private readonly secret =
    process.env.JWT_SECRET || 'local-development-secret-change-before-deploy';

  constructor() {
    if (
      process.env.NODE_ENV === 'production' &&
      (this.secret === 'local-development-secret-change-before-deploy' ||
        this.secret === 'replace-this-development-secret')
    ) {
      throw new Error('JWT_SECRET must be set outside local development');
    }
  }

  async register(name: string, email: string, password: string) {
    // Normalizar el correo evita duplicados por diferencias de mayúsculas/espacios.
    const normalizedEmail = email.trim().toLowerCase();
    if (await UserModel.findOne({ where: { email: normalizedEmail } })) {
      throw new ConflictException('El correo ya está registrado');
    }

    const user = await UserModel.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: await this.hashPassword(password),
    });
    return this.session(user);
  }

  async login(email: string, password: string) {
    const user = await UserModel.findOne({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user || !(await this.verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    return this.session(user);
  }

  // Comprueba firma y vencimiento antes de confiar en los datos del token.
  verifyToken(token: string): AuthUser {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) {
      throw new UnauthorizedException('Token inválido');
    }

    const expected = this.sign(`${header}.${payload}`);
    const providedBytes = Buffer.from(signature);
    const expectedBytes = Buffer.from(expected);
    if (
      providedBytes.length !== expectedBytes.length ||
      !timingSafeEqual(providedBytes, expectedBytes)
    ) {
      throw new UnauthorizedException('Token inválido');
    }

    let decoded: TokenPayload;
    try {
      decoded = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      ) as TokenPayload;
    } catch {
      throw new UnauthorizedException('Token inválido');
    }

    if (!decoded.id || decoded.exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('La sesión venció');
    }
    return { id: decoded.id, name: decoded.name, email: decoded.email };
  }

  private async hashPassword(password: string): Promise<string> {
    // Cada contraseña obtiene sal aleatoria; scrypt deriva el valor guardado.
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${salt}:${derivedKey.toString('hex')}`;
  }

  private async verifyPassword(password: string, stored: string) {
    const [salt, hash] = stored.split(':');
    if (!salt || !/^[0-9a-f]{128}$/i.test(hash)) return false;
    const expected = Buffer.from(hash, 'hex');
    const actual = (await scryptAsync(password, salt, expected.length)) as Buffer;
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }

  private session(user: UserModel) {
    const publicUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
    };
    const payload: TokenPayload = {
      ...publicUser,
      exp: Math.floor(Date.now() / 1000) + TOKEN_LIFETIME_SECONDS,
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );
    // Emite un token firmado con HMAC y limitado por exp; el usuario devuelto es público.
    const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${encodedPayload}`;
    return { token: `${token}.${this.sign(token)}`, user: publicUser };
  }

  private sign(value: string) {
    return createHmac('sha256', this.secret).update(value).digest('base64url');
  }
}
