// Controlador de Tareas y Exámenes
class TasksController {
  constructor() {
    this.dom = {
      taskList: document.getElementById('task-list-items'),
      taskForm: document.getElementById('form-add-task'),
      taskInput: document.getElementById('input-task-title'),
      subjectSelect: document.getElementById('task-subject-select'),
      prioritySelect: document.getElementById('task-priority-select'),
      filterButtons: document.querySelectorAll('.task-filter-btn')
    };

    this.currentFilter = 'all'; // all, pending, completed
    this.init();
  }

  init() {
    this.populateSubjects();
    this.attachEvents();
    this.render();
  }

  populateSubjects() {
    if (!this.dom.subjectSelect) return;
    const subjects = window.appStorage.getSubjects();
    this.dom.subjectSelect.innerHTML = subjects.map(s =>
      `<option value="${s.id}">${s.icon} ${s.name}</option>`
    ).join('');
  }

  attachEvents() {
    if (this.dom.taskForm) {
      this.dom.taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = this.dom.taskInput.value.trim();
        const subjectId = this.dom.subjectSelect.value;
        const priority = this.dom.prioritySelect ? this.dom.prioritySelect.value : 'medium';
        const today = new Date().toISOString().split('T')[0];

        if (title) {
          window.appStorage.addTask(title, subjectId, today, priority);
          this.dom.taskInput.value = '';
          this.render();
          if (window.appInstance) window.appInstance.renderDashboard();
        }
      });
    }

    if (this.dom.filterButtons) {
      this.dom.filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.dom.filterButtons.forEach(b => b.classList.remove('active'));
          e.currentTarget.classList.add('active');
          this.currentFilter = e.currentTarget.dataset.filter;
          this.render();
        });
      });
    }
  }

  render() {
    if (!this.dom.taskList) return;
    let tasks = window.appStorage.getTasks();
    const subjects = window.appStorage.getSubjects();

    if (this.currentFilter === 'pending') {
      tasks = tasks.filter(t => !t.completed);
    } else if (this.currentFilter === 'completed') {
      tasks = tasks.filter(t => t.completed);
    }

    if (tasks.length === 0) {
      this.dom.taskList.innerHTML = `
        <div style="text-align: center; padding: 32px 16px; color: var(--text-sub);">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">✨</div>
          <p>No tienes tareas ${this.currentFilter === 'completed' ? 'completadas' : 'pendientes'}.</p>
        </div>
      `;
      return;
    }

    const priorityColors = {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10b981'
    };

    const priorityLabels = {
      high: 'Alta',
      medium: 'Media',
      low: 'Baja'
    };

    this.dom.taskList.innerHTML = tasks.map(t => {
      const sub = subjects.find(s => s.id === t.subjectId);
      const subName = sub ? `${sub.icon} ${sub.name}` : 'General';
      const pColor = priorityColors[t.priority] || '#f59e0b';
      const pLabel = priorityLabels[t.priority] || 'Media';

      return `
        <div class="task-item ${t.completed ? 'done' : ''}" data-id="${t.id}">
          <div class="task-left">
            <button class="task-checkbox" data-action="toggle" title="Marcar como completada">
              ${t.completed ? '✓' : ''}
            </button>
            <div>
              <div class="task-title">${this.escapeHtml(t.title)}</div>
              <div class="task-meta">
                <span>${subName}</span>
                <span>•</span>
                <span style="color: ${pColor}; font-weight: 600;">Prioridad ${pLabel}</span>
              </div>
            </div>
          </div>
          <button class="btn-del" data-action="delete" title="Eliminar tarea">🗑️</button>
        </div>
      `;
    }).join('');

    // Event delegation para interactuar con las tareas
    this.dom.taskList.querySelectorAll('.task-item').forEach(el => {
      const id = el.dataset.id;
      el.querySelector('[data-action="toggle"]').addEventListener('click', () => {
        window.appStorage.toggleTask(id);
        this.render();
        if (window.appInstance) window.appInstance.renderDashboard();
      });

      el.querySelector('[data-action="delete"]').addEventListener('click', () => {
        window.appStorage.deleteTask(id);
        this.render();
        if (window.appInstance) window.appInstance.renderDashboard();
      });
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
