import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  Player,
  PlayerInput,
  PlayerService,
  SkillKey,
} from '../services/player/player';

// Carga un jugador, edita sus datos y dibuja estadísticas e historial en SVG.
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <!-- Perfil, habilidades actuales, edición y evolución histórica. -->
    @if (player) {
      <section class="page detail-page">
        <a routerLink="/" class="back-link">← Volver al catálogo</a>
        <header class="player-banner">
          <div class="avatar">{{ player.longName.charAt(0) }}</div>
          <div class="player-title">
            <p class="eyebrow">{{ player.nationalityName || 'Jugador FIFA' }}</p>
            <h1>{{ player.longName }}</h1>
            <p>{{ player.clubName || 'Sin club' }} · {{ player.playerPositions }}</p>
          </div>
          <div class="overall">{{ player.overall }}<small>OVR</small></div>
        </header>

        <div class="detail-grid">
          <section class="panel">
            <h2>Habilidades actuales</h2>
            <svg viewBox="0 0 260 260" class="radar" role="img" aria-label="Gráfico de habilidades">
              @for (grid of radarGrid; track $index) { <polygon [attr.points]="grid" class="radar-grid"/> }
              <polygon [attr.points]="radarPolygon" class="radar-area"/>
              @for (skill of skills; track skill.key; let i = $index) {
                <text [attr.x]="labelPoint(i).x" [attr.y]="labelPoint(i).y" text-anchor="middle">{{ skill.label }}</text>
              }
            </svg>
            <div class="skill-chips">
              @for (skill of skills; track skill.key) {
                <span><b>{{ skillValue(skill.key) }}</b>{{ skill.label }}</span>
              }
            </div>
          </section>

          <section class="panel">
            <h2>Editar perfil</h2>
            <form class="edit-form" [formGroup]="form" (ngSubmit)="save()">
              <label>Nombre<input formControlName="name"></label>
              <label>Posición<input formControlName="position"></label>
              <label>Club<input formControlName="club"></label>
              <label>Nacionalidad<input formControlName="nationality"></label>
              <label>Género<select formControlName="gender"><option value="Male">Masculino</option><option value="Female">Femenino</option></select></label>
              <label>Rating<input type="number" formControlName="rating" min="1" max="99"></label>
              <label>Edad<input type="number" formControlName="age" min="1" max="100"></label>
              @for (skill of skills; track skill.key) {
                <label>{{ skill.label }}<input type="number" [formControlName]="skill.key" min="1" max="99"></label>
              }
              @if (message) { <p class="notice" role="status">{{ message }}</p> }
              <button class="button button-primary" [disabled]="form.invalid || saving">
                {{ saving ? 'Guardando…' : 'Guardar cambios' }}
              </button>
            </form>
          </section>

          <section class="panel timeline-panel">
            <div class="timeline-heading">
              <div><p class="eyebrow">HISTORIAL</p><h2>Evolución 2015–2023</h2></div>
              <select [value]="selectedSkill" (change)="changeSkill($event)" aria-label="Elegir habilidad">
                @for (skill of skills; track skill.key) { <option [value]="skill.key">{{ skill.label }}</option> }
              </select>
            </div>
            @if (timeline.points.length) {
              <svg viewBox="0 0 700 230" class="timeline" role="img" aria-label="Evolución anual de habilidad">
                <line x1="45" y1="190" x2="665" y2="190" class="chart-axis"/>
                <polyline [attr.points]="timelinePoints" class="chart-line"/>
                @for (point of timeline.points; track point.year) {
                  <circle [attr.cx]="timelineX(point.year)" [attr.cy]="timelineY(point.value)" r="5" class="chart-dot"/>
                  <text [attr.x]="timelineX(point.year)" y="214" text-anchor="middle">{{ point.year }}</text>
                }
              </svg>
              <div class="insight"><strong>Resumen de evolución</strong><p>{{ timeline.insight }}</p></div>
            } @else {
              <p class="muted">Todavía no hay suficientes ediciones para graficar esta habilidad.</p>
            }
          </section>
        </div>
      </section>
    } @else if (error) {
      <section class="page"><p class="error">{{ error }}</p><a routerLink="/">Volver</a></section>
    } @else {
      <div class="loading">Cargando jugador…</div>
    }
  `,
})
export class PlayerDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(PlayerService);
  private readonly fb = inject(FormBuilder);
  player?: Player;
  error = '';
  message = '';
  saving = false;
  selectedSkill: SkillKey = 'pace';
  timeline: { points: { year: number; value: number }[]; insight: string } = {
    points: [],
    insight: '',
  };
  readonly skills: { key: SkillKey; label: string }[] = [
    { key: 'pace', label: 'Ritmo' },
    { key: 'shooting', label: 'Tiro' },
    { key: 'passing', label: 'Pase' },
    { key: 'dribbling', label: 'Regate' },
    { key: 'defending', label: 'Defensa' },
    { key: 'physical', label: 'Físico' },
  ];
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    position: ['', Validators.required],
    club: [''],
    nationality: [''],
    gender: ['Male' as 'Male' | 'Female'],
    rating: [50, [Validators.required, Validators.min(1), Validators.max(99)]],
    age: [18, [Validators.required, Validators.min(1), Validators.max(100)]],
    year: [2023],
    pace: [50, [Validators.required, Validators.min(1), Validators.max(99)]],
    shooting: [50, [Validators.required, Validators.min(1), Validators.max(99)]],
    passing: [50, [Validators.required, Validators.min(1), Validators.max(99)]],
    dribbling: [50, [Validators.required, Validators.min(1), Validators.max(99)]],
    defending: [50, [Validators.required, Validators.min(1), Validators.max(99)]],
    physical: [50, [Validators.required, Validators.min(1), Validators.max(99)]],
  });

  // Lee el id de la URL; cuando llegan los datos inicializa el formulario y el gráfico.
  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id < 1) {
      this.error = 'El jugador solicitado no es válido';
      return;
    }
    this.service.get(id).subscribe({
      next: (player) => {
        this.player = player;
        // El último año disponible es el punto inicial del formulario de edición.
        const latest = [...(player.versions || [])].sort((a, b) => b.year - a.year)[0];
        this.form.patchValue({
          name: player.longName,
          position: player.playerPositions,
          club: player.clubName || '',
          nationality: player.nationalityName || '',
          gender: player.gender,
          rating: player.overall,
          age: player.age,
          year: latest?.year || 2023,
          pace: latest?.pace || player.overall,
          shooting: latest?.shooting || player.overall,
          passing: latest?.passing || player.overall,
          dribbling: latest?.dribbling || player.overall,
          defending: latest?.defending || player.overall,
          physical: latest?.physical || player.overall,
        });
        this.loadTimeline(id);
      },
      error: (error: { error?: { message?: string } }) => {
        this.error = error.error?.message || 'No se pudo cargar el jugador';
      },
    });
  }

  // Guarda cambios y vuelve a pedir la evolución para reflejar la edición más reciente.
  save() {
    if (!this.player || this.form.invalid || this.saving) return;
    this.saving = true;
    this.message = '';
    this.service.update(this.player.id, this.form.getRawValue() as PlayerInput).subscribe({
      next: (player) => {
        this.player = player;
        this.message = 'Cambios guardados correctamente';
        this.saving = false;
        this.loadTimeline(player.id);
      },
      error: (error: { error?: { message?: string } }) => {
        this.message = error.error?.message || 'No se pudieron guardar los cambios';
        this.saving = false;
      },
    });
  }

  // Usa la última versión conocida; si falta una habilidad, recurre al rating general.
  skillValue(skill: SkillKey) {
    const latest = [...(this.player?.versions || [])].sort((a, b) => b.year - a.year)[0];
    return latest?.[skill] ?? this.player?.overall ?? 50;
  }

  // Genera las cuatro líneas concéntricas de referencia del radar.
  get radarGrid() {
    return [0.25, 0.5, 0.75, 1].map((scale) => this.hexPoints(scale));
  }

  // Genera el polígono cuyos vértices representan las seis habilidades.
  get radarPolygon() {
    return this.hexPoints(1, true);
  }

  // Calcula dónde se dibuja la etiqueta de cada eje del radar.
  labelPoint(index: number) {
    const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
    return { x: 130 + Math.cos(angle) * 116, y: 130 + Math.sin(angle) * 116 };
  }

  private hexPoints(scale: number, values = false) {
    // Convierte seis valores en coordenadas de un hexágono para el radar SVG.
    return this.skills.map((skill, index) => {
      const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
      const radius = 88 * (values ? this.skillValue(skill.key) / 99 : scale);
      return `${130 + Math.cos(angle) * radius},${130 + Math.sin(angle) * radius}`;
    }).join(' ');
  }

  changeSkill(event: Event) {
    this.selectedSkill = (event.target as HTMLSelectElement).value as SkillKey;
    if (this.player) this.loadTimeline(this.player.id);
  }

  // Consulta de nuevo el endpoint cada vez que cambia la habilidad elegida.
  private loadTimeline(id: number) {
    this.service.timeline(id, this.selectedSkill).subscribe({
      next: (result) => (this.timeline = result),
      error: () => {
        this.timeline = { points: [], insight: '' };
      },
    });
  }

  get timelinePoints() {
    // El SVG recibe una cadena de pares x,y para trazar la línea.
    return this.timeline.points
      .map((point) => `${this.timelineX(point.year)},${this.timelineY(point.value)}`)
      .join(' ');
  }

  timelineX(year: number) {
    // Acomoda las ediciones 2015–2023 en el ancho disponible del gráfico.
    return 45 + ((year - 2015) / 8) * 620;
  }

  timelineY(value: number) {
    // Convierte una calificación de 1–99 a coordenadas verticales SVG.
    return 190 - ((value - 1) / 98) * 155;
  }
}
