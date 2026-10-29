// ==========================================================================
// MÓDULO EXCLUSIVO: FLASHCARDS CON GENERADOR AUTOMÁTICO DE IA (PDF + GEMINI)
// ==========================================================================

// Clave API de Gemini fija en el código
const GEMINI_API_KEY = "AQ" + ".Ab8RN6K96o_9-AjlAR7ZIpZCHgpvXVPw8QYqUqU0YIfE-Q4Ayg";
const FLASHCARDS_STORAGE_KEY = 'flashcards_data';

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
      btnClearDeck: document.getElementById('btn-clear-deck'),
      gradeButtons: document.querySelectorAll('.grade-btn')
    };

    this.init();
  }

  init() {
    this.loadCards();
    this.attachEvents();
  }

  loadCards() {
    try {
      const raw = localStorage.getItem(FLASHCARDS_STORAGE_KEY);
      this.cards = raw ? JSON.parse(raw) : [];
    } catch (e) {
      this.cards = [];
    }
    this.currentIndex = 0;
    this.render();
  }

  renderDeckChips() {
    // Compatibilidad
  }

  saveCards(cards) {
    this.cards = cards;
    localStorage.setItem(FLASHCARDS_STORAGE_KEY, JSON.stringify(cards));
    if (window.appStorage) {
      window.appStorage.save('estudio_flashcards_v1', cards);
    }
    this.render();
  }

  clearDeck() {
    if (confirm('¿Estás seguro de que deseas vaciar la baraja actual para estudiar un nuevo tema?')) {
      this.saveCards([]);
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

  render() {
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

    // 3. Botón para borrar/reiniciar baraja
    if (this.dom.btnClearDeck) {
      this.dom.btnClearDeck.addEventListener('click', () => {
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

      // 1. Extraer texto del PDF (máx. 8 páginas)
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

      // 3. Consulta directa a Gemini
      this.setAIStatus(true, 'Generando tarjetas con IA...');

      const promptInstructions = `
Actúa como un profesor y diseñador experto de tarjetas de estudio mnemotécnicas (flashcards).
A partir del siguiente texto de estudio, genera entre 6 y 12 flashcards de alta calidad que cubran los conceptos, definiciones, fórmulas y datos clave más importantes para memorizar.

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

      // Guardar reemplazando la baraja por la nueva
      this.saveCards(validCards);
      this.currentIndex = 0;
      this.showCard(0);

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
