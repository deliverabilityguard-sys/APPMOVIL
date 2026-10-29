// ==========================================================================
// CONTROLADOR PRINCIPAL — SUPERVIVENCIA ESTUDIANTIL (PWA)
// ==========================================================================

class App {
  constructor() {
    this.deferredPrompt = null;
    this.currentTab = 'budget';
    this.init();
  }

  init() {
    this.setupPWA();
    this.setupLandingPage();
    this.setupNavigation();

    // Sincronizar controladores al cambiar de ventana o storage
    window.addEventListener('storage', () => {
      if (window.budgetManager) window.budgetManager.render();
      if (window.billsManager) window.billsManager.render();
    });

    // Leer hash inicial si existe
    const hash = window.location.hash.replace('#', '');
    if (hash && ['budget', 'chef', 'hacks', 'bills'].includes(hash)) {
      this.switchTab(hash);
    }
  }

  // Detección de Modo de Ejecución: PWA Instalada (Standalone) vs Navegador Web
  setupLandingPage() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const overlay = document.getElementById('landing-install-overlay');
    const btnInstall = document.getElementById('btn-landing-install');
    const btnSkip = document.getElementById('btn-landing-skip');
    const guideBox = document.getElementById('landing-install-guide');

    // 1. Si ya se ejecuta como app instalada (standalone), funcionamiento 100% normal
    if (isStandalone) {
      document.documentElement.classList.remove('show-landing');
      if (overlay) overlay.style.display = 'none';
      return;
    }

    // 2. Si no es standalone pero ya se seleccionó "Probar en la web" en esta sesión
    const skipped = sessionStorage.getItem('pwa_skip_landing');
    if (!skipped) {
      document.documentElement.classList.add('show-landing');
      if (overlay) overlay.style.display = 'flex';
    } else {
      document.documentElement.classList.remove('show-landing');
      if (overlay) overlay.style.display = 'none';
    }

    // 3. Botón principal: "📲 Instalar Aplicación"
    if (btnInstall) {
      btnInstall.addEventListener('click', async () => {
        if (this.deferredPrompt) {
          this.deferredPrompt.prompt();
          const { outcome } = await this.deferredPrompt.userChoice;
          console.log(`[PWA] Respuesta instalación: ${outcome}`);
          if (outcome === 'accepted') {
            this.deferredPrompt = null;
            this.hideLandingOverlay();
          }
        } else {
          // Mostrar instrucciones cuando no hay evento nativo disponible (Safari iOS / Desktop)
          if (guideBox) {
            const isVisible = guideBox.style.display === 'block';
            guideBox.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) {
              guideBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }
        }
      });
    }

    // 4. Botón secundario: "Probar en la web sin instalar"
    if (btnSkip) {
      btnSkip.addEventListener('click', () => {
        sessionStorage.setItem('pwa_skip_landing', 'true');
        this.hideLandingOverlay();
      });
    }
  }

  hideLandingOverlay() {
    const overlay = document.getElementById('landing-install-overlay');
    if (overlay) {
      overlay.classList.add('fade-out');
      setTimeout(() => {
        document.documentElement.classList.remove('show-landing');
        overlay.style.display = 'none';
      }, 350);
    }
  }

  // Configuración del Service Worker y Prompt de Instalación PWA
  setupPWA() {
    const installBtn = document.getElementById('btn-header-install');

    if ('serviceWorker' in navigator) {
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          console.log('[PWA] Nueva versión activada. Recargando aplicación...');
          window.location.reload();
        }
      });

      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((registration) => {
            console.log('[PWA] Service Worker registrado exitosamente:', registration.scope);
            registration.update();
          })
          .catch((error) => {
            console.error('[PWA] Error registrando Service Worker:', error);
          });
      });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      if (installBtn) {
        installBtn.style.display = 'inline-flex';
      }
      console.log('[PWA] Evento beforeinstallprompt capturado');
    });

    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (this.deferredPrompt) {
          this.deferredPrompt.prompt();
          const { outcome } = await this.deferredPrompt.userChoice;
          console.log(`[PWA] Respuesta instalación: ${outcome}`);
          this.deferredPrompt = null;
          installBtn.style.display = 'none';
        } else {
          alert('Para instalar esta app en tu pantalla de inicio:\n• En Safari (iPhone): Toca Compartir ⎋ y selecciona "Agregar a Inicio ➕".\n• En Chrome (Android): Toca ⋮ y selecciona "Instalar aplicación".');
        }
      });
    }

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App instalada con éxito');
      if (installBtn) installBtn.style.display = 'none';
      this.hideLandingOverlay();
    });

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone && installBtn) {
      installBtn.style.display = 'none';
    }
  }

  // Navegación fija inferior (Bottom Nav) con 4 pestañas
  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        if (tab) {
          this.switchTab(tab);
          if ('vibrate' in navigator) navigator.vibrate(15);
        }
      });
    });
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    window.location.hash = tabName;

    // Actualizar botones de navegación
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Mostrar/ocultar paneles
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `view-${tabName}`);
    });

    // Refrescar vistas al cambiar
    if (tabName === 'budget' && window.budgetManager) {
      window.budgetManager.render();
    } else if (tabName === 'bills' && window.billsManager) {
      window.billsManager.render();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', () => {
  window.appInstance = new App();
});
