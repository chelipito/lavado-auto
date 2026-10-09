/*
 * Íconos SVG (estilo Lucide) en un "sprite".
 * Uso en HTML: <svg class="icono" aria-hidden="true"><use href="#i-calendario"></use></svg>
 * Para agregar un ícono nuevo, sumar una entrada aquí.
 */
(() => {
  const iconos = {
    'gota': '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
    'calendario': '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    'reloj': '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    'ubicacion': '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    'telefono': '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    'auto': '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
    'grafico': '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
    'izquierda': '<path d="m15 18-6-6 6-6"/>',
    'derecha': '<path d="m9 18 6-6-6-6"/>',
    'buscar': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    'check': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',
    'mensaje': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    'info': '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    'volver': '<path d="m12 19-7-7 7-7M19 12H5"/>',
    'usuario': '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>'
  };

  const simbolos = Object.entries(iconos)
    .map(([id, contenido]) => `<symbol id="i-${id}" viewBox="0 0 24 24">${contenido}</symbol>`)
    .join('');
  document.body.insertAdjacentHTML('afterbegin',
    `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">${simbolos}</svg>`);
})();
