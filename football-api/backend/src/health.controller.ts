import { Controller, Get } from '@nestjs/common';

// Endpoint público y liviano para comprobar que Nest está disponible.
@Controller('api')
export class HealthController {
  @Get('health')
  check() {
    return { status: 'ok' };
  }
}
