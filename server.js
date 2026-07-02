const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Lista de servicios a monitorear
const services = [
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

// Historial en memoria de las últimas 20 verificaciones por servicio
const historySize = 20;
const monitorHistory = {};
services.forEach(s => {
  monitorHistory[s.id] = [];
});

let isChecking = false;
let lastCheckTime = null;

// Función para realizar las peticiones HTTP
async function checkService(service) {
  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000); // 7 segundos de timeout

  try {
    const response = await fetch(service.url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - start;

    // Clasificación de estado
    // Si responde con código HTTP de error de servidor (5xx), lo consideramos degradado o caído.
    // Si responde con 2xx, 3xx o códigos de cliente como 401/403/404, el servidor físico está vivo y respondiendo.
    let status = 'online';
    let details = `Código HTTP: ${response.status}`;

    if (response.status >= 500) {
      status = 'degraded';
      details = `Error de Servidor (${response.status})`;
    }

    return {
      status,
      responseTime,
      timestamp: Date.now(),
      statusCode: response.status,
      details
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const responseTime = Date.now() - start;
    const isTimeout = error.name === 'AbortError';
    
    return {
      status: 'offline',
      responseTime: isTimeout ? 7000 : responseTime,
      timestamp: Date.now(),
      statusCode: null,
      details: isTimeout ? 'Timeout de conexión (7s)' : `Error: ${error.message}`
    };
  }
}

// Función principal para correr el lote de comprobaciones
async function runChecks() {
  if (isChecking) return;
  isChecking = true;

  console.log(`[${new Date().toISOString()}] Iniciando ronda de monitoreo...`);
  
  const promises = services.map(async (service) => {
    const result = await checkService(service);
    
    // Agregar al historial en memoria
    const serviceHistory = monitorHistory[service.id];
    serviceHistory.push(result);
    
    // Limitar al tamaño máximo
    if (serviceHistory.length > historySize) {
      serviceHistory.shift();
    }
  });

  await Promise.all(promises);
  lastCheckTime = Date.now();
  isChecking = false;
  console.log(`[${new Date().toISOString()}] Monitoreo completado.`);
}

// Intervalo automático cada 60 segundos
setInterval(runChecks, 60000);

// Ejecutar inmediatamente al iniciar el servidor
runChecks();

// Endpoint de la API para obtener el estado actual e historial
app.get('/api/status', async (req, res) => {
  // Si el cliente pide actualización forzada y ha pasado más de 10 segundos desde la última
  const force = req.query.force === 'true';
  const timeSinceLastCheck = Date.now() - (lastCheckTime || 0);
  
  if (force && timeSinceLastCheck > 10000 && !isChecking) {
    await runChecks();
  }

  const responseData = services.map(service => {
    const history = monitorHistory[service.id];
    const latest = history[history.length - 1] || {
      status: 'unknown',
      responseTime: null,
      timestamp: Date.now(),
      statusCode: null,
      details: 'Sin comprobaciones aún'
    };

    return {
      ...service,
      status: latest.status,
      responseTime: latest.responseTime,
      statusCode: latest.statusCode,
      details: latest.details,
      lastChecked: latest.timestamp,
      history: history
    };
  });

  res.json({
    services: responseData,
    lastCheckTime: lastCheckTime,
    isChecking: isChecking
  });
});

// Levantar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
