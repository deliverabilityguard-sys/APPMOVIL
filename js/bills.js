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
      this.saveBills([]);
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
          <div style="text-align: center; padding: 24px 10px; color: var(--text-muted); font-size: 0.84rem;">
            <span style="font-size: 1.3rem; display: block; margin-bottom: 6px;">🎉</span>
            No tienes pagos pendientes registrados. Agrega uno con el botón verde.
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

  getNextDueDate(dueDay) {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();
    if (now.getDate() > dueDay) {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }
    const maxDaysInMonth = new Date(year, month + 1, 0).getDate();
    const day = Math.min(dueDay, maxDaysInMonth);
    return new Date(year, month, day, 9, 0, 0);
  }

  generateGoogleCalendarUrl(bill) {
    const date = this.getNextDueDate(bill.dueDay);
    const pad = (n) => String(n).padStart(2, '0');
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const startStr = `${y}${m}${d}T090000`;
    const endStr = `${y}${m}${d}T100000`;
    
    const title = `Pago: ${bill.name}`;
    const details = `Recordatorio mensual de pago para ${bill.name} (${this.formatCurrency(bill.amount)}). ${bill.notes || ''}`.trim();
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(details)}&recur=RRULE:FREQ=MONTHLY;BYMONTHDAY=${bill.dueDay}`;
  }

  downloadICS(bill) {
    const date = this.getNextDueDate(bill.dueDay);
    const pad = (n) => String(n).padStart(2, '0');
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const startStr = `${y}${m}${d}T090000`;
    const endStr = `${y}${m}${d}T100000`;
    const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Supervivencia Estudiantil//Recordatorios//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:bill-${bill.id}-${Date.now()}@supervivencia.app`,
      `DTSTAMP:${nowStr}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `RRULE:FREQ=MONTHLY;BYMONTHDAY=${bill.dueDay}`,
      `SUMMARY:Pago: ${bill.name}`,
      `DESCRIPTION:Recordatorio mensual de pago: ${bill.name} (${this.formatCurrency(bill.amount)}). ${bill.notes || ''}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      `DESCRIPTION:Mañana vence el pago de ${bill.name}`,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    this.triggerDownloadBlob(icsContent, `recordatorio_${bill.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.ics`);
  }

  downloadAllICS(pendingBills) {
    if (!pendingBills || pendingBills.length === 0) return;
    const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const pad = (n) => String(n).padStart(2, '0');

    const events = pendingBills.map(bill => {
      const date = this.getNextDueDate(bill.dueDay);
      const y = date.getFullYear();
      const m = pad(date.getMonth() + 1);
      const d = pad(date.getDate());
      const startStr = `${y}${m}${d}T090000`;
      const endStr = `${y}${m}${d}T100000`;

      return [
        'BEGIN:VEVENT',
        `UID:bill-${bill.id}-${Date.now()}@supervivencia.app`,
        `DTSTAMP:${nowStr}`,
        `DTSTART:${startStr}`,
        `DTEND:${endStr}`,
        `RRULE:FREQ=MONTHLY;BYMONTHDAY=${bill.dueDay}`,
        `SUMMARY:Pago: ${bill.name}`,
        `DESCRIPTION:Recordatorio mensual de pago: ${bill.name} (${this.formatCurrency(bill.amount)}). ${bill.notes || ''}`,
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-P1D',
        'ACTION:DISPLAY',
        `DESCRIPTION:Mañana vence el pago de ${bill.name}`,
        'END:VALARM',
        'END:VEVENT'
      ].join('\r\n');
    }).join('\r\n');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Supervivencia Estudiantil//Recordatorios//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      events,
      'END:VCALENDAR'
    ].join('\r\n');

    this.triggerDownloadBlob(icsContent, 'todos_los_recordatorios_pagos.ics');
  }

  triggerDownloadBlob(content, filename) {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }, 100);
  }

  openRemindersModal() {
    const modal = document.getElementById('modal-bill-reminders');
    const body = document.getElementById('reminders-modal-body');
    if (!modal || !body) return;

    const pendingBills = this.getBills().filter(b => !b.paid);

    if (pendingBills.length === 0) {
      body.innerHTML = `
        <div style="text-align: center; padding: 24px 10px;">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">🎉</div>
          <h4 style="color: #fff; font-size: 1rem; margin-bottom: 6px;">¡Todo al día!</h4>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 18px;">
            No tienes pagos pendientes registrados para agendar recordatorios.
          </p>
          <button type="button" class="btn-primary-neon" id="btn-reminders-add-bill" style="max-width: 220px; margin: 0 auto;">
            <span>+</span> Agregar un pago
          </button>
        </div>
      `;

      const btnAddFromReminders = document.getElementById('btn-reminders-add-bill');
      if (btnAddFromReminders) {
        btnAddFromReminders.addEventListener('click', () => {
          modal.classList.remove('open');
          const modalAdd = document.getElementById('modal-add-bill');
          if (modalAdd) modalAdd.classList.add('open');
        });
      }
    } else {
      body.innerHTML = `
        <div style="margin-bottom: 14px;">
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 14px; line-height: 1.45;">
            🔔 <strong style="color: var(--text-white);">Recordatorios activos:</strong><br>
            Toca <strong>Google Cal</strong> o <strong>.ICS</strong> para sincronizar la alarma con tu calendario local (recibirás alerta 24h antes):
          </p>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${pendingBills.map(b => {
              const gcalUrl = this.generateGoogleCalendarUrl(b);
              return `
                <div class="reminder-card-item">
                  <div>
                    <div style="font-weight: 800; font-size: 0.92rem; color: var(--text-white);">• ${this.escapeHtml(b.name)}</div>
                    <div style="font-size: 0.76rem; color: var(--primary); font-weight: 700; margin-top: 2px;">
                      Vence el día ${b.dueDay} de cada mes (${this.formatCurrency(b.amount)})
                    </div>
                    <div style="font-size: 0.72rem; color: var(--text-subtle); margin-top: 2px;">
                      Recibirás una alerta en tu calendario local.
                    </div>
                  </div>
                  <div style="display: flex; gap: 8px; margin-top: 4px;">
                    <a href="${gcalUrl}" target="_blank" rel="noopener" class="btn-cal-action" style="background: rgba(16, 185, 129, 0.15); color: var(--primary); border: 1px solid rgba(16, 185, 129, 0.3);">
                      <span>📅</span> Google Cal
                    </a>
                    <button type="button" class="btn-cal-action btn-download-single-ics" data-id="${b.id}" style="background: #202534; color: #fff; border: 1px solid var(--border-card);">
                      <span>📥</span> .ICS
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          <button type="button" id="btn-download-all-ics" class="btn-primary-neon" style="margin-top: 16px; font-size: 0.82rem;">
            <span>📅</span> Sincronizar todos con Calendario (.ics)
          </button>
        </div>
      `;

      // Eventos para descargar .ics individual
      body.querySelectorAll('.btn-download-single-ics').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const bill = pendingBills.find(b => b.id === id);
          if (bill) this.downloadICS(bill);
        });
      });

      // Evento para descargar todos
      const btnAll = document.getElementById('btn-download-all-ics');
      if (btnAll) {
        btnAll.addEventListener('click', () => {
          this.downloadAllICS(pendingBills);
        });
      }
    }

    modal.classList.add('open');
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

    // Modal: Recordatorios
    const btnNotify = document.getElementById('btn-enable-bill-notifications');
    const modalReminders = document.getElementById('modal-bill-reminders');
    const btnCloseReminders = document.getElementById('btn-close-reminders-modal');

    if (btnNotify) {
      btnNotify.addEventListener('click', () => {
        this.openRemindersModal();
      });
    }

    if (btnCloseReminders && modalReminders) {
      btnCloseReminders.addEventListener('click', () => {
        modalReminders.classList.remove('open');
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
