// Lógica de cliente del Monitor PBA HIGA Eva Perón (Ejecución 100% Cliente / Servidor local)
// Este código funciona tanto si se abre el archivo index.html directamente en el navegador,
// como si se sirve desde un servidor local Node.js.

const servicesContainer = document.getElementById('services-container');
const globalStatusBadge = document.getElementById('global-status');
const lastSyncTimeEl = document.getElementById('last-sync-time');
const nextSyncCountdownEl = document.getElementById('next-sync-countdown');
const refreshBtn = document.getElementById('refresh-btn');

let countdownValue = 60;
let countdownTimer = null;
const COUNTDOWN_DEFAULT = 60; // 60 segundos
const HISTORY_SIZE = 20;

// Configuración de los servicios a monitorear
const servicesConfig = [
  {
    id: 'gdeba',
    name: 'GDEBA',
    description: 'Gestión Documental Electrónica de la Prov. de Buenos Aires',
    url: 'https://gdeba.gba.gob.ar/'
  },
  {
    id: 'hsi',
    name: 'HSI',
    description: 'Historia de Salud Integrada (Portal SHC)',
    url: 'https://shc.ms.gba.gov.ar/'
  },
  {
    id: 'webmail',
    name: 'WEBMAIL INTRANET',
    description: 'Correo Institucional del Ministerio de Salud PBA',
    url: 'https://webmail.ms.gba.gov.ar/'
  },
  {
    id: 'renaper',
    name: 'RENAPER',
    description: 'Consulta y validación de trámites del Registro Nacional',
    url: 'https://mitramite.renaper.gob.ar/'
  }
];

// Mapeo de traducciones y clases para los estados
const statusConfig = {
  online: { text: 'Operativo', class: 'online' },
  offline: { text: 'Caído', class: 'offline' },
  degraded: { text: 'Degradado', class: 'degraded' },
  unknown: { text: 'Sin datos', class: 'unknown' }
};

// Cargar historial de localStorage
function loadHistory() {
  try {
    const data = localStorage.getItem('monitor_pba_history');
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error('Error leyendo localStorage:', e);
    return {};
  }
}

// Guardar historial en localStorage
function saveHistory(history) {
  try {
    localStorage.setItem('monitor_pba_history', JSON.stringify(history));
  } catch (e) {
    console.error('Error escribiendo en localStorage:', e);
  }
}

// Dar formato legible a la hora
function formatTime(timestamp) {
  if (!timestamp) return '--:--:--';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

// Realizar prueba de conexión a un servicio usando no-cors
async function checkServiceDirect(service) {
  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout

  try {
    // Usamos no-cors para evitar bloqueos del navegador.
    // Si la web está caída o no hay internet, fetch arrojará error de red.
    // Si la web responde (aunque sea CORS-blocked o redirija), fetch resolverá exitosamente.
    await fetch(service.url, {
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - start;

    return {
      status: 'online',
      responseTime: duration,
      timestamp: Date.now(),
      details: 'Conectado directamente'
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const duration = Date.now() - start;
    const isTimeout = error.name === 'AbortError';

    return {
      status: 'offline',
      responseTime: isTimeout ? 7000 : duration,
      timestamp: Date.now(),
      details: isTimeout ? 'Timeout de conexión (7s)' : 'Sin respuesta / Red inalcanzable'
    };
  }
}

// Iniciar temporizador de cuenta regresiva
function startCountdown() {
  clearInterval(countdownTimer);
  countdownValue = COUNTDOWN_DEFAULT;
  nextSyncCountdownEl.textContent = `Refrescando en ${countdownValue}s`;

  countdownTimer = setInterval(() => {
    countdownValue--;
    if (countdownValue <= 0) {
      clearInterval(countdownTimer);
      performMonitoring();
    } else {
      nextSyncCountdownEl.textContent = `Refrescando en ${countdownValue}s`;
    }
  }, 1000);
}

// Proceso principal de monitoreo en el navegador
async function performMonitoring(isManual = false) {
  if (isManual) {
    refreshBtn.disabled = true;
    refreshBtn.classList.add('loading');
    refreshBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-refresh">
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
        <path d="M3 3v5h5"></path>
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
        <path d="M16 16h5v5"></path>
      </svg>
      Actualizando...
    `;
  }

  const history = loadHistory();
  const currentResults = [];

  // Ejecutar comprobaciones en paralelo
  const promises = servicesConfig.map(async (service) => {
    const result = await checkServiceDirect(service);
    currentResults.push({ id: service.id, result });

    // Actualizar historial local
    if (!history[service.id]) {
      history[service.id] = [];
    }
    history[service.id].push(result);

    // Limitar tamaño del historial
    if (history[service.id].length > HISTORY_SIZE) {
      history[service.id].shift();
    }
  });

  await Promise.all(promises);

  saveHistory(history);
  renderDashboard(currentResults, history);

  lastSyncTimeEl.textContent = `Sincronizado: ${formatTime(Date.now())}`;

  if (isManual) {
    refreshBtn.disabled = false;
    refreshBtn.classList.remove('loading');
    refreshBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-refresh">
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
        <path d="M3 3v5h5"></path>
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
        <path d="M16 16h5v5"></path>
      </svg>
      Actualizar
    `;
  }

  startCountdown();
}

// Renderizar el tablero visual
function renderDashboard(results, history) {
  servicesContainer.innerHTML = '';

  // Ordenar los resultados para mantener consistencia con servicesConfig
  servicesConfig.forEach(service => {
    const serviceResult = results.find(r => r.id === service.id)?.result || {
      status: 'unknown',
      responseTime: null,
      details: 'Sin datos'
    };

    const serviceHistory = history[service.id] || [];
    const conf = statusConfig[serviceResult.status] || statusConfig.unknown;

    const responseTimeText = serviceResult.status === 'online'
      ? `${serviceResult.responseTime} ms`
      : '-- ms';

    const errorMsgHtml = serviceResult.status === 'offline'
      ? `<span class="service-error-msg" title="${serviceResult.details}">${serviceResult.details}</span>`
      : '';

    const card = document.createElement('div');
    card.className = 'service-card';

    const historyHtml = generateHistoryTimeline(serviceHistory);

    card.innerHTML = `
      <div class="service-card-header">
        <div>
          <h2 class="service-name">${service.name}</h2>
          <p class="service-description">${service.description}</p>
        </div>
        <div class="service-meta">
          <span class="response-time">${responseTimeText}</span>
          <span class="status-badge ${conf.class}">${conf.text}</span>
        </div>
      </div>
      
      <div class="service-details-row">
        <a href="${service.url}" target="_blank" rel="noopener noreferrer" class="service-url" title="Visitar enlace directo">
          ${service.url} ↗
        </a>
        <div class="history-timeline">
          ${historyHtml}
        </div>
      </div>
    `;

    if (errorMsgHtml) {
      const detailsRow = card.querySelector('.service-details-row');
      detailsRow.insertAdjacentHTML('beforebegin', `<div style="margin-top: -4px; margin-bottom: 2px;">${errorMsgHtml}</div>`);
    }

    servicesContainer.appendChild(card);
  });

  updateGlobalStatusHeader(results);
}

// Generar línea de tiempo histórica para el frontend
function generateHistoryTimeline(serviceHistory) {
  let html = '';
  const filledHistory = [...serviceHistory];

  while (filledHistory.length < HISTORY_SIZE) {
    filledHistory.unshift({ status: 'unknown', responseTime: null, timestamp: null });
  }

  filledHistory.forEach(item => {
    const status = item.status;
    const timeInfo = item.timestamp ? `${formatDate(item.timestamp)} ${formatTime(item.timestamp)}` : 'Sin registros';
    const respInfo = item.responseTime !== null ? `${item.responseTime}ms` : '--';
    
    let tooltip = '';
    if (status === 'unknown') {
      tooltip = 'Sin registros';
    } else {
      const stateText = status === 'online' ? 'Operativo' : 'Caído';
      tooltip = `${stateText} | ${respInfo} | ${timeInfo}`;
    }

    html += `<div class="timeline-pill ${status}" data-tooltip="${tooltip}"></div>`;
  });

  return html;
}

// Actualizar cabecera global
function updateGlobalStatusHeader(results) {
  const total = results.length;
  const offlineCount = results.filter(r => r.result.status === 'offline').length;

  const dot = globalStatusBadge.querySelector('.status-dot-pulse');
  const text = globalStatusBadge.querySelector('.status-text');

  dot.className = 'status-dot-pulse';

  if (offlineCount === 0) {
    dot.classList.add('online');
    text.textContent = 'Sistemas Operativos';
  } else {
    dot.classList.add('offline');
    text.textContent = `${offlineCount} de ${total} caído${offlineCount > 1 ? 's' : ''}`;
  }
}

// Cargar datos previos si existen al iniciar
function init() {
  const history = loadHistory();
  const initialResults = servicesConfig.map(service => {
    const serviceHistory = history[service.id] || [];
    const latest = serviceHistory[serviceHistory.length - 1] || { status: 'unknown', responseTime: null, details: 'Sin comprobaciones' };
    return {
      id: service.id,
      result: latest
    };
  });

  renderDashboard(initialResults, history);
  
  // Si hay datos históricos, poner la última sincronización
  const allTimestamps = Object.values(history).flatMap(h => h.map(x => x.timestamp)).filter(Boolean);
  if (allTimestamps.length > 0) {
    const maxTimestamp = Math.max(...allTimestamps);
    lastSyncTimeEl.textContent = `Sincronizado: ${formatTime(maxTimestamp)}`;
  }

  // Ejecutar monitoreo real inicial
  performMonitoring(false);
}

refreshBtn.addEventListener('click', () => {
  performMonitoring(true);
});

document.addEventListener('DOMContentLoaded', init);
