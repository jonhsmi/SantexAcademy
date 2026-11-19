import {
  BadRequestException,
  Body,
  Controller,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';

// Rutas públicas para crear una cuenta e iniciar sesión.
@Controller('api/auth')
@ApiTags('Autenticación')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Valida los campos básicos antes de delegar el registro al servicio.
  @Post('register')
  @ApiOperation({ summary: 'Registrar una cuenta e iniciar sesión' })
  register(
    @Body() body: { name?: string; email?: string; password?: string },
  ) {
    const name = body.name?.trim();
    const email = body.email?.trim();
    const password = body.password;
    if (
      !name ||
      name.length < 2 ||
      name.length > 100 ||
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !password ||
      password.length < 6 ||
      password.length > 72
    ) {
      throw new BadRequestException('Revisa nombre, correo y contraseña');
    }
    return this.authService.register(name, email, password);
  }

  // El servicio comprueba la contraseña y responde con el token de sesión.
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión' })
  login(@Body() body: { email?: string; password?: string }) {
    if (
      !body.email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) ||
      !body.password
    ) {
      throw new BadRequestException('Ingresa un correo y contraseña válidos');
    }
    return this.authService.login(body.email, body.password);
  }
}
