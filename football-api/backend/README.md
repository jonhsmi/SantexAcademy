# API NestJS

La API requiere MySQL configurado con `../docker/db/init.sql`, los datasets indicados abajo y las variables de `../.env`. Ejecuta desde esta carpeta:

```bash
npm ci
npm run start:dev
```

## Rutas

- `POST /api/auth/register` y `POST /api/auth/login`: crear cuenta e iniciar sesión.
- `GET /api/health`: verificar disponibilidad.
- `GET /api/docs`: documentación OpenAPI/Swagger interactiva.
- `GET /api/players`: listar con filtros `name`, `club`, `position`, `nationality`, `gender`, paginación `page` y `limit`.
- `GET /api/players/:id`: detalle y ediciones disponibles.
- `GET /api/players/:id/timeline/:skill`: historial para `pace`, `shooting`, `passing`, `dribbling`, `defending` o `physical`.
- `POST /api/players` y `PUT /api/players/:id`: crear y editar.
- `GET /api/players/export`: descargar CSV con los filtros actuales.
- `POST /api/players/import`: importar un CSV con campo multipart `file` (máximo 10 MB).

Todas las rutas de jugadores requieren `Authorization: Bearer <token>`. La contraseña se almacena con scrypt; el token expira a las ocho horas.

Al iniciar, la API importa de forma idempotente `male_players-1.csv` y `female_players-1.csv` desde `SantexAcademy/`, incluyendo las ediciones disponibles entre FIFA 2015 y FIFA 2023. En Compose se montan como solo lectura; en desarrollo local usa las variables `MALE_PLAYERS_CSV` y `FEMALE_PLAYERS_CSV` si los archivos no están en las rutas predeterminadas.

```bash
npm run build
npm test
```
