// Controlador de Flashcards / Tarjetas de Repaso
class FlashcardsController {
  constructor() {
    this.cards = [];
    this.filteredCards = [];
    this.currentIndex = 0;
    this.currentSubjectFilter = 'all';

    this.dom = {
      cardWrapper: document.getElementById('flashcard-flip'),
      questionText: document.getElementById('fc-question'),
      answerText: document.getElementById('fc-answer'),
      subjectTag: document.getElementById('fc-subject-tag'),
      counterText: document.getElementById('fc-counter'),
      deckChipsContainer: document.getElementById('fc-deck-chips'),
      gradeButtons: document.querySelectorAll('.grade-btn'),
      newCardModal: document.getElementById('modal-new-card'),
      btnOpenModal: document.getElementById('btn-open-card-modal'),
      btnCloseModal: document.getElementById('btn-close-card-modal'),
      formNewCard: document.getElementById('form-new-card'),
      cardSubjectSelect: document.getElementById('new-card-subject')
    };

    this.init();
  }

  init() {
    this.loadCards();
    this.renderDeckChips();
    this.attachEvents();
    this.showCard(0);
  }

  loadCards() {
    this.cards = window.appStorage.getFlashcards();
    this.applyFilter(this.currentSubjectFilter);
  }

  applyFilter(subjectId) {
    this.currentSubjectFilter = subjectId;
    if (subjectId === 'all') {
      this.filteredCards = [...this.cards];
    } else {
      this.filteredCards = this.cards.filter(c => c.subjectId === subjectId);
    }
    this.currentIndex = 0;
    this.showCard(0);
  }

  renderDeckChips() {
    if (!this.dom.deckChipsContainer) return;
    const subjects = window.appStorage.getSubjects();

    let html = `
      <button class="deck-chip ${this.currentSubjectFilter === 'all' ? 'active' : ''}" data-subject="all">
        ✨ Todas (${this.cards.length})
      </button>
    `;

    subjects.forEach(sub => {
      const count = this.cards.filter(c => c.subjectId === sub.id).length;
      html += `
        <button class="deck-chip ${this.currentSubjectFilter === sub.id ? 'active' : ''}" data-subject="${sub.id}">
          ${sub.icon} ${sub.name} (${count})
        </button>
      `;
    });

    this.dom.deckChipsContainer.innerHTML = html;

    this.dom.deckChipsContainer.querySelectorAll('.deck-chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const subId = e.currentTarget.dataset.subject;
        this.dom.deckChipsContainer.querySelectorAll('.deck-chip').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.applyFilter(subId);
      });
    });

    // Llenar select en modal
    if (this.dom.cardSubjectSelect) {
      this.dom.cardSubjectSelect.innerHTML = subjects.map(s => 
        `<option value="${s.id}">${s.icon} ${s.name}</option>`
      ).join('');
    }
  }

  attachEvents() {
    // Voltear tarjeta con un click
    if (this.dom.cardWrapper) {
      this.dom.cardWrapper.addEventListener('click', () => {
        this.dom.cardWrapper.classList.toggle('flipped');
      });
    }

    // Botones de calificación
    this.dom.gradeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const difficulty = e.currentTarget.dataset.grade;
        this.gradeCurrentCard(difficulty);
      });
    });

    // Modal
    if (this.dom.btnOpenModal) {
      this.dom.btnOpenModal.addEventListener('click', () => {
        this.dom.newCardModal.classList.add('open');
      });
    }
    if (this.dom.btnCloseModal) {
      this.dom.btnCloseModal.addEventListener('click', () => {
        this.dom.newCardModal.classList.remove('open');
      });
    }

    if (this.dom.formNewCard) {
      this.dom.formNewCard.addEventListener('submit', (e) => {
        e.preventDefault();
        const subId = document.getElementById('new-card-subject').value;
        const q = document.getElementById('new-card-q').value.trim();
        const a = document.getElementById('new-card-a').value.trim();

        if (q && a) {
          window.appStorage.addFlashcard(subId, q, a);
          this.loadCards();
          this.renderDeckChips();
          this.dom.newCardModal.classList.remove('open');
          this.dom.formNewCard.reset();
          this.showCard(this.filteredCards.length - 1);
        }
      });
    }
  }

  showCard(index) {
    if (this.filteredCards.length === 0) {
      if (this.dom.questionText) this.dom.questionText.textContent = 'No hay tarjetas en esta materia aún.';
      if (this.dom.answerText) this.dom.answerText.textContent = 'Presiona "+ Nueva Tarjeta" para crear una.';
      if (this.dom.counterText) this.dom.counterText.textContent = '0 / 0';
      if (this.dom.subjectTag) this.dom.subjectTag.textContent = 'Vacio';
      return;
    }

    if (index >= this.filteredCards.length) index = 0;
    if (index < 0) index = this.filteredCards.length - 1;

    this.currentIndex = index;
    const card = this.filteredCards[this.currentIndex];

    // Asegurar que comience de frente
    if (this.dom.cardWrapper) {
      this.dom.cardWrapper.classList.remove('flipped');
    }

    if (this.dom.questionText) this.dom.questionText.textContent = card.question;
    if (this.dom.answerText) this.dom.answerText.textContent = card.answer;
    if (this.dom.counterText) {
      this.dom.counterText.textContent = `${this.currentIndex + 1} / ${this.filteredCards.length}`;
    }

    const subjects = window.appStorage.getSubjects();
    const subject = subjects.find(s => s.id === card.subjectId);
    if (this.dom.subjectTag) {
      this.dom.subjectTag.textContent = subject ? `${subject.icon} ${subject.name}` : 'General';
    }
  }

  gradeCurrentCard(difficulty) {
    if (this.filteredCards.length === 0) return;
    const card = this.filteredCards[this.currentIndex];
    const newReviews = (card.reviews || 0) + 1;

    window.appStorage.updateFlashcard(card.id, {
      difficulty,
      reviews: newReviews
    });

    // Pequeño delay para animar paso a la siguiente
    setTimeout(() => {
      this.showCard(this.currentIndex + 1);
      if (window.appInstance) {
        window.appInstance.renderDashboard();
      }
    }, 150);
  }
}
