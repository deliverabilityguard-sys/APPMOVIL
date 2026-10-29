// ==========================================================================
// GESTOR DE CALENDARIO, CLASES Y PENDIENTES DEL DÍA
// Persistencia en localStorage ('student_calendar_events')
// ==========================================================================

const CALENDAR_STORAGE_KEY = 'student_calendar_events';

class CalendarManager {
  constructor() {
    this.initDefaultEvents();
    this.attachModalEvents();
  }

  // Inicializar con eventos de ejemplo para hoy si la lista está vacía
  initDefaultEvents() {
    if (!localStorage.getItem(CALENDAR_STORAGE_KEY)) {
      const todayStr = new Date().toISOString().split('T')[0];
      const initialEvents = [
        {
          id: 'evt-1',
          title: 'Clase de Programación Web',
          subject: 'Programación Web',
          type: 'class', // 'class' (Clase), 'exam' (Examen), 'task' (Tarea)
          date: todayStr,
          time: '09:00',
          reminder: true,
          completed: false
        },
        {
          id: 'evt-2',
          title: 'Entrega de Proyecto PWA',
          subject: 'Programación Web',
          type: 'task',
          date: todayStr,
          time: '14:30',
          reminder: true,
          completed: false
        },
        {
          id: 'evt-3',
          title: 'Quiz de Vocabulario Técnico',
          subject: 'Inglés Avanzado',
          type: 'exam',
          date: todayStr,
          time: '16:00',
          reminder: false,
          completed: false
        }
      ];
      this.saveEvents(initialEvents);
    }
  }

  getEvents() {
    try {
      const raw = localStorage.getItem(CALENDAR_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  saveEvents(events) {
    localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(events));
  }

  getTodayEvents() {
    const todayStr = new Date().toISOString().split('T')[0];
    const all = this.getEvents();
    // Filtrar por la fecha de hoy y ordenar cronológicamente
    return all
      .filter(e => e.date === todayStr)
      .sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
  }

  addEvent(title, subject, type, date, time, reminder = true) {
    const events = this.getEvents();
    const newEvent = {
      id: 'evt-' + Date.now(),
      title: title.trim(),
      subject: subject || 'General',
      type: type || 'class',
      date: date || new Date().toISOString().split('T')[0],
      time: time || '10:00',
      reminder: Boolean(reminder),
      completed: false
    };
    events.push(newEvent);
    this.saveEvents(events);
    this.renderDashboardTodayEvents();
    return newEvent;
  }

  toggleEvent(id) {
    const events = this.getEvents();
    const item = events.find(e => e.id === id);
    if (item) {
      item.completed = !item.completed;
      this.saveEvents(events);
      this.renderDashboardTodayEvents();
      if (window.appInstance) window.appInstance.renderDashboard();
    }
    return item;
  }

  deleteEvent(id) {
    let events = this.getEvents().filter(e => e.id !== id);
    this.saveEvents(events);
    this.renderDashboardTodayEvents();
  }

  // Renderizar la tarjeta del Dashboard con las actividades de hoy
  renderDashboardTodayEvents() {
    const listContainer = document.getElementById('dashboard-today-events-list');
    const dateBadge = document.getElementById('dashboard-today-date-badge');
    if (!listContainer) return;

    // Fecha actual formateada en español
    const today = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'short' };
    if (dateBadge) {
      dateBadge.textContent = today.toLocaleDateString('es-ES', options);
    }

    const todayEvents = this.getTodayEvents();

    // 1. Estado vacío cuando no hay actividades hoy
    if (todayEvents.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 24px 16px; background: rgba(30, 41, 59, 0.4); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
          <div style="font-size: 2.2rem; margin-bottom: 6px;">✨</div>
          <div style="font-weight: 700; font-size: 0.98rem; color: #f8fafc; margin-bottom: 4px;">¡Día despejado!</div>
          <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 14px;">No tienes clases ni entregas programadas para hoy.</p>
          <button id="btn-empty-schedule-today" class="btn-primary" style="padding: 8px 18px; font-size: 0.82rem; margin: 0 auto;">
            + Programar actividad
          </button>
        </div>
      `;

      const emptyBtn = document.getElementById('btn-empty-schedule-today');
      if (emptyBtn) {
        emptyBtn.addEventListener('click', () => this.openScheduleModal());
      }
      return;
    }

    // Tipos de evento y estilos visuales
    const typeConfig = {
      class: { label: 'Clase', icon: '📚', color: '#38bdf8', bg: 'rgba(6, 182, 212, 0.12)', border: 'rgba(6, 182, 212, 0.3)' },
      exam: { label: 'Examen', icon: '🚨', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.12)', border: 'rgba(244, 63, 94, 0.3)' },
      task: { label: 'Tarea', icon: '📝', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' }
    };

    // 2. Renderizar lista de actividades
    listContainer.innerHTML = todayEvents.map(evt => {
      const cfg = typeConfig[evt.type] || typeConfig.class;
      return `
        <div class="today-event-item ${evt.completed ? 'completed' : ''}" data-event-id="${evt.id}" style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px 14px; margin-bottom: 8px; transition: all 0.2s ease;">
          <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
            <!-- Checkbox de completado -->
            <button class="event-checkbox" data-action="toggle" style="width: 22px; height: 22px; border-radius: 6px; border: 2px solid ${evt.completed ? 'var(--accent-emerald)' : 'var(--primary)'}; background: ${evt.completed ? 'var(--accent-emerald)' : 'transparent'}; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; font-size: 0.8rem; font-weight: 800;">
              ${evt.completed ? '✓' : ''}
            </button>

            <!-- Título y detalles -->
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                <span class="event-title" style="font-size: 0.92rem; font-weight: 600; color: ${evt.completed ? 'var(--text-muted)' : '#f8fafc'}; text-decoration: ${evt.completed ? 'line-through' : 'none'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${this.escapeHtml(evt.title)}
                </span>
                ${evt.reminder ? '<span title="Recordatorio activo" style="font-size: 0.85rem; color: #fbbf24;">🔔</span>' : ''}
              </div>
              
              <div style="display: flex; align-items: center; gap: 8px; font-size: 0.74rem; color: var(--text-secondary);">
                <span style="font-weight: 700; color: #a5b4fc;">⏰ ${evt.time}</span>
                <span>•</span>
                <span>${this.escapeHtml(evt.subject)}</span>
              </div>
            </div>
          </div>

          <!-- Chip distintivo del tipo de actividad -->
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 0.72rem; font-weight: 700; padding: 4px 10px; border-radius: 20px; color: ${cfg.color}; background: ${cfg.bg}; border: 1px solid ${cfg.border}; white-space: nowrap;">
              ${cfg.icon} ${cfg.label}
            </span>
            <button class="btn-del" data-action="delete" title="Eliminar actividad" style="padding: 4px; font-size: 0.9rem; color: var(--text-muted); cursor: pointer; background: transparent; border: none;">✕</button>
          </div>
        </div>
      `;
    }).join('');

    // Eventos de interactividad para tachar o eliminar
    listContainer.querySelectorAll('.today-event-item').forEach(el => {
      const id = el.dataset.eventId;
      el.querySelector('[data-action="toggle"]').addEventListener('click', () => {
        this.toggleEvent(id);
      });
      el.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteEvent(id);
      });
    });
  }

  // Modal para programar nueva actividad
  attachModalEvents() {
    const btnOpen = document.getElementById('btn-dashboard-add-event');
    const modal = document.getElementById('modal-schedule-event');
    const btnClose = document.getElementById('btn-close-schedule-modal');
    const form = document.getElementById('form-schedule-event');
    const selectSubject = document.getElementById('schedule-event-subject');

    if (btnOpen) {
      btnOpen.addEventListener('click', () => this.openScheduleModal());
    }

    if (btnClose && modal) {
      btnClose.addEventListener('click', () => modal.classList.remove('open'));
    }

    if (form && modal) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('schedule-event-title').value;
        const subject = document.getElementById('schedule-event-subject').value;
        const type = document.getElementById('schedule-event-type').value;
        const date = document.getElementById('schedule-event-date').value;
        const time = document.getElementById('schedule-event-time').value;
        const reminder = document.getElementById('schedule-event-reminder').checked;

        if (title && date && time) {
          this.addEvent(title, subject, type, date, time, reminder);
          modal.classList.remove('open');
          form.reset();
        }
      });
    }
  }

  openScheduleModal() {
    const modal = document.getElementById('modal-schedule-event');
    const selectSubject = document.getElementById('schedule-event-subject');
    const inputDate = document.getElementById('schedule-event-date');

    if (inputDate) {
      inputDate.value = new Date().toISOString().split('T')[0];
    }

    // Rellenar materias
    if (selectSubject && window.appStorage) {
      const subjects = window.appStorage.getSubjects();
      selectSubject.innerHTML = subjects.map(s => 
        `<option value="${s.name}">${s.icon} ${s.name}</option>`
      ).join('') + `<option value="General">📚 General</option>`;
    }

    if (modal) {
      modal.classList.add('open');
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}

// Inicialización global
window.calendarManager = new CalendarManager();
