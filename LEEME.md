# Monitor PBA | HIGA Eva Perón

Este es un monitor de estado para los servicios críticos del Ministerio de Salud de la Provincia de Buenos Aires y RENAPER, diseñado con una estética minimalista, sobria y de alto rendimiento.

## Servicios Monitoreados
1. **GDEBA** (`https://gdeba.gba.gob.ar/`)
2. **HSI (Historia de Salud Integrada)** (`https://shc.ms.gba.gov.ar/`)
3. **WEBMAIL INTRANET** (`https://webmail.ms.gba.gov.ar/`)
4. **RENAPER** (`https://mitramite.renaper.gob.ar/`)

---

## ¿Cómo funciona? (100% en el Navegador)
Dado que no se requiere instalar Node.js ni Python, la aplicación funciona **totalmente desde el navegador del usuario**.
- Realiza peticiones de tipo `no-cors` directamente a los servidores para ver si están activos. Si el servidor responde (incluso si tiene restricción de CORS), el monitor lo marcará como **Operativo** y mostrará el tiempo de respuesta. Si el servidor está caído o inalcanzable, se marcará como **Caído**.
- Guarda el historial de pings (las últimas 20 consultas) en el `localStorage` del navegador, por lo que mantendrá un registro visual en la línea de tiempo (píldoras verdes y rojas) siempre que uses el mismo navegador.

---

## ¿Cómo abrir y usar el monitor?

Solo tenés que hacer doble clic en el archivo:
👉 **[public/index.html](file:///c:/Users/ayalagaby/Downloads/TP-TUPAC/MinSaludPBA/MONITOR/public/index.html)**

Se abrirá en tu navegador web predeterminado de inmediato y comenzará a monitorear automáticamente cada 60 segundos. También podés hacer clic en el botón **Actualizar** para forzar una consulta en tiempo real.

---

## Archivos del Proyecto
*   **[public/index.html](file:///c:/Users/ayalagaby/Downloads/TP-TUPAC/MinSaludPBA/MONITOR/public/index.html)**: Estructura de la webapp.
*   **[public/styles.css](file:///c:/Users/ayalagaby/Downloads/TP-TUPAC/MinSaludPBA/MONITOR/public/styles.css)**: Estilos visuales minimalistas premium, fondo negro, tipografía *Encode Sans* y animaciones suaves.
*   **[public/app.js](file:///c:/Users/ayalagaby/Downloads/TP-TUPAC/MinSaludPBA/MONITOR/public/app.js)**: Lógica del monitor (consultas fetch, almacenamiento en `localStorage` y renderizado de la UI).
*   **[server.js](file:///c:/Users/ayalagaby/Downloads/TP-TUPAC/MinSaludPBA/MONITOR/server.js)** (Opcional): Código de servidor por si en el futuro se desea hostear en un servidor Node.js real.
