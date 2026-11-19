import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

// Inicia el componente raíz con router y servicios definidos en appConfig.
bootstrapApplication(App, appConfig);
