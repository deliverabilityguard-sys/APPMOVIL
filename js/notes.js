// ==========================================================================
// MÓDULO DE APUNTES INTELIGENTES Y MAPAS MENTALES CON IA
// Procesamiento client-side con PDF.js + Google Gemini 1.5 Flash
// Renderizado dual: Marked.js (Markdown) y Mermaid.js (SVG Mindmap)
// ==========================================================================

// Clave API de Gemini integrada directamente en el cliente
const GEMINI_API_KEY = atob("QVEuQWI4Uk42Szk2b185LUFqbEFSN1pJcFpDSGdwdlhWUHc4UVlxVXFVMFlJZkUtUTRBeWc=");

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
    // 1. Selección y Drag & Drop de PDF
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

    // 2. Disparar generación con IA
    if (this.dom.btnGenerate) {
      this.dom.btnGenerate.addEventListener('click', () => {
        this.processDocumentWithAI();
      });
    }

    // 3. Alternar pestañas de visualización (Markdown vs Mapa Mental)
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

    // 4. Copiar apuntes en Markdown
    if (this.dom.btnCopyMarkdown) {
      this.dom.btnCopyMarkdown.addEventListener('click', () => {
        if (!this.currentResult) return;
        navigator.clipboard.writeText(this.currentResult.apuntes)
          .then(() => alert('📋 ¡Apuntes en Markdown copiados al portapapeles!'))
          .catch(() => alert('No se pudo copiar automáticamente.'));
      });
    }

    // 5. Descargar archivo .md
    if (this.dom.btnDownloadMarkdown) {
      this.dom.btnDownloadMarkdown.addEventListener('click', () => {
        if (!this.currentResult) return;
        const blob = new Blob([this.currentResult.apuntes], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `apuntes-ia-${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    // 6. Guardar en historial local
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
    if (this.dom.pdfFileInfo) {
      this.dom.pdfFileInfo.style.display = 'flex';
    }
    if (this.dom.btnGenerate) {
      this.dom.btnGenerate.disabled = false;
      this.dom.btnGenerate.style.opacity = '1';
    }
  }

  // ========================================================================
  // PASO 1: Extracción de Texto de PDF en el Cliente con PDF.js
  // ========================================================================
  async extractTextFromPDF(file) {
    if (!window.pdfjsLib) {
      throw new Error('La librería PDF.js no se cargó correctamente. Verifica tu conexión.');
    }

    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    this.setStatus(true, 'Extrayendo PDF...', false);

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';
    const totalPages = pdf.numPages;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      this.setStatus(true, `Extrayendo PDF (página ${pageNum} de ${totalPages})...`, false);
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      if (pageText.trim()) {
        fullText += `\n[Página ${pageNum}]\n${pageText}\n`;
      }
    }

    if (!fullText.trim()) {
      throw new Error('El PDF no contiene texto legible (podría ser un documento escaneado solo con imágenes).');
    }

    return fullText;
  }

  // ========================================================================
  // PASO 2: Procesamiento con Gemini 1.5 Flash (Formato JSON Estricto)
  // ========================================================================
  async processDocumentWithAI() {
    this.clearErrors();

    if (!this.selectedFile) {
      this.showError('Por favor selecciona un archivo PDF primero.');
      return;
    }

    try {
      // 1. Extracción en el navegador
      const pdfText = await this.extractTextFromPDF(this.selectedFile);

      // Limitar a ~35,000 caracteres para análisis óptimo y rápido
      const trimmedText = pdfText.length > 35000 
        ? pdfText.substring(0, 35000) + '\n...[Texto truncado para análisis]'
        : pdfText;

      // 2. Consulta a Gemini
      this.setStatus(true, 'Generando con IA...', false);

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

      const promptInstructions = `
Actúa como un profesor universitario y sintetizador académico de élite.
A partir del siguiente texto extraído de un documento de estudio, genera:

1. "apuntes": Un resumen de estudio completo, estructurado y de alto impacto en Markdown. Debe contener:
   - Resumen ejecutivo conciso.
   - Conceptos y definiciones clave en **negrita**.
   - Fórmulas, principios o datos críticos estructurados.
   - Lista de preguntas o puntos clave de autoevaluación.

2. "mapa_mental": Una representación gráfica del tema usando la sintaxis de Mermaid.js de tipo "mindmap".
   Reglas para Mermaid mindmap:
   - Debe iniciar obligatoriamente con la palabra "mindmap".
   - La raíz debe ser breve: "  root((Tema Central))"
   - Las ramas usan sangría de 2 o 4 espacios consistentes.
   - EVITA caracteres conflictivos dentro del texto de los nodos como comillas dobles o paréntesis anidados.
   Ejemplo:
   mindmap
     root((Biologia Celular))
       Membrana Plasmatica
         Bicapa Lipidica
         Transporte Celular
       Nucleo
         ADN y Cromatina
         Nucléolo

IMPORTANTE: Responde ÚNICAMENTE un objeto JSON válido con las claves "apuntes" y "mapa_mental". No agregues bloques de código markdown ni texto introductorio.

Texto del documento:
${trimmedText}
      `;

      const requestBody = {
        contents: [
          {
            parts: [{ text: promptInstructions }]
          }
        ],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.3
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(`Error en la API de Gemini: ${msg}`);
      }

      const data = await response.json();
      const rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawOutput) {
        throw new Error('La API de Gemini no devolvió respuesta.');
      }

      // 3. Parsear JSON
      let parsed;
      try {
        parsed = JSON.parse(rawOutput);
      } catch (e) {
        const match = rawOutput.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error('No se pudo interpretar el formato estructurado de la IA.');
        }
      }

      this.currentResult = parsed;

      // 4. Renderizar resultados
      this.setStatus(true, 'Renderizando apuntes y mapa mental...', false);
      await this.renderOutput(parsed);
      this.setStatus(false, '', true);

    } catch (err) {
      console.error(err);
      this.setStatus(false, '', false);
      this.showError(err.message || 'Ocurrió un error inesperado al procesar el archivo.');
    }
  }

  // ========================================================================
  // PASO 3: Renderizado de Markdown (Marked) y Mapa Mental SVG (Mermaid)
  // ========================================================================
  async renderOutput(result) {
    if (!this.dom.resultsContainer) return;
    this.dom.resultsContainer.style.display = 'block';

    // 1. Render Markdown con Marked.js
    if (this.dom.markdownRendered && window.marked) {
      this.dom.markdownRendered.innerHTML = window.marked.parse(result.apuntes || 'Sin apuntes');
    }

    // 2. Render Mapa Mental con Mermaid.js
    if (this.dom.mindmapRendered && window.mermaid) {
      try {
        this.dom.mindmapRendered.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">Generando mapa visual...</div>';
        
        let cleanMermaid = (result.mapa_mental || '').trim();
        if (cleanMermaid.startsWith('```mermaid')) cleanMermaid = cleanMermaid.replace(/^```mermaid/, '');
        if (cleanMermaid.startsWith('```')) cleanMermaid = cleanMermaid.replace(/^```/, '');
        if (cleanMermaid.endsWith('```')) cleanMermaid = cleanMermaid.replace(/```$/, '');
        cleanMermaid = cleanMermaid.trim();

        const uniqueId = 'mindmap-' + Date.now();
        const { svg } = await window.mermaid.render(uniqueId, cleanMermaid);
        this.dom.mindmapRendered.innerHTML = svg;
      } catch (mermaidError) {
        console.warn('Error renderizando Mermaid:', mermaidError);
        this.dom.mindmapRendered.innerHTML = `
          <div style="padding: 16px; background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.3); border-radius: 12px; color: #f87171; font-size: 0.85rem;">
            ⚠️ El mapa mental tuvo una estructura compleja. Sintaxis generada:
            <pre style="margin-top: 8px; color: #cbd5e1; font-size: 0.75rem; white-space: pre-wrap; overflow-x: auto;">${this.escapeHtml(result.mapa_mental)}</pre>
          </div>
        `;
      }
    }

    this.dom.resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Historial en LocalStorage
  saveCurrentNoteToHistory() {
    if (!this.currentResult) return;
    const history = this.getHistory();
    const titleMatch = this.currentResult.apuntes.match(/^#\s+(.*)/m);
    const title = titleMatch ? titleMatch[1].replace(/[*_]/g, '') : (this.selectedFile?.name || 'Apunte de Estudio');

    const item = {
      id: 'note-' + Date.now(),
      title: title.substring(0, 50),
      fileName: this.selectedFile?.name || 'Documento',
      date: new Date().toLocaleDateString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      apuntes: this.currentResult.apuntes,
      mapa_mental: this.currentResult.mapa_mental
    };

    history.unshift(item);
    localStorage.setItem(this.notesHistoryStorageKey, JSON.stringify(history.slice(0, 10)));
    this.renderHistory();
    alert('💾 ¡Apunte guardado en tu historial local!');
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
      this.dom.historyList.innerHTML = `<p style="font-size: 0.82rem; color: var(--text-muted); text-align: center; padding: 12px 0;">No tienes apuntes guardados aún.</p>`;
      return;
    }

    this.dom.historyList.innerHTML = history.map(item => `
      <div class="note-history-item" data-id="${item.id}" style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface); border: 1px solid var(--border-subtle); padding: 10px 14px; border-radius: var(--radius-md); margin-bottom: 8px; cursor: pointer; transition: all 0.2s;">
        <div>
          <div style="font-size: 0.9rem; font-weight: 600; color: #f1f5f9;">${this.escapeHtml(item.title)}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${item.fileName} • ${item.date}</div>
        </div>
        <button class="btn-del" data-action="delete-note" title="Eliminar" style="padding: 4px;">✕</button>
      </div>
    `).join('');

    this.dom.historyList.querySelectorAll('.note-history-item').forEach(el => {
      const id = el.dataset.id;
      el.addEventListener('click', (e) => {
        if (e.target.dataset.action === 'delete-note') {
          e.stopPropagation();
          this.deleteHistoryItem(id);
          return;
        }
        const found = history.find(h => h.id === id);
        if (found) {
          this.currentResult = found;
          this.renderOutput(found);
        }
      });
    });
  }

  deleteHistoryItem(id) {
    let history = this.getHistory().filter(h => h.id !== id);
    localStorage.setItem(this.notesHistoryStorageKey, JSON.stringify(history));
    this.renderHistory();
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
      setTimeout(() => {
        this.dom.statusContainer.style.display = 'none';
      }, 3000);
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
