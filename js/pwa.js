/* Activa la app instalable (service worker). No hace nada en navegadores sin soporte. */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* la app funciona igual sin esto */ });
  });
}
