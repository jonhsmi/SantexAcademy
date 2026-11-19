import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

const API_URL = 'http://localhost:3000/api';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

// Mantiene usuario/token en el navegador y ofrece operaciones de acceso a la UI.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly user = signal<AuthUser | null>(this.readUser());

  // La presencia del token habilita la navegación; el backend valida su firma.
  isLoggedIn() {
    return !!localStorage.getItem('token');
  }

  token() {
    return localStorage.getItem('token');
  }

  // Almacena la sesión que devuelve la API después de verificar las credenciales.
  login(email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${API_URL}/auth/login`, { email, password })
      .pipe(tap((result) => this.save(result)));
  }

  // El registro crea la cuenta y devuelve la misma forma de sesión que el login.
  register(name: string, email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${API_URL}/auth/register`, {
        name,
        email,
        password,
      })
      .pipe(tap((result) => this.save(result)));
  }

  // Elimina la sesión local; no hay una sesión de servidor que revocar.
  logout() {
    // Elimina ambos datos locales y vuelve al formulario público de acceso.
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.user.set(null);
    void this.router.navigateByUrl('/login');
  }

  // Centraliza la persistencia para mantener en sincronía usuario y token.
  private save(result: AuthResponse) {
    localStorage.setItem('token', result.token);
    localStorage.setItem('user', JSON.stringify(result.user));
    this.user.set(result.user);
  }

  private readUser(): AuthUser | null {
    // Un valor corrupto en localStorage no debe impedir que cargue la aplicación.
    try {
      return JSON.parse(localStorage.getItem('user') || 'null') as AuthUser | null;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  }
}
