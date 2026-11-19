// Forma de respuesta del ejemplo inicial; no es el DTO principal de la API actual.
export class PlayerDto {
  id: number;
  name: string;
  club: string;
  position: string;
  nationality: string;
  rating: number;
  speed: number;
  shooting: number;
  dribbling: number;
  passing: number;

  constructor(partial: Partial<PlayerDto>) {
    // Copia solo los campos recibidos para formar la instancia de respuesta.
    Object.assign(this, partial);
  }
}
