import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PlayerInput, PlayerService } from '../services/player/player';

// Formulario de alta: las reglas del navegador complementan la validación del backend.
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <!-- Datos generales y habilidades del jugador que se enviarán al backend. -->
    <section class="page form-page">
      <a routerLink="/" class="back-link">← Volver a jugadores</a>
      <div class="page-heading">
        <div><p class="eyebrow">NUEVO REGISTRO</p><h1>Crear jugador</h1></div>
      </div>
      <form class="panel player-form" [formGroup]="form" (ngSubmit)="save()">
        <div class="form-grid">
          <label>Nombre<input formControlName="name"></label>
          <label>Posición<input formControlName="position" placeholder="Ej. ST, CM"></label>
          <label>Club<input formControlName="club"></label>
          <label>Nacionalidad<input formControlName="nationality"></label>
          <label>Género
            <select formControlName="gender">
              <option value="Male">Masculino</option><option value="Female">Femenino</option>
            </select>
          </label>
          <label>Edición FIFA
            <select formControlName="year">
              @for (year of years; track year) { <option [ngValue]="year">{{ year }}</option> }
            </select>
          </label>
          <label>Rating<input type="number" formControlName="rating" min="1" max="99"></label>
          <label>Edad<input type="number" formControlName="age" min="1" max="100"></label>
          @for (skill of skills; track skill.key) {
            <label>{{ skill.label }}<input type="number" [formControlName]="skill.key" min="1" max="99"></label>
          }
        </div>
        @if (error) { <p class="error" role="alert">{{ error }}</p> }
        <div class="form-actions">
          <a class="button button-outline" routerLink="/">Cancelar</a>
          <button class="button button-primary" [disabled]="form.invalid || saving">
            {{ saving ? 'Guardando…' : 'Crear jugador' }}
          </button>
        </div>
      </form>
    </section>
  `,
})
export class NewPlayerComponent {
  private readonly fb = inject(FormBuilder);
  private readonly players = inject(PlayerService);
  private readonly router = inject(Router);
  readonly years = Array.from({ length: 9 }, (_, i) => 2015 + i);
  readonly skills = [
    { key: 'pace', label: 'Ritmo' },
    { key: 'shooting', label: 'Tiro' },
    { key: 'passing', label: 'Pase' },
    { key: 'dribbling', label: 'Regate' },
    { key: 'defending', label: 'Defensa' },
    { key: 'physical', label: 'Físico' },
  ] as const;
  saving = false;
  error = '';
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
    position: ['', [Validators.required, Validators.maxLength(255)]],
    club: [''],
    nationality: [''],
    gender: ['Male' as 'Male' | 'Female', Validators.required],
    year: [2023, [Validators.required, Validators.min(2015), Validators.max(2023)]],
    rating: [50, [Validators.required, Validators.min(1), Validators.max(99)]],
    age: [18, [Validators.required, Validators.min(1), Validators.max(100)]],
    pace: [50, [Validators.required, Validators.min(1), Validators.max(99)]],
    shooting: [50, [Validators.required, Validators.min(1), Validators.max(99)]],
    passing: [50, [Validators.required, Validators.min(1), Validators.max(99)]],
    dribbling: [50, [Validators.required, Validators.min(1), Validators.max(99)]],
    defending: [50, [Validators.required, Validators.min(1), Validators.max(99)]],
    physical: [50, [Validators.required, Validators.min(1), Validators.max(99)]],
  });

  // Evita doble envío, crea la ficha y navega al perfil creado.
  save() {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.players.create(this.form.getRawValue() as PlayerInput).subscribe({
      next: (player) => void this.router.navigate(['/players', player.id]),
      error: (error: { error?: { message?: string } }) => {
        this.error = error.error?.message || 'No se pudo crear el jugador';
        this.saving = false;
      },
    });
  }
}
