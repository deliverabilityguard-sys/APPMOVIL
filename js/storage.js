// Manejador de Almacenamiento Local (100% Offline)
const STORAGE_KEYS = {
  SUBJECTS: 'estudio_subjects_v1',
  FLASHCARDS: 'estudio_flashcards_v1',
  TASKS: 'estudio_tasks_v1',
  SESSIONS: 'estudio_sessions_v1',
  SETTINGS: 'estudio_settings_v1'
};

const DEFAULT_SUBJECTS = [
  { id: 'sub-1', name: 'Programación Web', color: '#6366f1', icon: '💻' },
  { id: 'sub-2', name: 'Inglés Avanzado', color: '#10b981', icon: '🇬🇧' },
  { id: 'sub-3', name: 'Matemáticas Discretas', color: '#f59e0b', icon: '📐' },
  { id: 'sub-4', name: 'Historia y Cultura', color: '#ec4899', icon: '🏛️' }
];

const DEFAULT_FLASHCARDS = [];

const DEFAULT_TASKS = [
  {
    id: 'task-1',
    title: 'Repasar conceptos clave de PWA',
    subjectId: 'sub-1',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'high',
    completed: false
  },
  {
    id: 'task-2',
    title: 'Completar 2 ciclos Pomodoro',
    subjectId: 'sub-2',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium',
    completed: false
  },
  {
    id: 'task-3',
    title: 'Diseñar interfaz responsiva móvil',
    subjectId: 'sub-1',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'low',
    completed: true
  }
];

class StorageManager {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.SUBJECTS)) {
      this.save(STORAGE_KEYS.SUBJECTS, DEFAULT_SUBJECTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.FLASHCARDS)) {
      this.save(STORAGE_KEYS.FLASHCARDS, DEFAULT_FLASHCARDS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.TASKS)) {
      this.save(STORAGE_KEYS.TASKS, DEFAULT_TASKS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SESSIONS)) {
      this.save(STORAGE_KEYS.SESSIONS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      this.save(STORAGE_KEYS.SETTINGS, {
        pomodoroWork: 25,
        pomodoroShortBreak: 5,
        pomodoroLongBreak: 15,
        soundEnabled: true
      });
    }
  }

  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error(`Error al leer ${key}:`, e);
      return [];
    }
  }

  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error(`Error al guardar en ${key}:`, e);
      return false;
    }
  }

  // Materias
  getSubjects() {
    return this.get(STORAGE_KEYS.SUBJECTS);
  }

  addSubject(name, color = '#6366f1', icon = '📚') {
    const list = this.getSubjects();
    const item = { id: 'sub-' + Date.now(), name, color, icon };
    list.push(item);
    this.save(STORAGE_KEYS.SUBJECTS, list);
    return item;
  }

  deleteSubject(id) {
    let list = this.getSubjects().filter(s => s.id !== id);
    this.save(STORAGE_KEYS.SUBJECTS, list);
  }

  // Flashcards
  getFlashcards() {
    return this.get(STORAGE_KEYS.FLASHCARDS);
  }

  addFlashcard(subjectId, question, answer) {
    const list = this.getFlashcards();
    const item = {
      id: 'fc-' + Date.now(),
      subjectId,
      question,
      answer,
      difficulty: 'new',
      reviews: 0
    };
    list.push(item);
    this.save(STORAGE_KEYS.FLASHCARDS, list);
    return item;
  }

  updateFlashcard(id, updates) {
    let list = this.getFlashcards();
    const idx = list.findIndex(c => c.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      this.save(STORAGE_KEYS.FLASHCARDS, list);
    }
  }

  deleteFlashcard(id) {
    let list = this.getFlashcards().filter(c => c.id !== id);
    this.save(STORAGE_KEYS.FLASHCARDS, list);
  }

  // Tareas
  getTasks() {
    return this.get(STORAGE_KEYS.TASKS);
  }

  addTask(title, subjectId, dueDate, priority = 'medium') {
    const list = this.getTasks();
    const item = {
      id: 'task-' + Date.now(),
      title,
      subjectId,
      dueDate,
      priority,
      completed: false
    };
    list.unshift(item);
    this.save(STORAGE_KEYS.TASKS, list);
    return item;
  }

  toggleTask(id) {
    let list = this.getTasks();
    const task = list.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      this.save(STORAGE_KEYS.TASKS, list);
    }
    return task;
  }

  deleteTask(id) {
    let list = this.getTasks().filter(t => t.id !== id);
    this.save(STORAGE_KEYS.TASKS, list);
  }

  // Pomodoro Sesiones
  getSessions() {
    return this.get(STORAGE_KEYS.SESSIONS);
  }

  logSession(subjectId, durationMinutes, mode = 'focus') {
    const list = this.getSessions();
    const session = {
      id: 'ses-' + Date.now(),
      subjectId,
      durationMinutes,
      mode,
      timestamp: new Date().toISOString()
    };
    list.unshift(session);
    this.save(STORAGE_KEYS.SESSIONS, list);
    return session;
  }

  // Estadísticas del día
  getTodayStats() {
    const sessions = this.getSessions();
    const todayStr = new Date().toISOString().split('T')[0];
    
    const todaySessions = sessions.filter(s => s.timestamp.startsWith(todayStr) && s.mode === 'focus');
    const totalMinutes = todaySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    const tasks = this.getTasks();
    const completedTasksToday = tasks.filter(t => t.completed).length;
    const cards = this.getFlashcards();
    const reviewedCount = cards.reduce((acc, c) => acc + (c.reviews || 0), 0);

    return {
      minutesStudied: totalMinutes,
      pomodorosCount: todaySessions.length,
      tasksCompleted: completedTasksToday,
      cardsReviewed: reviewedCount
    };
  }

  // Respaldo de Datos (Exportar / Importar)
  exportJSON() {
    const data = {
      subjects: this.getSubjects(),
      flashcards: this.getFlashcards(),
      tasks: this.getTasks(),
      sessions: this.getSessions(),
      settings: this.get(STORAGE_KEYS.SETTINGS),
      version: '1.0',
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }

  importJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.subjects) this.save(STORAGE_KEYS.SUBJECTS, data.subjects);
      if (data.flashcards) this.save(STORAGE_KEYS.FLASHCARDS, data.flashcards);
      if (data.tasks) this.save(STORAGE_KEYS.TASKS, data.tasks);
      if (data.sessions) this.save(STORAGE_KEYS.SESSIONS, data.sessions);
      if (data.settings) this.save(STORAGE_KEYS.SETTINGS, data.settings);
      return true;
    } catch (e) {
      console.error('Error importando datos:', e);
      return false;
    }
  }
}

window.appStorage = new StorageManager();
