// Controlador del Temporizador Pomodoro
class PomodoroTimer {
  constructor() {
    this.modes = {
      focus: 25 * 60,
      shortBreak: 5 * 60,
      longBreak: 15 * 60
    };
    this.currentMode = 'focus';
    this.timeLeft = this.modes.focus;
    this.totalDuration = this.modes.focus;
    this.isRunning = false;
    this.timerId = null;
    this.selectedSubjectId = 'sub-1';

    this.audioCtx = null;
    this.dom = {
      display: document.getElementById('timer-time'),
      progressRing: document.getElementById('timer-progress'),
      playBtn: document.getElementById('btn-timer-play'),
      resetBtn: document.getElementById('btn-timer-reset'),
      skipBtn: document.getElementById('btn-timer-skip'),
      modeButtons: document.querySelectorAll('.timer-mode-btn'),
      subjectSelect: document.getElementById('timer-subject-select')
    };

    this.init();
  }

  init() {
    this.updateDisplay();
    this.attachEvents();
    this.populateSubjects();
  }

  attachEvents() {
    if (this.dom.playBtn) {
      this.dom.playBtn.addEventListener('click', () => this.toggle());
    }
    if (this.dom.resetBtn) {
      this.dom.resetBtn.addEventListener('click', () => this.reset());
    }
    if (this.dom.skipBtn) {
      this.dom.skipBtn.addEventListener('click', () => this.skip());
    }

    this.dom.modeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.mode;
        this.setMode(mode);
      });
    });

    if (this.dom.subjectSelect) {
      this.dom.subjectSelect.addEventListener('change', (e) => {
        this.selectedSubjectId = e.target.value;
      });
    }
  }

  populateSubjects() {
    if (!this.dom.subjectSelect) return;
    const subjects = window.appStorage.getSubjects();
    this.dom.subjectSelect.innerHTML = subjects.map(s => 
      `<option value="${s.id}">${s.icon} ${s.name}</option>`
    ).join('');
    if (subjects.length > 0) {
      this.selectedSubjectId = subjects[0].id;
    }
  }

  setMode(mode) {
    if (!this.modes[mode]) return;
    this.pause();
    this.currentMode = mode;
    this.timeLeft = this.modes[mode];
    this.totalDuration = this.modes[mode];

    this.dom.modeButtons.forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });

    this.updateDisplay();
  }

  toggle() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.dom.playBtn.innerHTML = '⏸';
    this.dom.playBtn.setAttribute('title', 'Pausar');

    // Inicializar AudioContext en interacción del usuario
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.audioCtx = new AudioContext();
    }

    this.timerId = setInterval(() => {
      this.tick();
    }, 1000);
  }

  pause() {
    this.isRunning = false;
    clearInterval(this.timerId);
    this.dom.playBtn.innerHTML = '▶';
    this.dom.playBtn.setAttribute('title', 'Iniciar');
  }

  reset() {
    this.pause();
    this.timeLeft = this.modes[this.currentMode];
    this.updateDisplay();
  }

  skip() {
    this.pause();
    if (this.currentMode === 'focus') {
      this.setMode('shortBreak');
    } else {
      this.setMode('focus');
    }
  }

  tick() {
    if (this.timeLeft > 0) {
      this.timeLeft--;
      this.updateDisplay();
    } else {
      this.completeSession();
    }
  }

  completeSession() {
    this.pause();
    this.playChime();

    if (this.currentMode === 'focus') {
      const durationMin = Math.round(this.modes.focus / 60);
      window.appStorage.logSession(this.selectedSubjectId, durationMin, 'focus');
      alert('🎉 ¡Excelente trabajo! Has completado una sesión de enfoque. Tómate un merecido descanso.');
      this.setMode('shortBreak');
    } else {
      alert('⏰ ¡Descanso terminado! Listo para volver a concentrarte.');
      this.setMode('focus');
    }

    if (window.appInstance) {
      window.appInstance.renderDashboard();
    }
  }

  updateDisplay() {
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    if (this.dom.display) {
      this.dom.display.textContent = formatted;
    }

    // Actualizar anillo de progreso (circunferencia aprox 691 para r=110)
    if (this.dom.progressRing) {
      const circumference = 2 * Math.PI * 110;
      const progress = this.timeLeft / this.totalDuration;
      const offset = circumference * (1 - progress);
      this.dom.progressRing.style.strokeDashoffset = offset;
    }

    // Actualizar título de la pestaña del navegador
    document.title = `${formatted} - ${this.currentMode === 'focus' ? 'Enfoque' : 'Descanso'} | App Estudio`;
  }

  playChime() {
    if (!this.audioCtx) return;
    try {
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // Sonido agradable tipo campana con dos osciladores armónicos
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.3); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.3); // D6

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.2);
      osc2.stop(now + 1.2);
    } catch (e) {
      console.warn('Audio no disponible:', e);
    }
  }
}
