// ==========================================================================
// MÓDULO 2: "CHEF FORÁNEO" — GENERADOR DE RECETAS & ESCÁNER DE DESPENSA CON IA
// Conexión directa ultrarrápida a Google Gemini API (Multimodal Vision + Text)
// Persistencia de favoritas en localStorage ('saved_recipes')
// ==========================================================================

const GEMINI_API_KEY = "AQ" + ".Ab8RN6K96o_9-AjlAR7ZIpZCHgpvXVPw8QYqUqU0YIfE-Q4Ayg";
const RECIPES_STORAGE_KEY = 'saved_recipes';

class ChefForaneo {
  constructor() {
    this.selectedIngredients = new Set(['Arroz', 'Huevos', 'Tomate']);
    this.currentRecipe = null;
    this.mediaStream = null;
    this.cameraFacing = 'environment'; // Cámara trasera por defecto en móviles

    this.attachEvents();
    this.renderSelectedCount();
    this.renderSavedRecipes();
  }

  toggleIngredient(name) {
    if (this.selectedIngredients.has(name)) {
      this.selectedIngredients.delete(name);
    } else {
      this.selectedIngredients.add(name);
    }
    this.renderSelectedCount();
  }

  renderSelectedCount() {
    const elCount = document.getElementById('chef-selected-count');
    const btnGenerate = document.getElementById('btn-generate-recipe');
    const count = this.selectedIngredients.size;

    if (elCount) {
      elCount.textContent = `${count} seleccionado${count === 1 ? '' : 's'}`;
    }

    if (btnGenerate) {
      btnGenerate.disabled = count === 0;
    }
  }

  // ========================================================================
  // ESCÁNER DE DESPENSA / NEVERA — VISIÓN MULTIMODAL GEMINI
  // ========================================================================

  async openScanner() {
    const modal = document.getElementById('modal-fridge-scanner');
    if (!modal) return;
    modal.classList.add('open');
    await this.startCamera();
  }

  closeScanner() {
    this.stopCamera();
    const modal = document.getElementById('modal-fridge-scanner');
    const overlay = document.getElementById('scanner-processing-overlay');
    if (modal) modal.classList.remove('open');
    if (overlay) overlay.style.display = 'none';
  }

  async startCamera() {
    this.stopCamera();
    const video = document.getElementById('scanner-video');
    if (!video) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('[Escáner] getUserMedia no soportado, activando selector nativo.');
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: this.cameraFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = this.mediaStream;
      await video.play();
    } catch (err) {
      console.warn('[Escáner] No se pudo acceder a la cámara continua:', err);
      // Fallback amigable: permitir tomar foto nativa con el input
    }
  }

  stopCamera() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    const video = document.getElementById('scanner-video');
    if (video) video.srcObject = null;
  }

  async switchCamera() {
    this.cameraFacing = this.cameraFacing === 'environment' ? 'user' : 'environment';
    await this.startCamera();
  }

  // Capturar fotograma actual del <video> y procesar con IA
  captureFrameFromVideo() {
    const video = document.getElementById('scanner-video');
    const canvas = document.getElementById('scanner-canvas');

    if (!video || !canvas || !video.videoWidth) {
      // Si la cámara en vivo no está activa, abrir el input de captura nativa
      const inputFallback = document.getElementById('scanner-file-fallback');
      if (inputFallback) inputFallback.click();
      return;
    }

    // Redimensionar respetando aspecto (máx. 1024px para compresión ultrarrápida en móviles)
    const maxDimension = 1024;
    let width = video.videoWidth;
    let height = video.videoHeight;

    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);

    // Obtener Base64 JPEG comprimido (calidad 0.8)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const base64Data = dataUrl.split(',')[1];

    if (base64Data) {
      this.analyzeFridgeImageWithAI(base64Data);
    }
  }

  // Procesar imagen subida desde galería o cámara nativa
  processUploadedImageFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.getElementById('scanner-canvas') || document.createElement('canvas');
        const maxDimension = 1024;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64Data = dataUrl.split(',')[1];
        if (base64Data) {
          this.analyzeFridgeImageWithAI(base64Data);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Llamada a la API de Visión Multimodal de Gemini
  async analyzeFridgeImageWithAI(base64JpegData) {
    const processingOverlay = document.getElementById('scanner-processing-overlay');
    if (processingOverlay) processingOverlay.style.display = 'flex';

    try {
      const promptText = `
Analiza esta imagen de una nevera/alacena e identifica todos los ingredientes y alimentos visibles que puedan servir para cocinar. Devuelve únicamente un arreglo JSON de strings con los nombres de los ingredientes en español, sin preámbulos ni markdown: ["huevos", "tomate", "cebolla", "leche", ...]. Sé preciso, solo incluye lo que realmente se observe con alta probabilidad.
      `.trim();

      const requestPayload = {
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64JpegData
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 600,
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
          response = await fetch(fallbackUrl, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestPayload)
          });
        }
      } catch (fetchErr) {
        throw new Error('Error al conectar con la IA de Google. Verifica tu conexión de red.');
      }

      if (!response.ok) {
        throw new Error(`Error en el servicio de visión (${response.status})`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('No se detectaron alimentos claros en la foto.');

      let detectedIngredients = [];
      try {
        detectedIngredients = JSON.parse(rawText);
      } catch (e) {
        const match = rawText.match(/\[[\s\S]*\]/);
        if (match) detectedIngredients = JSON.parse(match[0]);
        else throw new Error('Formato de respuesta no reconocido.');
      }

      if (!Array.isArray(detectedIngredients) || detectedIngredients.length === 0) {
        throw new Error('No se lograron identificar ingredientes claros. Intenta con más iluminación.');
      }

      // Procesar e integrar ingredientes a la despensa del usuario
      this.applyDetectedIngredients(detectedIngredients);

    } catch (err) {
      console.error(err);
      alert(err.message || 'No se pudieron detectar ingredientes. Intenta con otra foto.');
    } finally {
      if (processingOverlay) processingOverlay.style.display = 'none';
      this.closeScanner();
    }
  }

  // Aplicar los ingredientes detectados a la interfaz
  applyDetectedIngredients(items) {
    const grid = document.querySelector('.ingredient-chips-grid');
    const btnAddCustom = document.getElementById('btn-add-custom-ingredient');
    const newlyAdded = [];

    items.forEach(rawItem => {
      if (typeof rawItem !== 'string') return;
      const cleanName = rawItem.trim().charAt(0).toUpperCase() + rawItem.trim().slice(1).toLowerCase();
      if (!cleanName) return;

      // Buscar si el chip ya existe en la cuadrícula
      const existingChip = Array.from(document.querySelectorAll('.chip-ingredient[data-ingredient]')).find(
        btn => (btn.dataset.ingredient || '').toLowerCase() === cleanName.toLowerCase()
      );

      if (existingChip) {
        const standardName = existingChip.dataset.ingredient;
        this.selectedIngredients.add(standardName);
        existingChip.classList.add('active');
        newlyAdded.push(standardName);
      } else {
        // Si no existe, crearlo dinámicamente
        this.selectedIngredients.add(cleanName);
        newlyAdded.push(cleanName);

        if (grid && btnAddCustom) {
          const newChip = document.createElement('button');
          newChip.type = 'button';
          newChip.className = 'chip-ingredient active';
          newChip.dataset.ingredient = cleanName;
          newChip.innerHTML = `<span>✨</span> ${this.escapeHtml(cleanName)}`;
          newChip.addEventListener('click', () => {
            this.toggleIngredient(cleanName);
            newChip.classList.toggle('active', this.selectedIngredients.has(cleanName));
          });
          grid.insertBefore(newChip, btnAddCustom);
        }
      }
    });

    this.renderSelectedCount();

    // Notificación Toast visual
    if (newlyAdded.length > 0) {
      const topItems = newlyAdded.slice(0, 4).join(', ');
      this.showToastNotification(`¡Detectamos: ${topItems}! (${newlyAdded.length} ingredientes listos)`);
    }

    // Scroll suave hacia la acción de crear receta
    const btnGenerate = document.getElementById('btn-generate-recipe');
    if (btnGenerate) {
      btnGenerate.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  showToastNotification(message) {
    const existing = document.querySelector('.toast-scanner-notify');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-scanner-notify';
    toast.innerHTML = `<span>📸</span> <span>${this.escapeHtml(message)}</span>`;
    document.body.appendChild(toast);

    if ('vibrate' in navigator) navigator.vibrate([30, 50, 30]);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.4s, transform 0.4s';
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%, -10px)';
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  }

  // ========================================================================
  // GENERACIÓN DE RECETA CON IA (GEMINI TEXT)
  // ========================================================================

  async generateRecipeWithAI() {
    const ingredientsArray = Array.from(this.selectedIngredients);
    if (ingredientsArray.length === 0) {
      alert('Por favor selecciona al menos 1 ingrediente de tu despensa.');
      return;
    }

    const elStatus = document.getElementById('chef-status-container');
    const elStatusText = document.getElementById('chef-status-text');
    const elResultContainer = document.getElementById('chef-result-container');
    const btnGenerate = document.getElementById('btn-generate-recipe');

    try {
      if (btnGenerate) btnGenerate.disabled = true;
      if (elStatus) elStatus.style.display = 'flex';
      if (elStatusText) elStatusText.textContent = `Creando receta económica con ${ingredientsArray.slice(0, 4).join(', ')}...`;
      if (elResultContainer) elResultContainer.style.display = 'none';

      const promptText = `
Actúa como un chef experto en supervivencia foránea y universitaria.
A partir de estos ingredientes disponibles: [${ingredientsArray.join(', ')}], crea una receta ultrarrápida, deliciosa y económica.
Enfócate en practicidad: pocos utensilios (máximo 1 sartén u olla), mínimo tiempo (10 a 20 min) y costo bajísimo.

Responde ÚNICAMENTE un objeto JSON válido con esta estructura exacta:
{
  "titulo": "Nombre creativo y apetitoso (ej. Arroz Salvavidas con Atún)",
  "costoPorcion": "$3.200 / porción",
  "nivel": "CERO ESTRÉS",
  "tiempo": "15 min",
  "sartenes": "1 sartén",
  "emoji": "🍳",
  "descripcion": "Explicación breve de 2 líneas de por qué esta comida es perfecta para un estudiante.",
  "pasos": [
    "Paso 1 conciso y claro.",
    "Paso 2 conciso y claro.",
    "Paso 3 conciso y claro."
  ],
  "trucoForaneo": "Consejo rápido para que quede con más sabor o rinda más."
}
      `.trim();

      const payload = {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 900,
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
          body: JSON.stringify(payload)
        });

        if (!response.ok && response.status === 404) {
          response = await fetch(fallbackUrl, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }
      } catch (e) {
        throw new Error('Error al conectar con la IA de Google. Verifica tu conexión a internet.');
      }

      if (!response.ok) {
        throw new Error(`Error en el servidor de IA (${response.status})`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Respuesta vacía.');

      let recipe;
      try {
        recipe = JSON.parse(rawText);
      } catch (e) {
        const match = rawText.match(/\{[\s\S]*\}/);
        if (match) recipe = JSON.parse(match[0]);
        else throw new Error('Formato inválido de receta.');
      }

      recipe.id = 'rec-' + Date.now();
      recipe.fecha = new Date().toLocaleDateString('es-CO');
      recipe.ingredientesUsados = ingredientsArray;

      this.currentRecipe = recipe;
      this.renderRecipe(recipe);

    } catch (err) {
      console.error(err);
      alert(err.message || 'No se pudo generar la receta. Intenta nuevamente.');
    } finally {
      if (elStatus) elStatus.style.display = 'none';
      if (btnGenerate) btnGenerate.disabled = false;
    }
  }

  renderRecipe(recipe) {
    const elContainer = document.getElementById('chef-result-container');
    if (!elContainer) return;

    elContainer.innerHTML = `
      <div class="recipe-card-result">
        <div class="recipe-hero-banner">
          <span class="recipe-hero-emoji">${recipe.emoji || '🍳'}</span>
        </div>
        <div class="recipe-content">
          <h3 class="recipe-title">${this.escapeHtml(recipe.titulo)}</h3>
          
          <div class="recipe-badges-row">
            <span class="recipe-badge badge-cost">💰 ${recipe.costoPorcion || '$3.500 / porción'}</span>
            <span class="recipe-badge badge-level">🟢 NIVEL: ${recipe.nivel || 'CERO ESTRÉS'}</span>
            <span class="recipe-badge badge-time">⏱️ ${recipe.tiempo || '15 min'}</span>
            <span class="recipe-badge badge-pan">🍳 ${recipe.sartenes || '1 sartén'}</span>
          </div>

          <p class="recipe-desc">${this.escapeHtml(recipe.descripcion)}</p>

          <div id="recipe-steps-box" class="recipe-steps-list">
            <strong style="display:block; font-size:0.86rem; color:#fff; margin-bottom:8px;">👨‍🍳 Preparación Paso a Paso:</strong>
            ${(recipe.pasos || []).map((paso, idx) => `
              <div class="step-item">
                <span class="step-num">${idx + 1}</span>
                <span>${this.escapeHtml(paso)}</span>
              </div>
            `).join('')}
            ${recipe.trucoForaneo ? `
              <div style="margin-top: 12px; padding: 10px; background: rgba(16, 185, 129, 0.1); border-left: 3px solid var(--primary); border-radius: 6px; font-size: 0.78rem; color: #a7f3d0;">
                💡 <strong>Truco Foráneo:</strong> ${this.escapeHtml(recipe.trucoForaneo)}
              </div>
            ` : ''}
          </div>

          <div class="recipe-actions">
            <button id="btn-toggle-steps" class="btn-recipe-step">
              👁️ Ocultar pasos
            </button>
            <button id="btn-save-recipe-fav" class="btn-recipe-fav">
              ⭐ Guardar receta
            </button>
          </div>
        </div>
      </div>
    `;

    elContainer.style.display = 'block';
    elContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Alternar visibilidad de pasos
    const btnSteps = document.getElementById('btn-toggle-steps');
    const boxSteps = document.getElementById('recipe-steps-box');
    if (btnSteps && boxSteps) {
      btnSteps.addEventListener('click', () => {
        const isHidden = boxSteps.style.display === 'none';
        boxSteps.style.display = isHidden ? 'block' : 'none';
        btnSteps.textContent = isHidden ? '👁️ Ocultar pasos' : '📖 Ver paso a paso';
      });
    }

    // Guardar en favoritas
    const btnFav = document.getElementById('btn-save-recipe-fav');
    if (btnFav) {
      btnFav.addEventListener('click', () => {
        this.saveRecipeToStorage(recipe);
        btnFav.textContent = '✓ ¡Guardada!';
        btnFav.style.background = 'var(--primary)';
        btnFav.style.color = '#000';
      });
    }
  }

  saveRecipeToStorage(recipe) {
    let saved = this.getSavedRecipes();
    if (!saved.some(r => r.titulo === recipe.titulo)) {
      saved.unshift(recipe);
      localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(saved));
      this.renderSavedRecipes();
    }
  }

  getSavedRecipes() {
    try {
      const raw = localStorage.getItem(RECIPES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  deleteSavedRecipe(id) {
    let saved = this.getSavedRecipes().filter(r => r.id !== id);
    localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(saved));
    this.renderSavedRecipes();
  }

  renderSavedRecipes() {
    const listEl = document.getElementById('chef-saved-recipes-list');
    if (!listEl) return;

    const saved = this.getSavedRecipes();
    if (saved.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 18px 10px; color: var(--text-muted); font-size: 0.82rem;">
          🍽️ Aún no tienes recetas favoritas guardadas.
        </div>
      `;
      return;
    }

    listEl.innerHTML = saved.map(r => `
      <div class="expense-item" style="cursor: pointer;" data-id="${r.id}">
        <div class="expense-item-left">
          <div class="expense-icon" style="background: rgba(16, 185, 129, 0.12);">${r.emoji || '🍳'}</div>
          <div>
            <div class="expense-title">${this.escapeHtml(r.titulo)}</div>
            <div class="expense-time">${r.tiempo || '15 min'} • ${r.costoPorcion || '$3.500'}</div>
          </div>
        </div>
        <div class="expense-item-right">
          <button class="expense-btn-del" data-action="delete-recipe" title="Borrar">✕</button>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.expense-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.dataset.action === 'delete-recipe') {
          e.stopPropagation();
          this.deleteSavedRecipe(item.dataset.id);
          return;
        }
        const recipe = saved.find(r => r.id === item.dataset.id);
        if (recipe) this.renderRecipe(recipe);
      });
    });
  }

  attachEvents() {
    // 1. Chips de ingredientes existentes
    document.querySelectorAll('.chip-ingredient[data-ingredient]').forEach(chip => {
      chip.addEventListener('click', () => {
        const name = chip.dataset.ingredient;
        this.toggleIngredient(name);
        chip.classList.toggle('active', this.selectedIngredients.has(name));
      });
    });

    // 2. Botón Agregar otro ingrediente personalizado manual
    const btnAddCustom = document.getElementById('btn-add-custom-ingredient');
    if (btnAddCustom) {
      btnAddCustom.addEventListener('click', () => {
        const newIng = prompt('Ingresa el nombre del ingrediente que tienes (ej. Salchichas, Plátano, Aguacate):');
        if (newIng && newIng.trim()) {
          const cleanName = newIng.trim();
          this.selectedIngredients.add(cleanName);
          
          const grid = document.querySelector('.ingredient-chips-grid');
          if (grid) {
            const newChip = document.createElement('button');
            newChip.type = 'button';
            newChip.className = 'chip-ingredient active';
            newChip.dataset.ingredient = cleanName;
            newChip.innerHTML = `<span>🥕</span> ${this.escapeHtml(cleanName)}`;
            newChip.addEventListener('click', () => {
              this.toggleIngredient(cleanName);
              newChip.classList.toggle('active', this.selectedIngredients.has(cleanName));
            });
            grid.insertBefore(newChip, btnAddCustom);
          }
          this.renderSelectedCount();
        }
      });
    }

    // 3. Botón de Apertura del Escáner HUD
    const btnOpenScanner = document.getElementById('btn-open-scanner');
    if (btnOpenScanner) {
      btnOpenScanner.addEventListener('click', () => {
        this.openScanner();
      });
    }

    // 4. Botón Cerrar Escáner
    const btnCloseScanner = document.getElementById('btn-close-scanner');
    if (btnCloseScanner) {
      btnCloseScanner.addEventListener('click', () => {
        this.closeScanner();
      });
    }

    // 5. Botón Alternar Cámara (trasera / frontal)
    const btnSwitchCam = document.getElementById('btn-switch-camera');
    if (btnSwitchCam) {
      btnSwitchCam.addEventListener('click', () => {
        this.switchCamera();
      });
    }

    // 6. Botón Obturador (Captura fotograma y analiza)
    const btnShutter = document.getElementById('btn-shutter-capture');
    if (btnShutter) {
      btnShutter.addEventListener('click', () => {
        this.captureFrameFromVideo();
      });
    }

    // 7. Botón Galería
    const btnGallery = document.getElementById('btn-upload-gallery');
    const inputFallback = document.getElementById('scanner-file-fallback');
    if (btnGallery && inputFallback) {
      btnGallery.addEventListener('click', () => {
        inputFallback.removeAttribute('capture');
        inputFallback.click();
      });
    }

    // 8. Botón Cámara Nativa directa
    const btnNativeCam = document.getElementById('btn-native-cam');
    if (btnNativeCam && inputFallback) {
      btnNativeCam.addEventListener('click', () => {
        inputFallback.setAttribute('capture', 'environment');
        inputFallback.click();
      });
    }

    // 9. Listener al seleccionar archivo de imagen en input
    if (inputFallback) {
      inputFallback.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];
          const modal = document.getElementById('modal-fridge-scanner');
          if (modal && !modal.classList.contains('open')) {
            modal.classList.add('open');
          }
          this.processUploadedImageFile(file);
        }
      });
    }

    // 10. Botón principal de generar receta
    const btnGenerate = document.getElementById('btn-generate-recipe');
    if (btnGenerate) {
      btnGenerate.addEventListener('click', () => {
        this.generateRecipeWithAI();
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
window.chefForaneo = new ChefForaneo();
