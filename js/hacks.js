// ==========================================================================
// MÓDULO 3: "HACKS DE VIDA" — TRUCOS DE SUPERVIVENCIA & RETO GAMIFICADO
// ==========================================================================

const HACKS_DATA = [
  {
    id: 'h1',
    category: 'ahorro',
    categoryLabel: 'AHORRO · 2 MIN',
    tagClass: 'hack-tag-ahorro',
    title: 'Compra frutas y verduras en plazas los martes',
    body: 'En plazas de mercado barriales o ferias de agricultor, el kilo de tomate, papa y plátano cuesta hasta un 60% menos que en cadenas de supermercados. Lleva tus propias bolsas de tela para pedir ñapa.'
  },
  {
    id: 'h2',
    category: 'cocina',
    categoryLabel: 'COCINA · 1 MIN',
    tagClass: 'hack-tag-cocina',
    title: 'El truco del agua de arroz y pastas',
    body: 'Nunca descartes el agua caliente con almidón de la cocción de arroz o pasta. Úsala para espesar caldos, salsas o remojar sartenes pegadas para que se despeguen solas sin restregar.'
  },
  {
    id: 'h3',
    category: 'casa',
    categoryLabel: 'CASA · 2 MIN',
    tagClass: 'hack-tag-casa',
    title: 'Desengrasante casero por menos de $2.000',
    body: 'Mezcla vinagre blanco con dos cucharadas de bicarbonato de sodio en un atomizador. Elimina la grasa quemada de estufas y ollas sin comprar químicos costosos.'
  },
  {
    id: 'h4',
    category: 'ahorro',
    categoryLabel: 'AHORRO · 3 MIN',
    tagClass: 'hack-tag-ahorro',
    title: 'Comparte el plan de internet con el vecino de piso',
    body: 'Un solo plan de fibra óptica de 300 megas puede cubrir dos apartamentos contiguos mediante un router repetidor económico ($40.000). Ahorro de $45.000 mensuales cada uno.'
  },
  {
    id: 'h5',
    category: 'cocina',
    categoryLabel: 'COCINA · 1 MIN',
    tagClass: 'hack-tag-cocina',
    title: 'Congela el pan tajado en porciones de dos',
    body: 'Para que no se llene de moho en climas cálidos o húmedos, congela la bolsa de pan. Saca dos rodajas directo a la sartén o tostadora: queda como recién horneado.'
  },
  {
    id: 'h6',
    category: 'casa',
    categoryLabel: 'CASA · 1 MIN',
    tagClass: 'hack-tag-casa',
    title: 'Neutraliza olores en la nevera con café usado',
    body: 'Pon un vasito pequeño con la borra seca del tinto en una esquina de la nevera. Absorbe por completo los olores a cebolla y comida guardada.'
  }
];

class HacksManager {
  constructor() {
    this.activeFilter = 'todos';
    this.challengeDays = this.getChallengeDays();
    this.attachEvents();
    this.renderHacks();
    this.renderChallenge();
  }

  getChallengeDays() {
    try {
      const stored = localStorage.getItem('delivery_challenge_progress');
      return stored ? JSON.parse(stored) : [false, false, false];
    } catch (e) {
      return [false, false, false];
    }
  }

  saveChallengeDays(days) {
    localStorage.setItem('delivery_challenge_progress', JSON.stringify(days));
  }

  toggleChallengeDay(index) {
    this.challengeDays[index] = !this.challengeDays[index];
    this.saveChallengeDays(this.challengeDays);
    this.renderChallenge();
  }

  renderChallenge() {
    const elCounter = document.getElementById('challenge-counter-text');
    const completedCount = this.challengeDays.filter(Boolean).length;

    if (elCounter) {
      elCounter.textContent = `(${completedCount}/3)`;
    }

    const btns = document.querySelectorAll('.challenge-day-btn');
    btns.forEach((btn, idx) => {
      const isDone = Boolean(this.challengeDays[idx]);
      btn.classList.toggle('completed', isDone);
      const checkEl = btn.querySelector('.day-check');
      if (checkEl) checkEl.textContent = isDone ? '✓' : '○';
    });

    const elSuccessMsg = document.getElementById('challenge-success-msg');
    if (elSuccessMsg) {
      elSuccessMsg.style.display = completedCount === 3 ? 'block' : 'none';
    }
  }

  renderHacks() {
    const container = document.getElementById('hacks-list-container');
    if (!container) return;

    const filtered = this.activeFilter === 'todos' 
      ? HACKS_DATA 
      : HACKS_DATA.filter(h => h.category === this.activeFilter);

    container.innerHTML = filtered.map(hack => `
      <div class="hack-item-card" data-category="${hack.category}">
        <div class="hack-item-header">
          <span class="hack-item-tag ${hack.tagClass}">${hack.categoryLabel}</span>
          <span style="font-size: 0.9rem;">💡</span>
        </div>
        <h4 class="hack-item-title">${hack.title}</h4>
        <p class="hack-item-body">${hack.body}</p>
      </div>
    `).join('');
  }

  attachEvents() {
    // Filtros de categorías
    document.querySelectorAll('.hack-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.hack-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeFilter = btn.dataset.filter || 'todos';
        this.renderHacks();
      });
    });

    // Casillas del reto de 3 días
    document.querySelectorAll('.challenge-day-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const dayIdx = Number(btn.dataset.day);
        if (!isNaN(dayIdx)) {
          this.toggleChallengeDay(dayIdx);
        }
      });
    });

    // Modal del Hack de la semana
    const btnHackWeek = document.getElementById('btn-read-hack-week');
    const modalHackWeek = document.getElementById('modal-hack-week');
    const btnCloseHack = document.getElementById('btn-close-hack-modal');

    if (btnHackWeek && modalHackWeek) {
      btnHackWeek.addEventListener('click', () => modalHackWeek.classList.add('open'));
    }

    if (btnCloseHack && modalHackWeek) {
      btnCloseHack.addEventListener('click', () => modalHackWeek.classList.remove('open'));
    }
  }
}

// Inicialización
window.hacksManager = new HacksManager();
