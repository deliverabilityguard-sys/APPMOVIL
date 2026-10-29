// Controlador Principal de la Aplicación y Soporte PWA
class App {
  constructor() {
    this.deferredPrompt = null;
    this.currentTab = 'dashboard';
    this.init();
  }

  init() {
    this.setupPWA();
    this.setupNavigation();
    this.renderDashboard();
    this.setupSettingsView();

    // Sincronizar controladores al cambiar el almacenamiento
    window.addEventListener('storage', () => {
      this.renderDashboard();
    });

    // Leer hash inicial si existe (#pomodoro, #flashcards, #tasks, #notes)
    const hash = window.location.hash.replace('#', '');
    if (hash && ['dashboard', 'pomodoro', 'flashcards', 'tasks', 'notes', 'settings'].includes(hash)) {
      this.switchTab(hash);
    }
  }

  // Configuración del Service Worker y Prompt de Instalación PWA
  setupPWA() {
    const installBtn = document.getElementById('btn-install-pwa');

    // Registro del Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((registration) => {
            console.log('[PWA] Service Worker registrado exitosamente en el scope:', registration.scope);
          })
          .catch((error) => {
            console.error('[PWA] Error registrando Service Worker:', error);
          });
      });
    }

    // Captura del evento de instalación nativo del navegador
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      if (installBtn) {
        installBtn.classList.add('visible');
      }
      console.log('[PWA] Aplicación lista para instalar');
    });

    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!this.deferredPrompt) {
          alert('Para instalar esta app:\n• En Chrome móvil: Abre el menú ⋮ y selecciona "Instalar app" o "Agregar a pantalla principal".\n• En Safari (iOS): Toca Compartir y "Agregar al inicio".');
          return;
        }
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log(`[PWA] Respuesta de instalación: ${outcome}`);
        this.deferredPrompt = null;
        installBtn.classList.remove('visible');
      });
    }

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App de Estudio instalada exitosamente');
      if (installBtn) installBtn.classList.remove('visible');
    });

    // Detectar si ya se está ejecutando como PWA instalada (standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone && installBtn) {
      installBtn.style.display = 'none';
    }
  }

  // Navegación por pestañas (Mobile App Tabs)
  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
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

    // Refrescar vistas específicas
    if (tabName === 'dashboard') {
      this.renderDashboard();
    } else if (tabName === 'flashcards' && window.flashcardsCtrl) {
      window.flashcardsCtrl.loadCards();
      window.flashcardsCtrl.renderDeckChips();
    } else if (tabName === 'tasks' && window.tasksCtrl) {
      window.tasksCtrl.render();
    } else if (tabName === 'notes' && window.notesCtrl) {
      window.notesCtrl.renderHistory();
    }
  }

  // Actualizar estadísticas del Dashboard
  renderDashboard() {
    const stats = window.appStorage.getTodayStats();
    
    const minutesEl = document.getElementById('stat-minutes');
    const pomodorosEl = document.getElementById('stat-pomodoros');
    const tasksEl = document.getElementById('stat-tasks');
    const cardsEl = document.getElementById('stat-cards');

    if (minutesEl) minutesEl.textContent = stats.minutesStudied;
    if (pomodorosEl) pomodorosEl.textContent = stats.pomodorosCount;
    if (tasksEl) tasksEl.textContent = stats.tasksCompleted;
    if (cardsEl) cardsEl.textContent = stats.cardsReviewed;

    // Resumen rápido de tareas pendientes
    const recentTasksList = document.getElementById('dashboard-pending-tasks');
    if (recentTasksList) {
      const pendingTasks = window.appStorage.getTasks().filter(t => !t.completed).slice(0, 4);
      if (pendingTasks.length === 0) {
        recentTasksList.innerHTML = `<p style="color: var(--text-sub); font-size: 0.9rem; margin-top: 8px;">¡Todo al día! No tienes tareas pendientes. 🚀</p>`;
      } else {
        recentTasksList.innerHTML = pendingTasks.map(t => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0; border-bottom: 1px solid var(--border-color);">
            <span style="font-size: 0.92rem;">${t.title}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${t.dueDate || 'Hoy'}</span>
          </div>
        `).join('');
      }
    }
  }

  // Ajustes y gestión de materias
  setupSettingsView() {
    const exportBtn = document.getElementById('btn-export-data');
    const importInput = document.getElementById('input-import-data');
    const subjectsContainer = document.getElementById('settings-subjects-list');
    const formAddSubject = document.getElementById('form-add-subject');

    const renderSubjects = () => {
      if (!subjectsContainer) return;
      const subjects = window.appStorage.getSubjects();
      subjectsContainer.innerHTML = subjects.map(s => `
        <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface); padding: 10px 14px; border-radius: var(--radius-md); margin-bottom: 8px; border: 1px solid var(--border-color);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.3rem;">${s.icon}</span>
            <span style="font-weight: 600;">${s.name}</span>
          </div>
          <button style="background: transparent; border: none; color: var(--accent-danger); cursor: pointer;" data-del-subject="${s.id}">✕</button>
        </div>
      `).join('');

      subjectsContainer.querySelectorAll('[data-del-subject]').forEach(b => {
        b.addEventListener('click', (e) => {
          const id = e.currentTarget.dataset.delSubject;
          window.appStorage.deleteSubject(id);
          renderSubjects();
          if (window.pomodoroTimer) window.pomodoroTimer.populateSubjects();
          if (window.flashcardsCtrl) window.flashcardsCtrl.renderDeckChips();
          if (window.tasksCtrl) window.tasksCtrl.populateSubjects();
        });
      });
    };

    renderSubjects();

    if (formAddSubject) {
      formAddSubject.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('new-sub-name').value.trim();
        const icon = document.getElementById('new-sub-icon').value.trim() || '📚';
        if (name) {
          window.appStorage.addSubject(name, '#6366f1', icon);
          document.getElementById('new-sub-name').value = '';
          renderSubjects();
          if (window.pomodoroTimer) window.pomodoroTimer.populateSubjects();
          if (window.flashcardsCtrl) window.flashcardsCtrl.renderDeckChips();
          if (window.tasksCtrl) window.tasksCtrl.populateSubjects();
        }
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const json = window.appStorage.exportJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `respaldo-estudio-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const success = window.appStorage.importJSON(event.target.result);
            if (success) {
              alert('✅ Datos importados correctamente.');
              window.location.reload();
            } else {
              alert('❌ El archivo seleccionado no contiene un formato de respaldo válido.');
            }
          };
          reader.readAsText(file);
        }
      });
    }
  }
}

// Inicialización de la App cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.appInstance = new App();
  window.pomodoroTimer = new PomodoroTimer();
  window.flashcardsCtrl = new FlashcardsController();
  window.tasksCtrl = new TasksController();
  window.notesCtrl = new SmartNotesController();
});
