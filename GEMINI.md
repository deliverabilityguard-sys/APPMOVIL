# Reglas y Memoria del Proyecto: App de Estudio Emile (PWA)

Este documento define las reglas de desarrollo y mantenimiento continuo para la aplicación móvil PWA.

---

## 🔄 Regla de Oro: Actualizaciones Automáticas en Móvil
Siempre que se realice una modificación en los archivos de la app (`index.html`, `css/styles.css`, o en la carpeta `js/`):

1. **Incrementar la versión de la caché en [`sw.js`](file:///c:/Users/Asus/Documents/APPESTUDIOEMILE/sw.js)**:
   - Cambiar `const CACHE_NAME = 'estudio-pwa-v1';` al siguiente número (`v2`, `v3`, `v4`, etc.).
   - Esto es obligatorio para que los navegadores de los teléfonos detecten la diferencia en segundo plano, descarguen la nueva versión y purguen la caché vieja automáticamente.

2. **Subir a GitHub**:
   - Cada cambio aprobado debe acompañarse de `git add .`, `git commit` descriptivo y `git push origin main` para que GitHub Pages despliegue la actualización automáticamente.

---

## 📱 Arquitectura y Estándares
- **Filosofía Offline-First**: La aplicación debe ser 100% funcional sin conexión a internet.
- **Persistencia de Datos**: Todas las materias, tareas, flashcards y estadísticas de estudio se almacenan en `localStorage` (gestionado en [`js/storage.js`](file:///c:/Users/Asus/Documents/APPESTUDIOEMILE/js/storage.js)). Las actualizaciones de código nunca deben alterar ni reiniciar los datos del usuario.
- **Diseño Mobile-First**:
  - Paleta con estética Dark Mode moderna (`#0b0f19`, glassmorphism, gradientes índigo/violeta).
  - Barra de navegación inferior fija adaptada a dispositivos móviles con soporte para `env(safe-area-inset-bottom)`.
  - Botón nativo de instalación PWA visible cuando el navegador emita `beforeinstallprompt`.
- **Cero dependencias externas no necesarias**: Todo debe compilarse o ejecutarse de forma estática pura para garantizar carga instantánea desde GitHub Pages.
