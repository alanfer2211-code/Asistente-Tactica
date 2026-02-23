/**
 * ══════════════════════════════════════════════════════════════
 *  TACTICA INGENIERIA — api.js  v2.0
 *  Helper centralizado de fetch + manejo de errores + toast
 *  Colocar en: static/assets/api.js
 *  Incluir en los HTML antes del script de pagina:
 *    <script src="/static/assets/api.js"></script>
 * ══════════════════════════════════════════════════════════════
 */

(() => {
  "use strict";

  // ── Constantes ──────────────────────────────────────────────
  const API_BASE    = "/api/v1";
  const STORAGE_KEY = "TACTICA_ACTIVE_PROJECT";
  const TIMEOUT_MS  = 30_000;

  // ── Estado global compartido entre modulos ───────────────────
  window.TACTICA = window.TACTICA || {
    activeProjectId:  localStorage.getItem(STORAGE_KEY) || "",
    activeProject:    null,
    projects:         [],
    simulation:       false,
  };

  // ── Helper: fetch robusto ────────────────────────────────────
  /**
   * apiFetch — wrapper sobre fetch con:
   *   - timeout de 30s con AbortController
   *   - deteccion de content-type antes de parsear
   *   - extraccion del campo `detail` en errores HTTP
   *   - lanzamiento de Error con mensaje legible (503/429/502/504)
   *
   * @param {string} url
   * @param {RequestInit} [opts]
   * @returns {Promise<any>}  parsed JSON o texto
   */
  async function apiFetch(url, opts = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(url, { ...opts, signal: controller.signal });
      const ct  = (res.headers.get("content-type") || "").toLowerCase();
      let body;

      if (ct.includes("application/json")) {
        body = await res.json();
      } else {
        body = await res.text();
      }

      if (!res.ok) {
        // Intenta extraer el mensaje mas especifico disponible
        let msg = `Error ${res.status}`;
        if (body && typeof body === "object" && body.detail) {
          msg = body.detail;
        } else if (typeof body === "string" && body.length < 400) {
          msg = body || msg;
        }
        // Mensajes amigables segun codigo HTTP
        if (res.status === 503) msg = msg || "No se pudo conectar con el servidor IA. Revisa tu conexion o proxy.";
        if (res.status === 429) msg = msg || "Limite de solicitudes alcanzado. Espera 30 segundos e intenta de nuevo.";
        if (res.status === 504) msg = msg || "El servidor IA tardo demasiado (timeout). Intenta de nuevo.";
        if (res.status === 401) msg = msg || "Clave de API no configurada o invalida.";
        if (res.status === 502) msg = msg || "El servidor IA respondio con un error. Intenta en unos momentos.";
        throw Object.assign(new Error(msg), { status: res.status });
      }

      return body;

    } catch (e) {
      if (e.name === "AbortError") {
        throw new Error("Tiempo agotado (30s). El servidor no respondio.");
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  // ── Toast ────────────────────────────────────────────────────
  /**
   * showToast — muestra una notificacion flotante.
   * Crea el host si no existe en el DOM.
   * @param {string} msg
   * @param {"ok"|"err"|"warn"|"info"} [type="info"]
   * @param {number} [ms=3000]
   */
  function showToast(msg, type = "info", ms = 3000) {
    let host = document.getElementById("tac-toast-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "tac-toast-host";
      host.className = "tac-toast-host";
      document.body.appendChild(host);
    }
    const el = document.createElement("div");
    el.className = `tac-toast ${type}`;
    el.setAttribute("role", "alert");
    el.setAttribute("aria-live", "polite");
    el.textContent = msg;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 300);
    }, ms);
  }

  // ── Proyectos ────────────────────────────────────────────────
  async function loadProjects() {
    try {
      const data = await apiFetch(`${API_BASE}/projects`);
      window.TACTICA.projects = data.projects || [];
      const active = window.TACTICA.projects.find(p => p.id === window.TACTICA.activeProjectId);
      window.TACTICA.activeProject = active || window.TACTICA.projects[0] || null;
      if (window.TACTICA.activeProject && !window.TACTICA.activeProjectId) {
        window.TACTICA.activeProjectId = window.TACTICA.activeProject.id;
        localStorage.setItem(STORAGE_KEY, window.TACTICA.activeProjectId);
      }
      return window.TACTICA.projects;
    } catch (e) {
      console.warn("[TACTICA] No se pudieron cargar proyectos:", e.message);
      return [];
    }
  }

  function setActiveProject(id) {
    window.TACTICA.activeProjectId = id;
    localStorage.setItem(STORAGE_KEY, id);
    window.TACTICA.activeProject = (window.TACTICA.projects || []).find(p => p.id === id) || null;
  }

  // ── Health check ─────────────────────────────────────────────
  async function checkHealth(badgeEl) {
    try {
      const d = await apiFetch(`${API_BASE}/health`);
      window.TACTICA.simulation = !!d.simulation;
      if (badgeEl) {
        if (d.simulation) {
          badgeEl.textContent  = "Demo";
          badgeEl.style.color  = "#ef4444";
          badgeEl.title        = "Sin OPENAI_API_KEY. Configurala en .env para activar GPT-4o real.";
        } else {
          badgeEl.textContent  = "GPT-4o";
          badgeEl.style.color  = "#22c1c3";
        }
      }
      return d;
    } catch (_) {
      if (badgeEl) { badgeEl.textContent = "Offline"; badgeEl.style.color = "#f59e0b"; }
      return null;
    }
  }

  // ── Registro de eventos de proyecto ─────────────────────────
  async function trackEvent(type, payload = {}) {
    const pid = window.TACTICA.activeProjectId;
    if (!pid) return;
    try {
      await fetch(`${API_BASE}/projects/${pid}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, payload }),
      });
    } catch (_) { /* silencioso */ }
  }

  // ── Exportar al scope global ─────────────────────────────────
  window.TACTICA.apiFetch    = apiFetch;
  window.TACTICA.showToast   = showToast;
  window.TACTICA.loadProjects = loadProjects;
  window.TACTICA.setActiveProject = setActiveProject;
  window.TACTICA.checkHealth = checkHealth;
  window.TACTICA.trackEvent  = trackEvent;
  window.TACTICA.API_BASE    = API_BASE;

  // Alias corto para uso interno en paginas
  window.tacFetch = apiFetch;
  window.tacToast = showToast;

})();
