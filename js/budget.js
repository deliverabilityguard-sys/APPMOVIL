// ==========================================================================
// MÓDULO 1: "MI PLATA" — DASHBOARD FINANCIERO DIARIO
// Persistencia en localStorage ('student_budget_data')
// ==========================================================================

const BUDGET_STORAGE_KEY = 'student_budget_data';
const APP_DATA_VERSION = 'v31';

// Reseteo automático si la versión es anterior o no existe
(function checkAppDataReset() {
  try {
    const currentVersion = localStorage.getItem('app_data_version');
    if (currentVersion !== APP_DATA_VERSION) {
      const todayStr = new Date().toISOString().split('T')[0];
      localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify({
        dailyBudget: 0,
        date: todayStr,
        expenses: []
      }));
      localStorage.setItem('student_bills_data', JSON.stringify([]));
      localStorage.setItem('saved_recipes', JSON.stringify([]));
      localStorage.setItem('delivery_challenge_progress', JSON.stringify([false, false, false]));
      localStorage.setItem('app_data_version', APP_DATA_VERSION);
    }
  } catch (err) {
    console.warn('[Storage] Error al verificar versión de datos:', err);
  }
})();

class BudgetManager {
  constructor() {
    this.initDefaultData();
    this.attachEvents();
    this.render();
  }

  // Inicialización limpia en ceros
  initDefaultData() {
    const todayStr = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem(BUDGET_STORAGE_KEY);
    
    if (!stored) {
      const initialData = {
        dailyBudget: 0,
        date: todayStr,
        expenses: []
      };
      this.saveData(initialData);
    } else {
      // Si la fecha cambió a un nuevo día, transferir el presupuesto pero limpiar gastos del nuevo día
      const data = JSON.parse(stored);
      if (data.date !== todayStr) {
        data.date = todayStr;
        data.expenses = [];
        this.saveData(data);
      }
    }
  }

  getData() {
    try {
      const raw = localStorage.getItem(BUDGET_STORAGE_KEY);
      return raw ? JSON.parse(raw) : { dailyBudget: 0, date: new Date().toISOString().split('T')[0], expenses: [] };
    } catch (e) {
      return { dailyBudget: 0, date: new Date().toISOString().split('T')[0], expenses: [] };
    }
  }

  saveData(data) {
    localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(data));
  }

  formatCurrency(value) {
    return '$' + Number(value || 0).toLocaleString('es-CO');
  }

  addExpense(title, amount, icon = '💸') {
    const data = this.getData();
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newExpense = {
      id: 'exp-' + Date.now(),
      title: title.trim() || 'Gasto vario',
      amount: Math.abs(Number(amount)) || 0,
      time: timeStr,
      icon: icon
    };

    data.expenses.unshift(newExpense);
    this.saveData(data);
    this.render();
    return newExpense;
  }

  deleteExpense(id) {
    const data = this.getData();
    data.expenses = data.expenses.filter(e => e.id !== id);
    this.saveData(data);
    this.render();
  }

  setDailyBudget(amount) {
    const data = this.getData();
    data.dailyBudget = Math.max(0, Number(amount) || 0);
    this.saveData(data);
    this.render();
  }

  render() {
    const data = this.getData();
    const totalSpent = data.expenses.reduce((sum, e) => sum + e.amount, 0);
    const available = data.dailyBudget - totalSpent;

    // 1. Elementos del Hero Card
    const elAvailable = document.getElementById('budget-available-amount');
    const elLevelBadge = document.getElementById('budget-level-badge');
    const elProgressBar = document.getElementById('budget-progress-bar');
    const elInitialBudget = document.getElementById('budget-initial-stat');
    const elSpentStat = document.getElementById('budget-spent-stat');
    const elExpensesList = document.getElementById('budget-expenses-list');
    const elTotalSpentFooter = document.getElementById('budget-total-spent-footer');

    if (elAvailable) {
      elAvailable.textContent = this.formatCurrency(available);
      elAvailable.style.color = available >= 0 ? 'var(--primary)' : 'var(--accent-danger)';
    }

    if (elLevelBadge) {
      if (data.dailyBudget <= 0) {
        elLevelBadge.innerHTML = '🎯 Configura tu presupuesto';
        elLevelBadge.className = 'hero-budget-badge';
        elLevelBadge.style.color = 'var(--primary)';
        elLevelBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        elLevelBadge.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
      } else {
        const percentage = (available / data.dailyBudget) * 100;
        if (percentage >= 50) {
          elLevelBadge.innerHTML = '✨ Nivel: Bajo control';
          elLevelBadge.className = 'hero-budget-badge';
          elLevelBadge.style.color = 'var(--primary)';
          elLevelBadge.style.borderColor = '';
          elLevelBadge.style.backgroundColor = '';
        } else if (percentage > 15) {
          elLevelBadge.innerHTML = '⚠️ Nivel: Ojo al gasto';
          elLevelBadge.className = 'hero-budget-badge';
          elLevelBadge.style.color = 'var(--accent-warning)';
          elLevelBadge.style.borderColor = 'var(--accent-warning-border)';
          elLevelBadge.style.backgroundColor = 'var(--accent-warning-bg)';
        } else {
          elLevelBadge.innerHTML = '🚨 Nivel: Modo supervivencia';
          elLevelBadge.className = 'hero-budget-badge';
          elLevelBadge.style.color = 'var(--accent-danger)';
          elLevelBadge.style.borderColor = 'var(--accent-danger-border)';
          elLevelBadge.style.backgroundColor = 'var(--accent-danger-bg)';
        }
      }
    }

    if (elProgressBar) {
      const spentPercent = data.dailyBudget > 0
        ? Math.min(100, Math.max(0, (totalSpent / data.dailyBudget) * 100))
        : 0;
      elProgressBar.style.width = `${spentPercent}%`;
      elProgressBar.style.backgroundColor = spentPercent > 85 ? 'var(--accent-danger)' : 'var(--primary)';
    }

    if (elInitialBudget) elInitialBudget.textContent = this.formatCurrency(data.dailyBudget);
    if (elSpentStat) elSpentStat.textContent = `-${this.formatCurrency(totalSpent)}`;
    if (elTotalSpentFooter) elTotalSpentFooter.textContent = `Total hoy: ${this.formatCurrency(totalSpent)}`;

    // 2. Renderizar lista de gastos
    if (elExpensesList) {
      if (data.expenses.length === 0) {
        elExpensesList.innerHTML = `
          <div style="text-align: center; padding: 24px 10px; color: var(--text-muted); font-size: 0.84rem;">
            <span style="font-size: 1.3rem; display: block; margin-bottom: 6px;">🍃</span>
            Aún no has registrado gastos hoy. Presiona un botón para empezar.
          </div>
        `;
        return;
      }

      elExpensesList.innerHTML = data.expenses.map(exp => `
        <div class="expense-item" data-id="${exp.id}">
          <div class="expense-item-left">
            <div class="expense-icon">${exp.icon}</div>
            <div>
              <div class="expense-title">${this.escapeHtml(exp.title)}</div>
              <div class="expense-time">${exp.time}</div>
            </div>
          </div>
          <div class="expense-item-right">
            <span class="expense-amount">-${this.formatCurrency(exp.amount)}</span>
            <button class="expense-btn-del" data-action="delete" title="Borrar">✕</button>
          </div>
        </div>
      `).join('');

      elExpensesList.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const item = e.target.closest('.expense-item');
          if (item && item.dataset.id) {
            this.deleteExpense(item.dataset.id);
          }
        });
      });
    }
  }

  attachEvents() {
    // 1. Botones de Gasto Rápido
    document.querySelectorAll('.quick-spend-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const title = btn.dataset.title;
        const amount = Number(btn.dataset.amount);
        const icon = btn.dataset.icon || '💸';
        if (title && amount) {
          this.addExpense(title, amount, icon);
          this.playHapticFeedback();
        }
      });
    });

    // 2. Modal: Agregar otro gasto
    const btnOpenCustom = document.getElementById('btn-open-custom-expense');
    const modalExpense = document.getElementById('modal-add-expense');
    const formExpense = document.getElementById('form-custom-expense');
    const btnCloseExpense = document.getElementById('btn-close-expense-modal');

    if (btnOpenCustom && modalExpense) {
      btnOpenCustom.addEventListener('click', () => {
        modalExpense.classList.add('open');
        const inputAmount = document.getElementById('input-custom-amount');
        if (inputAmount) inputAmount.focus();
      });
    }

    if (btnCloseExpense && modalExpense) {
      btnCloseExpense.addEventListener('click', () => modalExpense.classList.remove('open'));
    }

    if (formExpense && modalExpense) {
      formExpense.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('input-custom-title').value;
        const amount = document.getElementById('input-custom-amount').value;
        const icon = document.getElementById('select-custom-icon').value || '💸';

        if (title && amount) {
          this.addExpense(title, amount, icon);
          modalExpense.classList.remove('open');
          formExpense.reset();
        }
      });
    }

    // 3. Modal: Ajustar presupuesto diario
    const btnOpenBudget = document.getElementById('btn-open-set-budget');
    const modalBudget = document.getElementById('modal-set-budget');
    const formBudget = document.getElementById('form-set-budget');
    const btnCloseBudget = document.getElementById('btn-close-budget-modal');

    if (btnOpenBudget && modalBudget) {
      btnOpenBudget.addEventListener('click', () => {
        modalBudget.classList.add('open');
        const inputVal = document.getElementById('input-budget-value');
        if (inputVal) inputVal.value = this.getData().dailyBudget;
      });
    }

    if (btnCloseBudget && modalBudget) {
      btnCloseBudget.addEventListener('click', () => modalBudget.classList.remove('open'));
    }

    if (formBudget && modalBudget) {
      formBudget.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = document.getElementById('input-budget-value').value;
        if (val) {
          this.setDailyBudget(val);
          modalBudget.classList.remove('open');
        }
      });
    }
  }

  playHapticFeedback() {
    if ('vibrate' in navigator) {
      navigator.vibrate(25);
    }
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
}

// Inicialización
window.budgetManager = new BudgetManager();
