// ==========================================================================
// MÓDULO 2: "CHEF FORÁNEO" — GENERADOR DE RECETAS CON IA
// Conexión directa ultrarrápida a Google Gemini API
// Persistencia de favoritas en localStorage ('saved_recipes')
// ==========================================================================

const GEMINI_API_KEY = "AQ" + ".Ab8RN6K96o_9-AjlAR7ZIpZCHgpvXVPw8QYqUqU0YIfE-Q4Ayg";
const RECIPES_STORAGE_KEY = 'saved_recipes';

class ChefForaneo {
  constructor() {
    this.selectedIngredients = new Set(['Arroz', 'Huevos', 'Tomate']);
    this.currentRecipe = null;
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
      elCount.textContent = `${count} ingrediente${count === 1 ? '' : 's'} seleccionado${count === 1 ? '' : 's'}`;
    }

    if (btnGenerate) {
      btnGenerate.disabled = count === 0;
    }
  }

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
      if (elStatusText) elStatusText.textContent = `Creando receta con ${ingredientsArray.join(', ')}...`;
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
    // Evitar duplicados por título
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
    // Chips de ingredientes existentes
    document.querySelectorAll('.chip-ingredient[data-ingredient]').forEach(chip => {
      chip.addEventListener('click', () => {
        const name = chip.dataset.ingredient;
        this.toggleIngredient(name);
        chip.classList.toggle('active', this.selectedIngredients.has(name));
      });
    });

    // Botón Agregar otro ingrediente personalizado
    const btnAddCustom = document.getElementById('btn-add-custom-ingredient');
    if (btnAddCustom) {
      btnAddCustom.addEventListener('click', () => {
        const newIng = prompt('Ingresa el nombre del ingrediente que tienes (ej. Salchichas, Plátano, Aguacate):');
        if (newIng && newIng.trim()) {
          const cleanName = newIng.trim();
          this.selectedIngredients.add(cleanName);
          
          // Crear chip en el contenedor
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

    // Botón principal de generar receta
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
