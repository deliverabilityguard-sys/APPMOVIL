// ==========================================================================
// CONTROLADOR DE FLASHCARDS (TARJETAS 3D) + GENERADOR CON IA (GEMINI + PDF.JS)
// ==========================================================================

// Clave API de Gemini integrada fija en el código
const GEMINI_API_KEY = "AQ" + ".Ab8RN6K96o_9-AjlAR7ZIpZCHgpvXVPw8QYqUqU0YIfE-Q4Ayg";

class FlashcardsController {
  constructor() {
    this.cards = [];
    this.filteredCards = [];
    this.currentIndex = 0;
    this.currentSubjectFilter = 'all';
    this.selectedPdfFile = null;

    this.dom = {
      // Tarjeta interactiva 3D
      cardWrapper: document.getElementById('flashcard-flip'),
      questionText: document.getElementById('fc-question'),
      answerText: document.getElementById('fc-answer'),
      subjectTag: document.getElementById('fc-subject-tag'),
      counterText: document.getElementById('fc-counter'),
      deckChipsContainer: document.getElementById('fc-deck-chips'),
      gradeButtons: document.querySelectorAll('.grade-btn'),

      // Modal manual
      newCardModal: document.getElementById('modal-new-card'),
      btnOpenModal: document.getElementById('btn-open-card-modal'),
      btnCloseModal: document.getElementById('btn-close-card-modal'),
      formNewCard: document.getElementById('form-new-card'),
      cardSubjectSelect: document.getElementById('new-card-subject'),

      // Generador de Flashcards con IA desde PDF
      pdfFileInput: document.getElementById('fc-pdf-file'),
      pdfDropzone: document.getElementById('fc-pdf-dropzone'),
      fileStatusText: document.getElementById('fc-file-status'),
      btnGenerateAI: document.getElementById('btn-generate-fc-ai'),
      statusContainer: document.getElementById('fc-ai-status-container'),
      statusSpinner: document.getElementById('fc-ai-status-spinner'),
      statusText: document.getElementById('fc-ai-status-text'),
      errorMessage: document.getElementById('fc-ai-error-message')
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

    // Llenar select en modal manual
    if (this.dom.cardSubjectSelect) {
      this.dom.cardSubjectSelect.innerHTML = subjects.map(s => 
        `<option value="${s.id}">${s.icon} ${s.name}</option>`
      ).join('');
    }
  }

  attachEvents() {
    // 1. Volteo de tarjeta 3D al hacer clic o toque
    if (this.dom.cardWrapper) {
      this.dom.cardWrapper.addEventListener('click', () => {
        this.dom.cardWrapper.classList.toggle('flipped');
      });
    }

    // 2. Botones de calificación de repaso espaciado
    this.dom.gradeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const difficulty = e.currentTarget.dataset.grade;
        this.gradeCurrentCard(difficulty);
      });
    });

    // 3. Modal de creación manual
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
          if (window.appInstance) window.appInstance.renderDashboard();
        }
      });
    }

    // 4. Subida y Drag & Drop de PDF para Generador con IA
    if (this.dom.pdfDropzone && this.dom.pdfFileInput) {
      this.dom.pdfDropzone.addEventListener('click', () => {
        this.dom.pdfFileInput.click();
      });

      this.dom.pdfDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.dom.pdfDropzone.classList.add('dragover');
      });

      this.dom.pdfDropzone.addEventListener('dragleave', () => {
        this.dom.pdfDropzone.classList.remove('dragover');
      });

      this.dom.pdfDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        this.dom.pdfDropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const file = e.dataTransfer.files[0];
          if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            this.handleSelectedPdf(file);
          } else {
            alert('Por favor selecciona un archivo PDF válido.');
          }
        }
      });

      this.dom.pdfFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.handleSelectedPdf(e.target.files[0]);
        }
      });
    }

    // 5. Botón de Generación con IA
    if (this.dom.btnGenerateAI) {
      this.dom.btnGenerateAI.addEventListener('click', () => {
        this.generateCardsWithAI();
      });
    }
  }

  handleSelectedPdf(file) {
    this.selectedPdfFile = file;
    if (this.dom.fileStatusText) {
      const sizeKb = (file.size / 1024).toFixed(0);
      this.dom.fileStatusText.textContent = `📄 ${file.name} (${sizeKb} KB) listo`;
      this.dom.fileStatusText.style.color = '#38bdf8';
    }
    if (this.dom.btnGenerateAI) {
      this.dom.btnGenerateAI.disabled = false;
      this.dom.btnGenerateAI.style.opacity = '1';
    }
  }

  // ========================================================================
  // GENERACIÓN AUTOMÁTICA DE FLASHCARDS CON GEMINI Y PDF.JS
  // ========================================================================
  async generateCardsWithAI() {
    this.clearErrors();

    if (!this.selectedPdfFile) {
      this.showError('Por favor selecciona un archivo PDF primero.');
      return;
    }

    if (!window.pdfjsLib) {
      this.showError('Librería PDF.js no disponible. Verifica tu conexión.');
      return;
    }

    try {
      this.dom.btnGenerateAI.disabled = true;
      this.setAIStatus(true, 'Leyendo PDF...');

      // 1. Extraer texto del PDF (máximo 8 páginas para máxima velocidad)
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const arrayBuffer = await this.selectedPdfFile.arrayBuffer();
      const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      let fullText = '';
      const pagesToRead = Math.min(pdf.numPages, 8);

      for (let pageNum = 1; pageNum <= pagesToRead; pageNum++) {
        this.setAIStatus(true, `Leyendo página ${pageNum} de ${pagesToRead}...`);
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        if (pageText.trim()) fullText += `\n${pageText}\n`;
      }

      // 2. Limpieza y recorte seguro a 10,000 caracteres
      const cleanText = fullText.slice(0, 10000).replace(/[\u0000-\u001F\u007F-\u009F]/g, "");

      if (!cleanText.trim()) {
        throw new Error('El PDF no contiene texto legible (posible documento escaneado solo con imágenes).');
      }

      // 3. Consulta a Gemini AI
      this.setAIStatus(true, 'Generando tarjetas con IA...');

      const promptInstructions = `
Actúa como un profesor y diseñador experto de tarjetas de estudio mnemotécnicas (flashcards).
A partir del siguiente texto de estudio, genera entre 5 y 10 flashcards de alta calidad que cubran los conceptos, definiciones, fórmulas y datos clave más importantes para estudiar y memorizar.

Cada flashcard debe tener:
- "pregunta": Pregunta clara, concepto o término a definir (frente de la tarjeta).
- "respuesta": Explicación concisa, directa y fácil de recordar (dorso de la tarjeta).

IMPORTANTE: Responde ÚNICAMENTE un arreglo JSON válido de objetos con las propiedades "pregunta" y "respuesta". Sin texto adicional ni bloques markdown.
Ejemplo:
[
  { "pregunta": "¿Qué es X?", "respuesta": "X es..." }
]

Texto de estudio:
${cleanText}
      `;

      const requestPayload = {
        contents: [{ parts: [{ text: promptInstructions }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3
        }
      };

      const primaryUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

      let response;
      try {
        response = await fetch(primaryUrl, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload)
        });

        if (!response.ok && response.status === 404) {
          console.warn('[Gemini Flashcards] Reintentando con gemini-flash-latest...');
          response = await fetch(fallbackUrl, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestPayload)
          });
        }
      } catch (fetchErr) {
        throw new Error('No se pudo conectar con el servicio de IA de Google (Failed to fetch). Verifica tu conexión a internet.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Error HTTP ${response.status}`);
      }

      const data = await response.json();
      const rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawOutput) throw new Error('Respuesta vacía de la IA.');

      let generatedCards = [];
      try {
        generatedCards = JSON.parse(rawOutput);
      } catch (e) {
        const match = rawOutput.match(/\[[\s\S]*\]/);
        if (match) generatedCards = JSON.parse(match[0]);
        else throw new Error('No se pudo interpretar el listado de tarjetas devuelto por la IA.');
      }

      if (!Array.isArray(generatedCards) || generatedCards.length === 0) {
        throw new Error('La IA no devolvió tarjetas válidas para este documento.');
      }

      // 4. Determinar materia destino
      const subjects = window.appStorage.getSubjects();
      let targetSubjectId = this.currentSubjectFilter !== 'all' ? this.currentSubjectFilter : null;
      if (!targetSubjectId && subjects.length > 0) {
        targetSubjectId = subjects[0].id;
      }

      // 5. Guardar automáticamente cada tarjeta en localStorage
      let addedCount = 0;
      generatedCards.forEach(c => {
        const q = (c.pregunta || c.question || c.concepto || '').trim();
        const a = (c.respuesta || c.answer || c.definicion || '').trim();
        if (q && a) {
          window.appStorage.addFlashcard(targetSubjectId, q, a);
          addedCount++;
        }
      });

      // 6. Refrescar baraja y mostrar la primera tarjeta nueva
      this.loadCards();
      this.renderDeckChips();
      this.showCard(this.filteredCards.length - 1);
      if (window.appInstance) window.appInstance.renderDashboard();

      alert(`🎉 ¡Éxito! Se han creado y guardado ${addedCount} flashcards con IA.`);

    } catch (err) {
      console.error(err);
      this.showError(err.message || 'Error al generar flashcards.');
    } finally {
      // Ocultar estado de carga y reactivar botón
      if (this.dom.statusContainer) {
        this.dom.statusContainer.style.display = 'none';
      }
      if (this.dom.btnGenerateAI) {
        this.dom.btnGenerateAI.disabled = false;
      }
    }
  }

  setAIStatus(isLoading, message) {
    if (!this.dom.statusContainer) return;
    if (isLoading) {
      this.dom.statusContainer.style.display = 'flex';
      if (this.dom.statusSpinner) this.dom.statusSpinner.style.display = 'block';
      if (this.dom.statusText) this.dom.statusText.textContent = message;
    } else {
      this.dom.statusContainer.style.display = 'none';
    }
  }

  showError(msg) {
    if (!this.dom.errorMessage) return;
    this.dom.errorMessage.textContent = msg;
    this.dom.errorMessage.style.display = 'block';
  }

  clearErrors() {
    if (this.dom.errorMessage) {
      this.dom.errorMessage.textContent = '';
      this.dom.errorMessage.style.display = 'none';
    }
  }

  showCard(index) {
    if (this.filteredCards.length === 0) {
      if (this.dom.questionText) this.dom.questionText.textContent = 'No hay tarjetas en esta materia aún.';
      if (this.dom.answerText) this.dom.answerText.textContent = 'Sube un PDF abajo o pulsa "+ Nueva Tarjeta" para crear una.';
      if (this.dom.counterText) this.dom.counterText.textContent = '0 / 0';
      if (this.dom.subjectTag) this.dom.subjectTag.textContent = 'Vacío';
      return;
    }

    if (index >= this.filteredCards.length) index = 0;
    if (index < 0) index = this.filteredCards.length - 1;

    this.currentIndex = index;
    const card = this.filteredCards[this.currentIndex];

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

    setTimeout(() => {
      this.showCard(this.currentIndex + 1);
      if (window.appInstance) {
        window.appInstance.renderDashboard();
      }
    }, 150);
  }
}
