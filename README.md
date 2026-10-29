# 🎓 App de Estudio Emile (PWA)

Una **Progressive Web App (PWA)** completa, moderna y optimizada para dispositivos móviles y escritorio, diseñada para funcionar **100% offline** sin depender de conexión a internet ni tiendas de aplicaciones (Play Store / App Store).

---

## 🚀 Funcionalidades Integradas

1. **⏱️ Temporizador Pomodoro**:
   - Modos: Concentración (25 min), Descanso Corto (5 min) y Descanso Largo (15 min).
   - Anillo de progreso dinámico y campanada de finalización sintetizada con Web Audio API (cero dependencias de audio externas).
   - Vinculación de sesiones a materias específicas.

2. **🗂️ Tarjetas de Repaso (Flashcards)**:
   - Tarjetas 3D animadas con efecto de volteo al tacto.
   - Calificación de aprendizaje (Difícil, Bien, Fácil) para repaso espaciado.
   - Creación rápida de nuevas tarjetas agrupadas por materias.

3. **📝 Gestor de Tareas y Exámenes**:
   - Tareas con niveles de prioridad (Alta, Media, Baja).
   - Filtros: Todas, Pendientes y Completadas.
   - Marcado rápido interactivo y eliminación.

4. **📚 Organización por Materias**:
   - Administrador de asignaturas con íconos personalizados.

5. **💾 100% Offline y Respaldo Local**:
   - Almacenamiento seguro en el dispositivo mediante `localStorage`.
   - Exportación e importación de copias de seguridad en formato `.json`.

6. **📲 Instalación Nativa PWA**:
   - Botón automático `📲 Instalar App` en navegadores compatibles.
   - Service Worker con estrategia de caché (*Cache-First* con *stale-while-revalidate*).
   - Web App Manifest configurado para modo `standalone` a pantalla completa.

---

## 🛠️ Estructura del Proyecto

```text
APPESTUDIOEMILE/
├── index.html            # Interfaz y estructura principal
├── manifest.json         # Metadatos para instalación PWA
├── sw.js                 # Service Worker (Caché y soporte Offline)
├── server.js             # Servidor HTTP local ligero sin dependencias
├── package.json          # Configuración y comandos del proyecto
├── css/
│   └── styles.css        # Estilos modernos con soporte safe-area y Dark Mode
├── js/
│   ├── app.js            # Lógica PWA, navegación e instalación
│   ├── storage.js        # Almacenamiento local y datos iniciales
│   ├── pomodoro.js       # Lógica del temporizador y audio
│   ├── flashcards.js     # Interacción 3D y filtrado de tarjetas
│   └── tasks.js          # Control de tareas y prioridades
└── icons/
    ├── icon.svg          # Ícono vectorial escalable
    ├── icon-192.png      # Ícono PWA estándar (192x192)
    └── icon-512.png      # Ícono PWA splash (512x512)
```

---

## 💻 Cómo Ejecutar en Local

1. Abre la terminal en esta carpeta (`c:\Users\Asus\Documents\APPESTUDIOEMILE`).
2. Inicia el servidor:
   ```bash
   npm start
   ```
3. Abre en tu navegador:
   ```text
   http://localhost:8080
   ```

---

## 📲 Cómo Instalarla en tu Teléfono

### Opción A: Despliegue gratuito en la nube (Recomendada)
Para que el Service Worker se registre en producción, necesitas HTTPS:
- **GitHub Pages**: Sube los archivos a un repositorio de GitHub y activa GitHub Pages en *Settings > Pages*.
- **Vercel / Netlify**: Arrastra la carpeta o conecta tu repositorio para obtener una URL HTTPS instantánea.

Una vez abierta la URL en Chrome móvil:
1. Aparecerá el botón **"📲 Instalar App"** en la parte superior.
2. O pulsa el menú de tres puntos (⋮) en Chrome y elige **"Instalar aplicación"** / **"Agregar a la pantalla de inicio"**.

### Opción B: Probar en el móvil conectado a tu misma red Wi-Fi
1. Ejecuta `npm start`.
2. Averigua la IP local de tu PC (por ejemplo `192.168.1.50` usando `ipconfig`).
3. En Chrome de tu móvil escribe `http://192.168.1.50:8080`.
*(Nota: Para instalar Service Workers desde orígenes que no sean `localhost`, Chrome requiere HTTPS o habilitar la IP en `chrome://flags/#unsafely-treat-insecure-origin-as-secure`).*
