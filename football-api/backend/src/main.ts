import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

// Punto de entrada: configura servicios HTTP y deja la API escuchando.
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Solo permite que la interfaz web configurada llame al backend desde el navegador.
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });
  const documentConfig = new DocumentBuilder()
    .setTitle('FIFA Player Manager API')
    .setDescription('API para consultar y administrar jugadores FIFA.')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  // Swagger publica la especificación y la consola interactiva de la API.
  const document = SwaggerModule.createDocument(app, documentConfig);
  SwaggerModule.setup('api/docs', app, document);
  await app.listen(Number(process.env.PORT || 3000), '0.0.0.0');
}
void bootstrap();
