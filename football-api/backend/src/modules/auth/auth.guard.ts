import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

// Guardia HTTP: una ruta que lo usa exige un token Bearer firmado correctamente.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: unknown;
    }>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Debes iniciar sesión');
    }
    // Guarda los datos verificados en la solicitud para que otras capas los usen.
    request.user = this.authService.verifyToken(authorization.slice(7));
    return true;
  }
}
