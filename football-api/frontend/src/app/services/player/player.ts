import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

const API_URL = 'http://localhost:3000/api/players';

// Tipos compartidos para mantener coherentes formularios y respuestas del backend.
export type Gender = 'Male' | 'Female';
export type SkillKey =
  | 'pace'
  | 'shooting'
  | 'passing'
  | 'dribbling'
  | 'defending'
  | 'physical';

export interface PlayerVersion {
  year: number;
  rating: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
}

export interface Player {
  id: number;
  longName: string;
  playerPositions: string;
  clubName: string | null;
  nationalityName: string | null;
  overall: number;
  age: number;
  gender: Gender;
  versions?: PlayerVersion[];
}

export interface PlayerInput {
  name: string;
  position: string;
  club: string;
  nationality: string;
  gender: Gender;
  rating: number;
  age: number;
  year: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
}

export interface PlayerFilters {
  name: string;
  club: string;
  position: string;
  nationality: string;
  gender: string;
}

export interface PlayerPage {
  data: Player[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private readonly http = inject(HttpClient);

  // Convierte los filtros y la página a parámetros de consulta HTTP.
  list(filters: Partial<PlayerFilters>, page = 1, limit = 10) {
    let params = new HttpParams().set('page', page).set('limit', limit);
    for (const [key, value] of Object.entries(filters)) {
      if (value) params = params.set(key, value);
    }
    return this.http.get<PlayerPage>(API_URL, { params });
  }

  // Recupera la ficha completa y las versiones históricas de un jugador.
  get(id: number) {
    return this.http.get<Player>(`${API_URL}/${id}`);
  }

  // Crea una ficha nueva y devuelve la ficha persistida.
  create(player: PlayerInput) {
    return this.http.post<Player>(API_URL, player);
  }

  // Envía la edición y la versión de año indicada por el formulario.
  update(id: number, player: PlayerInput) {
    return this.http.put<Player>(`${API_URL}/${id}`, player);
  }

  // Pide al backend puntos históricos y su resumen para una habilidad.
  timeline(id: number, skill: SkillKey) {
    return this.http.get<{
      skill: SkillKey;
      points: { year: number; value: number }[];
      insight: string;
    }>(`${API_URL}/${id}/timeline/${skill}`);
  }

  // Solicita el archivo CSV como Blob para que el navegador lo descargue.
  exportCsv(filters: Partial<PlayerFilters>) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params = params.set(key, value);
    }
    return this.http.get(`${API_URL}/export`, {
      params,
      responseType: 'blob',
    });
  }

  // Sube un CSV desde el navegador y recibe el número de filas insertadas.
  import(file: File) {
    // FormData permite enviar el archivo como multipart/form-data.
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ imported: number }>(`${API_URL}/import`, formData);
  }
}
