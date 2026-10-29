// ==========================================================================
// MÓDULO 4: "PAGOS AL DÍA" — CONTROL DE VENCIMIENTOS & NOTIFICACIONES
// Persistencia en localStorage ('student_bills_data')
// ==========================================================================

const BILLS_STORAGE_KEY = 'student_bills_data';

class BillsManager {
  constructor() {
    this.initDefaultBills();
    this.attachEvents();
    this.render();
  }

  initDefaultBills() {
    const stored = localStorage.getItem(BILLS_STORAGE_KEY);
    if (!stored) {
      const defaultBills = [
        {
          id: 'bill-1',
          name: 'Arriendo mensual',
          amount: 350000,
          dueDay: 5,
          tagText: 'VENCE MAÑANA',
          tagClass: 'tag-alert-red',
          paid: false,
          notes: 'Transferir antes del mediodía al propietario'
        },
        {
          id: 'bill-2',
          name: 'Internet compartido (300 MB)',
          amount: 30000,
          dueDay: 12,
          tagText: 'EN 5 DÍAS',
          tagClass: 'tag-alert-yellow',
          paid: false,
          notes: 'Darle el efectivo al vecino del 302'
        },
        {
          id: 'bill-3',
          name: 'Factura de luz y agua',
          amount: 45000,
          dueDay: 2,
          tagText: 'PAGADO',
          tagClass: 'tag-alert-blue',
          paid: true,
          notes: 'Pagado por PSE'
        }
      ];
      this.saveBills(defaultBills);
    }
  }

  getBills() {
    try {
      const raw = localStorage.getItem(BILLS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  saveBills(bills) {
    localStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(bills));
  }

  formatCurrency(value) {
    return '$' + Number(value || 0).toLocaleString('es-CO');
  }

  addBill(name, amount, dueDay, notes = '') {
    const bills = this.getBills();
    const newBill = {
      id: 'bill-' + Date.now(),
      name: name.trim(),
      amount: Math.abs(Number(amount)) || 0,
      dueDay: Number(dueDay) || 15,
      tagText: `DÍA ${dueDay}`,
      tagClass: 'tag-alert-yellow',
      paid: false,
      notes: notes.trim()
    };
    bills.unshift(newBill);
    this.saveBills(bills);
    this.render();
    return newBill;
  }

  togglePaid(id) {
    const bills = this.getBills();
    const bill = bills.find(b => b.id === id);
    if (bill) {
      bill.paid = !bill.paid;
      this.saveBills(bills);
      this.render();
    }
  }

  deleteBill(id) {
    let bills = this.getBills().filter(b => b.id !== id);
    this.saveBills(bills);
    this.render();
  }

  render() {
    const bills = this.getBills();
    const pendingBills = bills.filter(b => !b.paid);
    const paidBills = bills.filter(b => b.paid);

    const totalPending = pendingBills.reduce((sum, b) => sum + b.amount, 0);
    const totalPaid = paidBills.reduce((sum, b) => sum + b.amount, 0);

    // Totales en el widget mensual
    const elPending = document.getElementById('bills-total-pending');
    const elPaid = document.getElementById('bills-total-paid');
    const elMonthBadge = document.getElementById('bills-month-badge');

    if (elPending) elPending.textContent = this.formatCurrency(totalPending);
    if (elPaid) elPaid.textContent = this.formatCurrency(totalPaid);
    if (elMonthBadge) {
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const now = new Date();
      elMonthBadge.textContent = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    }

    // Lista de Próximos Vencimientos
    const containerPending = document.getElementById('bills-pending-list');
    if (containerPending) {
      if (pendingBills.length === 0) {
        containerPending.innerHTML = `
          <div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.84rem;">
            🎉 ¡Felicidades! No tienes pagos pendientes este mes.
          </div>
        `;
      } else {
        containerPending.innerHTML = pendingBills.map(b => `
          <div class="bill-item-card" data-id="${b.id}">
            <div class="bill-info-left">
              <div class="bill-header-row">
                <span class="bill-name">${this.escapeHtml(b.name)}</span>
                <span class="bill-tag ${b.tagClass || 'tag-alert-yellow'}">${b.tagText || 'PENDIENTE'}</span>
              </div>
              <div class="bill-meta-row">
                <span>Vence el día ${b.dueDay} de cada mes</span>
                ${b.notes ? ` • <span style="color: var(--text-subtle);">${this.escapeHtml(b.notes)}</span>` : ''}
              </div>
            </div>
            <div style="text-align: right; flex-shrink: 0;">
              <div class="bill-amount-text">${this.formatCurrency(b.amount)}</div>
              <button class="btn-mark-paid" data-action="toggle">
                ✓ Marcar pago
              </button>
            </div>
          </div>
        `).join('');
      }
    }

    // Lista "Ya puedes respirar 😌" (Pagos completados)
    const containerPaid = document.getElementById('bills-paid-list');
    if (containerPaid) {
      if (paidBills.length === 0) {
        containerPaid.innerHTML = `
          <div style="text-align: center; padding: 14px; color: var(--text-subtle); font-size: 0.78rem;">
            Aún no has registrado pagos cancelados en este ciclo.
          </div>
        `;
      } else {
        containerPaid.innerHTML = paidBills.map(b => `
          <div class="bill-item-card is-paid" data-id="${b.id}">
            <div class="bill-info-left">
              <div class="bill-header-row">
                <span class="bill-name" style="text-decoration: line-through; color: var(--text-muted);">${this.escapeHtml(b.name)}</span>
                <span class="bill-tag" style="background: rgba(16, 185, 129, 0.15); color: var(--primary);">✓ PAGADO</span>
              </div>
              <div class="bill-meta-row">Completado este mes</div>
            </div>
            <div style="text-align: right; flex-shrink: 0;">
              <div class="bill-amount-text" style="color: var(--primary);">${this.formatCurrency(b.amount)}</div>
              <button class="expense-btn-del" data-action="toggle" title="Deshacer y pasar a pendiente" style="font-size: 0.75rem; color: var(--text-muted);">↺ Deshacer</button>
            </div>
          </div>
        `).join('');
      }
    }

    // Eventos de interactividad
    document.querySelectorAll('.bill-item-card [data-action="toggle"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const card = e.target.closest('.bill-item-card');
        if (card && card.dataset.id) {
          this.togglePaid(card.dataset.id);
        }
      });
    });
  }

  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      alert('Tu navegador móvil no soporta notificaciones push locales.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      alert('🔔 ¡Notificaciones activadas! Te avisaremos 24 horas antes del vencimiento de tus pagos.');
      new Notification('Supervivencia Estudiantil 🎓', {
        body: 'Alertas de pagos y vencimientos configuradas con éxito.',
        icon: './icons/icon-192.png'
      });
    } else {
      alert('Permiso de notificaciones denegado. Puedes activarlo en los ajustes de tu navegador.');
    }
  }

  attachEvents() {
    // Modal: Agregar un pago
    const btnOpen = document.getElementById('btn-open-add-bill');
    const modal = document.getElementById('modal-add-bill');
    const form = document.getElementById('form-add-bill');
    const btnClose = document.getElementById('btn-close-bill-modal');

    if (btnOpen && modal) {
      btnOpen.addEventListener('click', () => modal.classList.add('open'));
    }

    if (btnClose && modal) {
      btnClose.addEventListener('click', () => modal.classList.remove('open'));
    }

    if (form && modal) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('input-bill-name').value;
        const amount = document.getElementById('input-bill-amount').value;
        const dueDay = document.getElementById('input-bill-day').value;
        const notes = document.getElementById('input-bill-notes').value;

        if (name && amount && dueDay) {
          this.addBill(name, amount, dueDay, notes);
          modal.classList.remove('open');
          form.reset();
        }
      });
    }

    // Botón de activar notificaciones 24h
    const btnNotify = document.getElementById('btn-enable-bill-notifications');
    if (btnNotify) {
      btnNotify.addEventListener('click', () => {
        this.requestNotificationPermission();
      });
    }
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
}

// Inicialización
window.billsManager = new BillsManager();
