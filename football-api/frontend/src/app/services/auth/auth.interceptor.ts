import { HttpInterceptorFn } from '@angular/common/http';

// Adjunta el token solo a llamadas de jugadores, que son las rutas protegidas.
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = localStorage.getItem('token');
  if (!token || !request.url.startsWith('http://localhost:3000/api/players')) {
    return next(request);
  }
  return next(
    request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }),
  );
};
