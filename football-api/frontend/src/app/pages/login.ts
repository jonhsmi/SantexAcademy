import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth/auth';

// Formulario compartido para iniciar sesión o alternar al registro.
@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <!-- El mismo panel cambia entre registro y login sin duplicar formularios. -->
    <section class="auth-page">
      <form class="auth-card" [formGroup]="form" (ngSubmit)="submit()">
        <p class="eyebrow">FIFA PLAYER MANAGER</p>
        <h1>{{ registering ? 'Crear cuenta' : 'Bienvenido' }}</h1>
        <p class="muted">Ingresa para administrar el catálogo de jugadores.</p>
        @if (registering) {
          <label>Nombre<input formControlName="name" autocomplete="name"></label>
        }
        <label>Correo electrónico
          <input formControlName="email" type="email" autocomplete="email">
        </label>
        <label>Contraseña
          <input formControlName="password" type="password" autocomplete="current-password">
        </label>
        @if (error) { <p class="error" role="alert">{{ error }}</p> }
        <button class="button button-primary full-width" [disabled]="form.invalid || loading">
          {{ loading ? 'Procesando…' : registering ? 'Crear cuenta' : 'Iniciar sesión' }}
        </button>
        <button class="switch-link" type="button" (click)="toggleMode()">
          {{ registering ? 'Ya tengo una cuenta' : 'Crear una cuenta nueva' }}
        </button>
      </form>
    </section>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  registering = false;
  loading = false;
  error = '';

  readonly form = this.fb.nonNullable.group({
    name: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  // Agrega/quita la validación del nombre según el modo seleccionado.
  toggleMode() {
    this.registering = !this.registering;
    this.error = '';
    const name = this.form.controls.name;
    if (this.registering) {
      name.addValidators([Validators.required, Validators.minLength(2)]);
    } else {
      name.clearValidators();
      name.setValue('');
    }
    name.updateValueAndValidity();
  }

  // Envía el formulario válido y muestra errores devueltos por la API.
  submit() {
    if (this.form.invalid || this.loading) return;
    this.loading = true;
    this.error = '';
    const { name, email, password } = this.form.getRawValue();
    const request = this.registering
      ? this.auth.register(name, email, password)
      : this.auth.login(email, password);
    request.subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: (error: { error?: { message?: string } }) => {
        this.error = error.error?.message || 'No se pudo completar el acceso';
        this.loading = false;
      },
    });
  }
}
