// ==========================================================================
// MÓDULO EXCLUSIVO: FLASHCARDS CON GENERADOR AUTOMÁTICO DE IA (PDF + GEMINI)
// Persistencia blindada en localStorage ('appestudio_saved_flashcards')
// ==========================================================================

// Clave API de Gemini fija en el código
const GEMINI_API_KEY = "AQ" + ".Ab8RN6K96o_9-AjlAR7ZIpZCHgpvXVPw8QYqUqU0YIfE-Q4Ayg";
const FLASHCARDS_STORAGE_KEY = 'appestudio_saved_flashcards';

class FlashcardsController {
  constructor() {
    this.cards = [];
    this.currentIndex = 0;
    this.selectedPdfFile = null;

    this.dom = {
      // Generador con IA
      pdfFileInput: document.getElementById('fc-pdf-file'),
      pdfDropzone: document.getElementById('fc-pdf-dropzone'),
      fileStatusText: document.getElementById('fc-file-status'),
      btnGenerateAI: document.getElementById('btn-generate-fc-ai'),
      statusContainer: document.getElementById('fc-ai-status-container'),
      statusSpinner: document.getElementById('fc-ai-status-spinner'),
      statusText: document.getElementById('fc-ai-status-text'),
      errorMessage: document.getElementById('fc-ai-error-message'),

      // Visor 3D y Contenedores
      viewerContainer: document.getElementById('fc-viewer-container'),
      emptyState: document.getElementById('fc-empty-state'),
      cardWrapper: document.getElementById('flashcard-flip'),
      questionText: document.getElementById('fc-question'),
      answerText: document.getElementById('fc-answer'),
      counterText: document.getElementById('fc-counter'),
      btnDeleteCard: document.getElementById('btn-delete-card'),
      btnClearDeck: document.getElementById('btn-clear-deck'),
      gradeButtons: document.querySelectorAll('.grade-btn')
    };

    this.init();
  }

  init() {
    this.loadFlashcardsFromStorage();
    this.attachEvents();
  }

  // Carga automática e inmediata desde localStorage
  loadFlashcardsFromStorage() {
    try {
      let stored = localStorage.getItem(FLASHCARDS_STORAGE_KEY);
      // Fallback a claves anteriores si la clave principal aún no existe
      if (!stored) {
        stored = localStorage.getItem('flashcards_data') || localStorage.getItem('estudio_flashcards_v1');
        if (stored) {
          localStorage.setItem(FLASHCARDS_STORAGE_KEY, stored);
        }
      }

      if (stored) {
        this.cards = JSON.parse(stored);
      } else {
        this.cards = [];
      }
    } catch (e) {
      console.error("Error al parsear tarjetas guardadas:", e);
      this.cards = [];
    }
    this.currentIndex = 0;
    this.renderCurrentCard();
  }

  // Alias para compatibilidad externa
  loadCards() {
    this.loadFlashcardsFromStorage();
  }

  // Guardado persistente inmediato
  saveFlashcardsToStorage(cards) {
    this.cards = Array.isArray(cards) ? cards : [];
    try {
      localStorage.setItem(FLASHCARDS_STORAGE_KEY, JSON.stringify(this.cards));
      if (window.appStorage) {
        window.appStorage.save('estudio_flashcards_v1', this.cards);
      }
    } catch (e) {
      console.error("Error al guardar tarjetas en localStorage:", e);
    }
    this.renderCurrentCard();
  }

  // Alias para compatibilidad
  saveCards(cards) {
    this.saveFlashcardsToStorage(cards);
  }

  // Eliminar la tarjeta visible actualmente (botón papelera)
  deleteCurrentCard() {
    if (!this.cards || this.cards.length === 0) return;
    this.cards.splice(this.currentIndex, 1);
    if (this.currentIndex >= this.cards.length) {
      this.currentIndex = Math.max(0, this.cards.length - 1);
    }
    this.saveFlashcardsToStorage(this.cards);
  }

  // Vaciar toda la baraja con confirmación previa
  clearDeck() {
    if (confirm('¿Estás seguro de que deseas vaciar toda la baraja de tarjetas? Esta acción no se puede deshacer.')) {
      this.saveFlashcardsToStorage([]);
      if (this.dom.fileStatusText) {
        this.dom.fileStatusText.textContent = 'Genera tarjetas de estudio automáticas desde tus lecturas';
        this.dom.fileStatusText.style.color = 'var(--text-muted)';
      }
      if (this.dom.btnGenerateAI) {
        this.dom.btnGenerateAI.disabled = true;
        this.dom.btnGenerateAI.style.opacity = '0.6';
      }
      this.selectedPdfFile = null;
    }
  }

  // Renderizar la tarjeta activa o el estado vacío
  renderCurrentCard() {
    const hasCards = Array.isArray(this.cards) && this.cards.length > 0;

    if (!hasCards) {
      if (this.dom.viewerContainer) this.dom.viewerContainer.style.display = 'none';
      if (this.dom.emptyState) this.dom.emptyState.style.display = 'block';
      return;
    }

    if (this.dom.emptyState) this.dom.emptyState.style.display = 'none';
    if (this.dom.viewerContainer) this.dom.viewerContainer.style.display = 'block';

    this.showCard(this.currentIndex);
  }

  // Alias para compatibilidad
  render() {
    this.renderCurrentCard();
  }

  renderDeckChips() {
    // Compatibilidad
  }

  showCard(index) {
    if (this.cards.length === 0) return;

    if (index >= this.cards.length) index = 0;
    if (index < 0) index = this.cards.length - 1;

    this.currentIndex = index;
    const card = this.cards[this.currentIndex];

    // Asegurar que inicie siempre del frente (no volteada)
    if (this.dom.cardWrapper) {
      this.dom.cardWrapper.classList.remove('flipped');
    }

    if (this.dom.questionText) {
      this.dom.questionText.textContent = card.pregunta || card.question || '';
    }

    if (this.dom.answerText) {
      this.dom.answerText.textContent = card.respuesta || card.answer || '';
    }

    if (this.dom.counterText) {
      this.dom.counterText.textContent = `${this.currentIndex + 1} / ${this.cards.length}`;
    }
  }

  attachEvents() {
    // 1. Volteo de la tarjeta 3D
    if (this.dom.cardWrapper) {
      this.dom.cardWrapper.addEventListener('click', () => {
        this.dom.cardWrapper.classList.toggle('flipped');
      });
    }

    // 2. Botones de calificación (avanzan a la siguiente)
    this.dom.gradeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.gradeCurrentCard();
      });
    });

    // 3. Botón para eliminar tarjeta individual
    if (this.dom.btnDeleteCard) {
      this.dom.btnDeleteCard.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteCurrentCard();
      });
    }

    // 4. Botón para borrar/vaciar toda la baraja con confirmación
    if (this.dom.btnClearDeck) {
      this.dom.btnClearDeck.addEventListener('click', (e) => {
        e.stopPropagation();
        this.clearDeck();
      });
    }

    // 4. Selección y Drag & Drop de PDF
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

    // 5. Botón Generar con IA
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
      this.dom.fileStatusText.textContent = `📄 ${file.name} (${sizeKb} KB) listo para procesar`;
      this.dom.fileStatusText.style.color = '#38bdf8';
    }
    if (this.dom.btnGenerateAI) {
      this.dom.btnGenerateAI.disabled = false;
      this.dom.btnGenerateAI.style.opacity = '1';
    }
  }

  gradeCurrentCard() {
    if (this.cards.length === 0) return;
    setTimeout(() => {
      this.showCard(this.currentIndex + 1);
    }, 120);
  }

  // ========================================================================
  // GENERACIÓN AUTOMÁTICA DE FLASHCARDS CON GEMINI AI Y PDF.JS
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

      // 1. Extraer texto del PDF (máx. 3 páginas para procesamiento ultrarrápido)
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const arrayBuffer = await this.selectedPdfFile.arrayBuffer();
      const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      let fullText = '';
      const pagesToRead = pdf.numPages > 4 ? 3 : Math.min(pdf.numPages, 4);

      for (let pageNum = 1; pageNum <= pagesToRead; pageNum++) {
        this.setAIStatus(true, `Leyendo página ${pageNum} de ${pagesToRead}...`);
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        if (pageText.trim()) fullText += `\n${pageText}\n`;
      }

      // 2. Limpieza y recorte seguro a 4,500 caracteres (máx. velocidad de inferencia)
      const cleanText = fullText.slice(0, 4500).replace(/[\u0000-\u001F\u007F-\u009F]/g, "");

      if (!cleanText.trim()) {
        throw new Error('El PDF no contiene texto legible (posible documento escaneado solo con imágenes).');
      }

      // 3. Consulta directa a Gemini con configuración de alta velocidad
      this.setAIStatus(true, 'Generando tarjetas ultrarrápidas con IA...');

      const promptInstructions = `
Actúa como profesor y diseñador experto de tarjetas mnemotécnicas (flashcards).
A partir del siguiente texto de estudio, genera entre 5 y 8 flashcards concisas y de alta calidad con preguntas directas y respuestas cortas (máximo 2 líneas por respuesta).

Cada flashcard debe tener:
- "pregunta": Pregunta clara, concepto o término clave.
- "respuesta": Explicación concisa, directa y fácil de recordar.

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
          temperature: 0.2,            // Menor dispersión, generación mucho más rápida y directa
          maxOutputTokens: 1200,       // Evita respuestas sobrecargadas
          responseMimeType: "application/json"
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
          console.warn('[Gemini Flashcards] Probando gemini-flash-latest...');
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
        else throw new Error('No se pudo interpretar el formato JSON devuelto por la IA.');
      }

      if (!Array.isArray(generatedCards) || generatedCards.length === 0) {
        throw new Error('La IA no devolvió tarjetas válidas para este documento.');
      }

      // 4. Normalizar y guardar las nuevas tarjetas
      const validCards = generatedCards
        .map((c, i) => ({
          id: 'fc-ai-' + Date.now() + '-' + i,
          pregunta: (c.pregunta || c.question || c.concepto || '').trim(),
          respuesta: (c.respuesta || c.answer || c.definicion || '').trim()
        }))
        .filter(c => c.pregunta && c.respuesta);

      if (validCards.length === 0) {
        throw new Error('Las tarjetas devueltas no tienen el formato requerido.');
      }

      // Guardar de forma permanente y blindada en 'appestudio_saved_flashcards'
      this.saveFlashcardsToStorage(validCards);
      this.currentIndex = 0;
      this.renderCurrentCard();

      if (window.appInstance) {
        window.appInstance.renderDashboard();
      }

      alert(`🎉 ¡Éxito! Se han creado ${validCards.length} flashcards con IA.`);

    } catch (err) {
      console.error(err);
      this.showError(err.message || 'Error al generar flashcards.');
    } finally {
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
}

// Inicialización automática e inmediata en DOMContentLoaded
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (!window.flashcardsCtrl) {
        window.flashcardsCtrl = new FlashcardsController();
      }
    });
  } else {
    if (!window.flashcardsCtrl) {
      window.flashcardsCtrl = new FlashcardsController();
    }
  }
}
