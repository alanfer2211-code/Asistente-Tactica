/* =====================================================
   TACTICA INGENIERIA - SISTEMA PROFESIONAL
   JavaScript Global v3.0 (PARCHE IA) - CORREGIDO
   ===================================================== */

// ===== CONFIGURACIÓN GLOBAL =====
let API_BASE_URL = '';  // dejar vacío para ruta relativa, o 'https://miapi.example'
const VERSION = '3.0.0';

// Prefijo de la API (asegurar que empiece con slash, sin slash final)
let API_PREFIX = '/api/v1';

// ===== ESTADO GLOBAL =====
const AppState = {
    currentUser: null,
    currentProject: null,
    isLoading: false,
    settings: {
        theme: 'dark',
        language: 'es',
        units: 'm',
        currency: 'USD'
    }
};

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    console.log(`🚀 Tactica Ingenieria v${VERSION} - Iniciando...`);
    loadSettings();
    setupGlobalEventListeners();
    await checkSystemHealth();
    registerAIIntegrationHooks();
    console.log('✅ Aplicación inicializada correctamente');
}

// ===== CONFIGURACIÓN =====
function loadSettings() {
    const savedSettings = localStorage.getItem('tactica_settings');
    if (savedSettings) {
        try {
            AppState.settings = { ...AppState.settings, ...JSON.parse(savedSettings) };
        } catch (error) {
            console.error('Error cargando configuración:', error);
        }
    }
}

function saveSettings() {
    localStorage.setItem('tactica_settings', JSON.stringify(AppState.settings));
}

// ===== UTIL: normalizar prefijos/urls =====
function normalizePrefix(p) {
    if (!p) return '';
    let out = String(p);
    if (!out.startsWith('/')) out = '/' + out;
    if (out.endsWith('/')) out = out.slice(0, -1);
    return out;
}
API_PREFIX = normalizePrefix(API_PREFIX);

function buildUrl(endpoint) {
  const base = API_BASE_URL ? API_BASE_URL.replace(/\/$/, '') : '';
  const prefix = API_PREFIX ? API_PREFIX.replace(/\/$/, '') : '';

  if (!endpoint) return `${base}${prefix}`;

  const ep = String(endpoint);

  // URL absoluta
  if (/^https?:\/\//i.test(ep)) return ep;

  const cleaned = ep.startsWith('/') ? ep : '/' + ep;

  // Si ya viene con el prefijo (/api/v1/...), NO lo dupliques
  if (prefix && (cleaned === prefix || cleaned.startsWith(prefix + '/'))) {
    return `${base}${cleaned}`;
  }

  return `${base}${prefix}${cleaned}`;
}
    // Si es URL absoluta, devolver tal cual
    if (/^https?:\/\//i.test(ep)) return ep;

    // Si el endpoint ya contiene el prefijo (p.ej. '/api/v1/...'), evitar duplicarlo
    const cleanedEndpoint = ep.startsWith('/') ? ep : '/' + ep;

    // Evitar doble slash al concatenar
    const base = API_BASE_URL ? API_BASE_URL.replace(/\/$/, '') : '';
    const prefix = API_PREFIX ? API_PREFIX.replace(/\/$/, '') : '';

    return `${base}${prefix}${cleanedEndpoint}`;
}

// ===== SISTEMA DE SALUD =====
async function checkSystemHealth() {
    try {
        // Intentar primero health en raíz y luego con prefijo (por compatibilidad)
        const candidates = [
            (API_BASE_URL ? API_BASE_URL.replace(/\/$/, '') : '') + '/health',
            buildUrl('/health')
        ].filter((v, i, a) => v && a.indexOf(v) === i);

        let health = null;
        for (const url of candidates) {
            try {
                const resp = await fetch(url, { credentials: 'same-origin' });
                if (!resp.ok) {
                    // probar siguiente candidato
                    continue;
                }
                health = await safeParseJson(resp);
                break;
            } catch (err) {
                // continuar con siguiente candidate
                continue;
            }
        }

        if (!health) {
            console.warn('Health endpoint no disponible');
            return null;
        }

        console.log('💚 Sistema saludable:', health);

        // Ajustar API_PREFIX si el backend lo reporta
        if (health && (health.api_prefix || health.apiPrefix || health.prefix)) {
            API_PREFIX = normalizePrefix(health.api_prefix || health.apiPrefix || health.prefix);
            console.log('🔁 API prefix ajustado desde health:', API_PREFIX);
        } else if (health && Array.isArray(health.features)) {
            if (health.features.includes('v1n')) {
                API_PREFIX = '/api/v1n';
                console.log('🔁 API prefix detectado en features: /api/v1n');
            }
        }

        if (health && health.version) console.log(`📦 Backend v${health.version}`);
        if (health && health.features) console.log('🎯 Features:', health.features);

        return health;
    } catch (error) {
        console.error('❌ Error verificando sistema:', error);
        showToast('Error de conexión con el servidor', 'error');
        return null;
    }
}

// Helper: parsea JSON/Texto de forma segura
async function safeParseJson(response) {
    if (!response) return null;
    const contentType = (response.headers && response.headers.get) ? (response.headers.get('content-type') || '') : '';
    try {
        if (contentType.includes('application/json')) {
            return await response.json();
        } else {
            const txt = await response.text();
            try {
                return txt ? JSON.parse(txt) : null;
            } catch (e) {
                return txt;
            }
        }
    } catch (err) {
        // fallback a text
        try {
            return await response.text();
        } catch (e) {
            return null;
        }
    }
}

// ===== API HELPERS =====
async function apiRequest(endpoint, options = {}) {
    // Si endpoint es ya URL absoluta, buildUrl la retornará
    const url = buildUrl(endpoint);

    // Default headers y opciones
    const defaultOptions = {
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json'
        },
        ...options
    };

    // Si es GET/HEAD, asegurar que no haya body
    if (defaultOptions.method && ['GET', 'HEAD'].includes(defaultOptions.method.toUpperCase())) {
        delete defaultOptions.body;
    }

    try {
        AppState.isLoading = true;
        updateLoadingState(true);

        const response = await fetch(url, defaultOptions);

        if (response.status === 204) {
            return { success: true, data: null };
        }

        if (!response.ok) {
            let errorMessage = `Error ${response.status}`;
            try {
                const errorData = await safeParseJson(response);
                if (errorData && typeof errorData === 'object') {
                    if (errorData.detail) errorMessage = errorData.detail;
                    else if (errorData.error) errorMessage = errorData.error;
                    else errorMessage = JSON.stringify(errorData);
                } else if (typeof errorData === 'string' && errorData.length) {
                    errorMessage = errorData;
                }
            } catch (e) { /* ignore parsing error */ }
            throw new Error(errorMessage);
        }

        const data = await safeParseJson(response);
        return { success: true, data };

    } catch (error) {
        console.error('API Error:', error);
        showToast(error.message || 'Error de API', 'error');
        return { success: false, error: error.message || 'API Error' };
    } finally {
        AppState.isLoading = false;
        updateLoadingState(false);
    }
}

// Métodos convenientes para API
const API = {
    get: (endpoint) => apiRequest(endpoint, { method: 'GET' }),

    post: (endpoint, data) => apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    put: (endpoint, data) => apiRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' }),

    upload: async (endpoint, formData) => {
        try {
            const url = buildUrl(endpoint);
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                credentials: 'same-origin'
            });
            if (!response.ok) {
                const err = await safeParseJson(response);
                throw new Error(err && err.detail ? err.detail : `Error ${response.status}`);
            }
            return { success: true, data: await safeParseJson(response) };
        } catch (error) {
            console.error('Upload error:', error);
            showToast('Error subiendo archivo', 'error');
            return { success: false, error: error.message };
        }
    }
};

// ===== GESTIÓN DE CARGA =====
function updateLoadingState(isLoading) {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.style.display = isLoading ? 'flex' : 'none';
    }
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container') || createToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };

    toast.innerHTML = `<i class="fas fa-${icons[type] || 'info-circle'}"></i><span>${escapeHtml(String(message || ''))}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);

    return toast;
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.style.position = 'fixed';
    container.style.right = '20px';
    container.style.bottom = '20px';
    container.style.zIndex = 99999;
    document.body.appendChild(container);
    return container;
}

// ===== MODALES =====
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        const firstInput = modal.querySelector('input, textarea, select');
        if (firstInput) setTimeout(() => firstInput.focus(), 100);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal.active').forEach(modal => modal.classList.remove('active'));
    document.body.style.overflow = '';
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllModals(); });
document.addEventListener('click', (e) => { if (e.target.classList && e.target.classList.contains('modal')) closeAllModals(); });

// ===== CONFIRMACIÓN =====
function confirmAction(message, onConfirm, onCancel = null) {
    const confirmed = confirm(message);
    if (confirmed && typeof onConfirm === 'function') onConfirm();
    else if (!confirmed && typeof onCancel === 'function') onCancel();
    return confirmed;
}

// ===== VALIDACIÓN DE FORMULARIOS =====
function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;

    let isValid = true;
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');

    inputs.forEach(input => {
        removeFieldError(input);
        if (!String(input.value || '').trim()) {
            showFieldError(input, 'Este campo es requerido');
            isValid = false;
        } else if (input.type === 'email' && !isValidEmail(input.value)) {
            showFieldError(input, 'Email inválido');
            isValid = false;
        } else if (input.type === 'number') {
            const value = parseFloat(input.value);
            const min = input.min ? parseFloat(input.min) : null;
            const max = input.max ? parseFloat(input.max) : null;
            if (min !== null && value < min) { showFieldError(input, `Valor mínimo: ${min}`); isValid = false; }
            else if (max !== null && value > max) { showFieldError(input, `Valor máximo: ${max}`); isValid = false; }
        }
    });

    return isValid;
}
function showFieldError(input, message) {
    input.classList.add('error');
    const existingError = input.parentElement.querySelector('.field-error');
    if (existingError) existingError.remove();
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    errorDiv.style.color = '#ef4444';
    errorDiv.style.fontSize = '12px';
    errorDiv.style.marginTop = '4px';
    input.parentElement.appendChild(errorDiv);
}
function removeFieldError(input) {
    input.classList.remove('error');
    const error = input.parentElement.querySelector('.field-error');
    if (error) error.remove();
}
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ===== FORMATEO =====
function formatNumber(num, decimals = 2) {
    const n = parseFloat(num);
    if (isNaN(n)) return (0).toFixed(decimals);
    return n.toFixed(decimals);
}
function formatCurrency(amount, currency = 'USD') {
    const symbols = { 'USD': '$', 'PEN': 'S/', 'EUR': '€' };
    return `${symbols[currency] || '$'}${formatNumber(amount, 2)}`;
}
function formatDate(dateString, format = 'short') {
    const date = new Date(dateString);
    const formats = {
        short: { year: 'numeric', month: '2-digit', day: '2-digit' },
        long: { year: 'numeric', month: 'long', day: 'numeric' },
        time: { hour: '2-digit', minute: '2-digit' },
        full: { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    };
    return date.toLocaleDateString('es-ES', formats[format] || formats.short);
}
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ===== UTILIDADES DE STRING =====
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const str = String(text);
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return str.replace(/[&<>"']/g, m => map[m]);
}
function truncate(str, length = 50, ending = '...') {
    if (!str) return '';
    if (str.length > length) return str.substring(0, length - ending.length) + ending;
    return str;
}
function slugify(text) {
    if (!text) return '';
    return text.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
}

// ===== DEBOUNCE & THROTTLE =====
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) { clearTimeout(timeout); timeout = setTimeout(() => func(...args), wait); };
}
function throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) { func.apply(this, args); inThrottle = true; setTimeout(() => inThrottle = false, limit); }
    };
}

// ===== ALMACENAMIENTO LOCAL =====
const Storage = {
    set: (key, value) => { try { localStorage.setItem(`tactica_${key}`, JSON.stringify(value)); return true; } catch (error) { console.error('Error guardando en localStorage:', error); return false; } },
    get: (key, defaultValue = null) => { try { const item = localStorage.getItem(`tactica_${key}`); return item ? JSON.parse(item) : defaultValue; } catch (error) { console.error('Error leyendo localStorage:', error); return defaultValue; } },
    remove: (key) => { try { localStorage.removeItem(`tactica_${key}`); return true; } catch (error) { console.error('Error eliminando de localStorage:', error); return false; } },
    clear: () => { try { const keys = Object.keys(localStorage).filter(k => k.startsWith('tactica_')); keys.forEach(key => localStorage.removeItem(key)); return true; } catch (error) { console.error('Error limpiando localStorage:', error); return false; } }
};

// ===== PORTAPAPELES / DESCARGAS =====
async function copyToClipboard(text) {
    try { await navigator.clipboard.writeText(String(text || '')); showToast('Copiado al portapapeles', 'success'); return true; }
    catch (error) { console.error('Error copiando al portapapeles:', error); showToast('Error al copiar', 'error'); return false; }
}
function downloadFile(blob, filename) {
    const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
}
async function downloadFromUrl(url, filename) {
    try { const response = await fetch(url); const blob = await response.blob(); downloadFile(blob, filename); showToast('Descarga iniciada', 'success'); }
    catch (error) { console.error('Error descargando archivo:', error); showToast('Error en la descarga', 'error'); }
}

// ===== BÚSQUEDA Y FILTRADO =====
function searchInArray(array, searchTerm, fields = []) {
    if (!searchTerm) return array;
    const term = searchTerm.toLowerCase().trim();
    return array.filter(item => {
        if (fields.length === 0) return JSON.stringify(item).toLowerCase().includes(term);
        return fields.some(field => {
            const value = getNestedProperty(item, field);
            return value && value.toString().toLowerCase().includes(term);
        });
    });
}
function getNestedProperty(obj, path) {
    if (!path) return undefined;
    return path.split('.').reduce((current, prop) => (current && (Object.prototype.hasOwnProperty.call(current, prop) ? current[prop] : current[prop])), obj);
}

// ===== ORDENAMIENTO =====
function sortArray(array, field, order = 'asc') {
    return [...array].sort((a, b) => {
        const aVal = getNestedProperty(a, field);
        const bVal = getNestedProperty(b, field);
        const aStr = (aVal === undefined || aVal === null) ? '' : String(aVal).toLowerCase();
        const bStr = (bVal === undefined || bVal === null) ? '' : String(bVal).toLowerCase();
        if (aStr === bStr) return 0;
        return (order === 'asc') ? (aStr > bStr ? 1 : -1) : (aStr < bStr ? 1 : -1);
    });
}

// ===== PAGINACIÓN / STATS / GROUP BY / ID =====
function paginate(array, page = 1, perPage = 10) { const start = (page - 1) * perPage; const end = start + perPage; return { data: array.slice(start, end), currentPage: page, perPage, total: array.length, totalPages: Math.ceil(array.length / perPage), hasNext: end < array.length, hasPrev: page > 1 }; }
function calculateStats(numbers) { if (!numbers || numbers.length === 0) return { sum: 0, avg: 0, min: 0, max: 0, count: 0 }; const sum = numbers.reduce((a, b) => a + b, 0); const avg = sum / numbers.length; return { sum: formatNumber(sum), avg: formatNumber(avg), min: formatNumber(Math.min(...numbers)), max: formatNumber(Math.max(...numbers)), count: numbers.length }; }
function groupBy(array, field) { return array.reduce((groups, item) => { const value = getNestedProperty(item, field); const key = value || 'Sin categoría'; if (!groups[key]) groups[key] = []; groups[key].push(item); return groups; }, {}); }
function generateId(prefix = '') { const timestamp = Date.now().toString(36); const random = Math.random().toString(36).substring(2, 9); return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`; }
function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function retry(fn, maxAttempts = 3, delayMs = 1000) { for (let attempt = 1; attempt <= maxAttempts; attempt++) { try { return await fn(); } catch (error) { if (attempt === maxAttempts) throw error; await delay(delayMs); console.log(`Reintento ${attempt}/${maxAttempts}...`); } } }

// ===== EVENT LISTENERS GLOBALES =====
function setupGlobalEventListeners() {
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-menu.show').forEach(menu => menu.classList.remove('show'));
        }
    });

    document.querySelectorAll('.alert-dismissible').forEach(alert => {
        const closeBtn = alert.querySelector('.alert-close');
        if (closeBtn) closeBtn.addEventListener('click', () => { alert.style.display = 'none'; });
    });

    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });
        document.querySelectorAll('img.lazy').forEach(img => imageObserver.observe(img));
    }
}

// ===== FUNCIONES DE ANÁLISIS / BIBLIOTECA =====
async function getProjectAnalysis(projectId) {
    const result = await API.get(`/projects/${projectId}/analysis`);
    if (result.success) return result.data;
    return null;
}
async function searchLibrary(query) {
    const result = await API.get(`/library/search?q=${encodeURIComponent(query)}`);
    if (result.success) return result.data.results || result.data;
    return [];
}
async function getLibraryCategories() {
    const result = await API.get('/library/categories');
    if (result.success) return result.data;
    return {};
}

/* ========== INTEGRACIÓN IA ========== */
async function interpretText(text) {
    if (!text || !text.trim()) return { success: false, error: 'Texto vacío' };
    try {
        const res = await API.post('/interpret', { text });
        if (!res.success) return { success: false, error: res.error || 'No response' };
        return { success: true, data: res.data };
    } catch (err) { console.error('interpretText error', err); return { success: false, error: err.message || 'Error' }; }
}

function handleAIAction(action) {
    if (!action || !action.type) return false;
    try {
        switch (action.type) {
            case 'calibrate': {
                const val = parseFloat(action.value);
                if (isNaN(val) || val <= 0) { showToast('Valor de calibración inválido desde IA', 'warning'); return false; }
                const distInput = document.getElementById('calibration-distance');
                if (distInput) distInput.value = val;
                if (typeof window.openCalibrationModal === 'function') window.openCalibrationModal();
                else { const modal = document.getElementById('calibration-modal'); if (modal) modal.classList.add('active'); }
                showToast('IA: distancia rellenada. Selecciona dos puntos y guarda.', 'info');
                return true;
            }
            case 'measure': {
                const tool = action.tool || 'line';
                window.dispatchEvent(new CustomEvent('tactica:ai:measure', { detail: { tool } }));
                showToast(`IA: activando herramienta ${tool}`, 'success');
                return true;
            }
            case 'export': {
                const format = action.format || 'xlsx';
                window.dispatchEvent(new CustomEvent('tactica:ai:export', { detail: { format } }));
                showToast(`IA: preparando exportación ${format}`, 'info');
                return true;
            }
            case 'message': {
                if (action.value) showToast(String(action.value), 'info');
                return true;
            }
            default:
                console.warn('Acción IA desconocida:', action);
                return false;
        }
    } catch (err) {
        console.error('Error ejecutando acción IA:', err);
        return false;
    }
}

function registerAIIntegrationHooks() {
    window.TacticaApp = window.TacticaApp || {};
    window.TacticaApp.interpretText = interpretText;
    window.TacticaApp.handleAIAction = handleAIAction;
    window.addEventListener('tactica:calibration:saved', (e) => { console.log('Evento: calibración guardada', e.detail); showToast('Calibración guardada', 'success'); });
    window.addEventListener('tactica:viewer:requestInterpret', async (e) => {
        const text = e?.detail?.text;
        if (!text) return;
        const result = await interpretText(text);
        if (result.success && result.data) {
            if (result.data.action) handleAIAction(result.data.action);
            window.dispatchEvent(new CustomEvent('tactica:viewer:interpretResult', { detail: result.data }));
        } else showToast('Error interpretación IA', 'error');
    });
}

/* ===== EXPORTAR FUNCIONES GLOBALES ===== */
window.TacticaApp = {
    ...window.TacticaApp,
    version: VERSION,
    state: AppState,
    api: API,
    showToast,
    openModal,
    closeModal,
    confirmAction,
    validateForm,
    formatNumber, formatCurrency, formatDate, formatFileSize,
    escapeHtml, truncate, slugify,
    debounce, throttle, delay, retry,
    storage: Storage,
    copyToClipboard, downloadFile, downloadFromUrl,
    searchInArray, sortArray, groupBy, paginate, calculateStats,
    checkSystemHealth, getProjectAnalysis, searchLibrary, getLibraryCategories,
    interpretText, handleAIAction
};

console.log('%c🚀 Tactica Ingenieria', 'font-size: 20px; font-weight: bold; color: #3b82f6;');
console.log('%cSistema Profesional v' + VERSION, 'font-size: 14px; color: #6b7280;');
console.log('%cAPI disponible en: window.TacticaApp', 'font-size: 12px; color: #10b981;');