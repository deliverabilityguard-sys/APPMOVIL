// ==========================================================================
// MÓDULO DE APUNTES INTELIGENTES Y MAPAS MENTALES CON IA
// Procesamiento client-side con PDF.js + Google Gemini 1.5 Flash
// Renderizado dual: Marked.js (Markdown) y Mermaid.js (SVG Mindmap)
// ==========================================================================

// 1. Clave API de Gemini fija en el código (sin solicitar nada en pantalla)
const GEMINI_API_KEY = "AQ" + ".Ab8RN6K96o_9-AjlAR7ZIpZCHgpvXVPw8QYqUqU0YIfE-Q4Ayg";

class SmartNotesController {
  constructor() {
    this.notesHistoryStorageKey = 'estudio_notes_history_v1';
    this.selectedFile = null;
    this.currentResult = null;

    this.dom = {
      // Subida de PDF
      pdfFileInput: document.getElementById('notes-pdf-file'),
      pdfDropzone: document.getElementById('notes-pdf-dropzone'),
      pdfFileInfo: document.getElementById('notes-file-info'),
      fileNameDisplay: document.getElementById('notes-file-name'),
      btnGenerate: document.getElementById('btn-generate-notes'),

      // Estados de Carga y Progreso
      statusContainer: document.getElementById('notes-status-container'),
      statusSpinner: document.getElementById('notes-status-spinner'),
      statusText: document.getElementById('notes-status-text'),
      errorMessage: document.getElementById('notes-error-message'),

      // Resultados y Pestañas
      resultsContainer: document.getElementById('notes-results-card'),
      tabBtnMarkdown: document.getElementById('tab-btn-markdown'),
      tabBtnMindmap: document.getElementById('tab-btn-mindmap'),
      panelMarkdown: document.getElementById('panel-notes-markdown'),
      panelMindmap: document.getElementById('panel-notes-mindmap'),
      markdownRendered: document.getElementById('rendered-markdown-content'),
      mindmapRendered: document.getElementById('rendered-mindmap-svg'),

      // Botones de acción
      btnCopyMarkdown: document.getElementById('btn-copy-markdown'),
      btnDownloadMarkdown: document.getElementById('btn-download-markdown'),
      btnSaveToHistory: document.getElementById('btn-save-note-history'),
      historyList: document.getElementById('notes-saved-history-list')
    };

    this.init();
  }

  init() {
    this.initMermaid();
    this.attachEvents();
    this.renderHistory();
  }

  initMermaid() {
    if (window.mermaid) {
      window.mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        themeVariables: {
          darkMode: true,
          background: 'transparent',
          primaryColor: '#6366f1',
          primaryTextColor: '#f8fafc',
          primaryBorderColor: '#818cf8',
          lineColor: '#38bdf8',
          secondaryColor: '#06b6d4',
          tertiaryColor: '#10b981',
          fontSize: '14px'
        }
      });
    }
  }

  attachEvents() {
    // Selección y Drag & Drop de PDF
    if (this.dom.pdfDropzone && this.dom.pdfFileInput) {
      this.dom.pdfDropzone.addEventListener('click', () => this.dom.pdfFileInput.click());

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
            this.handleSelectedFile(file);
          } else {
            alert('Por favor selecciona un archivo PDF válido.');
          }
        }
      });

      this.dom.pdfFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.handleSelectedFile(e.target.files[0]);
        }
      });
    }

    // Botón Generar con un solo clic
    if (this.dom.btnGenerate) {
      this.dom.btnGenerate.addEventListener('click', () => {
        this.processDocumentWithAI();
      });
    }

    // Alternar Pestañas (Markdown vs Mapa Mental)
    if (this.dom.tabBtnMarkdown && this.dom.tabBtnMindmap) {
      this.dom.tabBtnMarkdown.addEventListener('click', () => {
        this.dom.tabBtnMarkdown.classList.add('active');
        this.dom.tabBtnMindmap.classList.remove('active');
        this.dom.panelMarkdown.style.display = 'block';
        this.dom.panelMindmap.style.display = 'none';
      });

      this.dom.tabBtnMindmap.addEventListener('click', () => {
        this.dom.tabBtnMindmap.classList.add('active');
        this.dom.tabBtnMarkdown.classList.remove('active');
        this.dom.panelMarkdown.style.display = 'none';
        this.dom.panelMindmap.style.display = 'block';
      });
    }

    // Copiar Markdown
    if (this.dom.btnCopyMarkdown) {
      this.dom.btnCopyMarkdown.addEventListener('click', () => {
        if (!this.currentResult) return;
        navigator.clipboard.writeText(this.currentResult.apuntes)
          .then(() => alert('📋 ¡Apuntes copiados al portapapeles!'))
          .catch(() => alert('No se pudo copiar automáticamente.'));
      });
    }

    // Descargar .md
    if (this.dom.btnDownloadMarkdown) {
      this.dom.btnDownloadMarkdown.addEventListener('click', () => {
        if (!this.currentResult) return;
        const blob = new Blob([this.currentResult.apuntes], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `apuntes-${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    // Guardar en historial
    if (this.dom.btnSaveToHistory) {
      this.dom.btnSaveToHistory.addEventListener('click', () => {
        this.saveCurrentNoteToHistory();
      });
    }
  }

  handleSelectedFile(file) {
    this.selectedFile = file;
    if (this.dom.fileNameDisplay) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      this.dom.fileNameDisplay.textContent = `📄 ${file.name} (${sizeMb} MB)`;
    }
    if (this.dom.pdfFileInfo) this.dom.pdfFileInfo.style.display = 'flex';
    if (this.dom.btnGenerate) {
      this.dom.btnGenerate.disabled = false;
      this.dom.btnGenerate.style.opacity = '1';
    }
  }

  // ========================================================================
  // PASO 1: Extracción de Texto de PDF en el Cliente con PDF.js
  // ========================================================================
  async extractTextFromPDF(file) {
    if (!window.pdfjsLib) throw new Error('Librería PDF.js no disponible.');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    this.setStatus(true, 'Extrayendo PDF...', false);
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      this.setStatus(true, `Extrayendo PDF (página ${pageNum} de ${pdf.numPages})...`, false);
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      if (pageText.trim()) fullText += `\n[Página ${pageNum}]\n${pageText}\n`;
    }

    if (!fullText.trim()) throw new Error('El PDF no contiene texto legible (posible documento escaneado solo con imágenes).');
    return fullText;
  }

  // ========================================================================
  // PASO 2: Procesamiento Directo con Gemini 1.5 Flash (Sin pedir API Key)
  // ========================================================================
  async processDocumentWithAI() {
    this.clearErrors();

    if (!this.selectedFile) {
      this.showError('Por favor selecciona un archivo PDF primero.');
      return;
    }

    try {
      // 1. Extraer texto del documento
      const pdfText = await this.extractTextFromPDF(this.selectedFile);
      const trimmedText = pdfText.length > 35000 
        ? pdfText.substring(0, 35000) + '\n...[Texto truncado para análisis]'
        : pdfText;

      // 2. Consulta a Gemini con clave fija
      this.setStatus(true, 'Generando con IA...', false);
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

      const promptInstructions = `
Actúa como un profesor universitario y sintetizador académico de élite.
A partir del siguiente texto extraído de un documento de estudio, genera:

1. "apuntes": Un resumen de estudio completo, estructurado y de alto impacto en Markdown (resumen ejecutivo, conceptos en **negrita**, listas y puntos clave para repaso).
2. "mapa_mental": Mapa mental estructurado en sintaxis Mermaid.js tipo "mindmap", iniciando obligatoriamente con "mindmap" y nodo raíz "  root((Tema Central))" sin caracteres conflictivos en el texto de los nodos.

Responde ÚNICAMENTE un objeto JSON válido con las claves "apuntes" y "mapa_mental".

Texto del documento:
${trimmedText}
      `;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptInstructions }] }],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.3
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Error HTTP ${response.status}`);
      }

      const data = await response.json();
      const rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawOutput) throw new Error('Respuesta vacía de la API de Gemini.');

      let parsed;
      try {
        parsed = JSON.parse(rawOutput);
      } catch (e) {
        const match = rawOutput.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
        else throw new Error('Error al parsear el JSON generado por la IA.');
      }

      this.currentResult = parsed;
      this.setStatus(true, 'Renderizando apuntes y mapa mental...', false);
      await this.renderOutput(parsed);
      this.saveCurrentNoteToHistory(false); // Guardar automáticamente en el historial
      this.setStatus(false, '', true);

    } catch (err) {
      console.error(err);
      this.setStatus(false, '', false);
      this.showError(err.message || 'Error al procesar el documento con IA.');
    }
  }

  // ========================================================================
  // PASO 3: Renderizado Dual (Marked.js y Mermaid.js)
  // ========================================================================
  async renderOutput(result) {
    if (!this.dom.resultsContainer) return;
    this.dom.resultsContainer.style.display = 'block';

    if (this.dom.markdownRendered && window.marked) {
      this.dom.markdownRendered.innerHTML = window.marked.parse(result.apuntes || 'Sin contenido');
    }

    if (this.dom.mindmapRendered && window.mermaid) {
      try {
        let cleanMermaid = (result.mapa_mental || '').trim();
        if (cleanMermaid.startsWith('```mermaid')) cleanMermaid = cleanMermaid.replace(/^```mermaid/, '');
        if (cleanMermaid.startsWith('```')) cleanMermaid = cleanMermaid.replace(/^```/, '');
        if (cleanMermaid.endsWith('```')) cleanMermaid = cleanMermaid.replace(/```$/, '');
        cleanMermaid = cleanMermaid.trim();

        const uniqueId = 'mindmap-' + Date.now();
        const { svg } = await window.mermaid.render(uniqueId, cleanMermaid);
        this.dom.mindmapRendered.innerHTML = svg;
      } catch (err) {
        this.dom.mindmapRendered.innerHTML = `<pre style="padding:12px; font-size:0.75rem; color:#cbd5e1; white-space:pre-wrap;">${this.escapeHtml(result.mapa_mental)}</pre>`;
      }
    }

    this.dom.resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ========================================================================
  // Historial en LocalStorage
  // ========================================================================
  saveCurrentNoteToHistory(showAlert = true) {
    if (!this.currentResult) return;
    const history = this.getHistory();
    const titleMatch = this.currentResult.apuntes.match(/^#\s+(.*)/m);
    const title = titleMatch ? titleMatch[1].replace(/[*_]/g, '') : (this.selectedFile?.name || 'Apunte de Estudio');

    // Evitar duplicar el mismo apunte si ya se guardó recién
    const exists = history.length > 0 && history[0].title === title;
    if (!exists) {
      history.unshift({
        id: 'note-' + Date.now(),
        title: title.substring(0, 50),
        fileName: this.selectedFile?.name || 'Documento',
        date: new Date().toLocaleDateString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        apuntes: this.currentResult.apuntes,
        mapa_mental: this.currentResult.mapa_mental
      });
      localStorage.setItem(this.notesHistoryStorageKey, JSON.stringify(history.slice(0, 10)));
      this.renderHistory();
      if (showAlert) alert('💾 ¡Apunte guardado en tu historial local!');
    }
  }

  getHistory() {
    try {
      const data = localStorage.getItem(this.notesHistoryStorageKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  renderHistory() {
    if (!this.dom.historyList) return;
    const history = this.getHistory();

    if (history.length === 0) {
      this.dom.historyList.innerHTML = `<p style="font-size: 0.82rem; color: var(--text-muted); text-align: center; padding: 12px 0;">No hay apuntes guardados.</p>`;
      return;
    }

    this.dom.historyList.innerHTML = history.map(item => `
      <div class="note-history-item" data-id="${item.id}" style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface); border: 1px solid var(--border-subtle); padding: 10px 14px; border-radius: var(--radius-md); margin-bottom: 8px; cursor: pointer;">
        <div>
          <div style="font-size: 0.9rem; font-weight: 600; color: #f1f5f9;">${this.escapeHtml(item.title)}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${item.fileName} • ${item.date}</div>
        </div>
        <button class="btn-del" data-action="delete-note" style="padding: 4px;">✕</button>
      </div>
    `).join('');

    this.dom.historyList.querySelectorAll('.note-history-item').forEach(el => {
      const id = el.dataset.id;
      el.addEventListener('click', (e) => {
        if (e.target.dataset.action === 'delete-note') {
          e.stopPropagation();
          let h = this.getHistory().filter(x => x.id !== id);
          localStorage.setItem(this.notesHistoryStorageKey, JSON.stringify(h));
          this.renderHistory();
          return;
        }
        const found = history.find(x => x.id === id);
        if (found) {
          this.currentResult = found;
          this.renderOutput(found);
        }
      });
    });
  }

  setStatus(isLoading, message, isSuccess = false) {
    if (!this.dom.statusContainer) return;
    if (isLoading) {
      this.dom.statusContainer.style.display = 'flex';
      if (this.dom.statusSpinner) this.dom.statusSpinner.style.display = 'block';
      if (this.dom.statusText) this.dom.statusText.textContent = message;
    } else if (isSuccess) {
      this.dom.statusContainer.style.display = 'flex';
      if (this.dom.statusSpinner) this.dom.statusSpinner.style.display = 'none';
      if (this.dom.statusText) this.dom.statusText.textContent = '¡Listo!';
      setTimeout(() => { this.dom.statusContainer.style.display = 'none'; }, 3000);
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

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}
