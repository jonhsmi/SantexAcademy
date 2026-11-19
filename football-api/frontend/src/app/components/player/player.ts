import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Player, PlayerFilters, PlayerService } from '../../services/player/player';

// Coordina filtros, paginación, carga del catálogo e intercambio de archivos.
@Component({
  selector: 'app-player',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './player.html',
  styleUrl: './player.css',
})
export class PlayerComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PlayerService);
  readonly filters = this.fb.nonNullable.group({
    name: '',
    club: '',
    position: '',
    nationality: '',
    gender: '',
  });
  players: Player[] = [];
  page = 1;
  pages = 1;
  total = 0;
  loading = false;
  message = '';

  ngOnInit() {
    // Al entrar a la pantalla se carga la primera página sin filtros.
    this.load();
  }

  // Reinicia la paginación cuando cambian los filtros.
  search() {
    this.page = 1;
    this.load();
  }

  // Solicita una página distinta manteniendo los filtros actuales.
  go(page: number) {
    this.page = page;
    this.load();
  }

  // Actualiza la lista y los metadatos de paginación desde la API.
  load() {
    this.loading = true;
    this.service
      .list(this.filters.getRawValue() as PlayerFilters, this.page)
      .subscribe({
        // Actualiza datos y metadatos de paginación solo con respuesta correcta.
        next: (result) => {
          this.players = result.data;
          this.pages = result.pagination.pages;
          this.total = result.pagination.total;
          this.message = '';
          this.loading = false;
        },
        error: (error: { error?: { message?: string } }) => {
          this.message =
            error.error?.message || 'No se pudo cargar el listado de jugadores';
          this.loading = false;
        },
      });
  }

  // Descarga el archivo correspondiente a los filtros que están en pantalla.
  exportCsv() {
    this.service
      .exportCsv(this.filters.getRawValue() as PlayerFilters)
      .subscribe({
        next: (blob) => {
          // El navegador descarga el Blob y luego se libera su URL temporal.
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'jugadores.csv';
          link.click();
          URL.revokeObjectURL(url);
        },
        error: () => (this.message = 'No se pudo exportar el archivo CSV'),
      });
  }

  // Envía el archivo seleccionado y refresca el catálogo al terminar.
  importCsv(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.service.import(file).subscribe({
      next: (result) => {
        this.message = `Importación completa: ${result.imported} jugadores`;
        input.value = '';
        this.load();
      },
      error: (error: { error?: { message?: string } }) => {
        this.message = error.error?.message || 'No se pudo importar el CSV';
        input.value = '';
      },
    });
  }
}
