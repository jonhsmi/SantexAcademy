import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './pages/login';
import { NewPlayerComponent } from './pages/new-player';
import { PlayerDetailComponent } from './pages/player-detail';
import { PlayerComponent } from './components/player/player';

// Asocia URLs con pantallas; el catálogo y los perfiles requieren sesión.
export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', component: PlayerComponent, canActivate: [authGuard] },
  {
    path: 'players/new',
    component: NewPlayerComponent,
    canActivate: [authGuard],
  },
  {
    path: 'players/:id',
    component: PlayerDetailComponent,
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '' },
];
