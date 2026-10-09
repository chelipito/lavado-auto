/* Panel de inicio (index.html): datos del local, estado abierto/cerrado y accesos rápidos. */
(async () => {
  const $ = (sel) => document.querySelector(sel);
  let negocio, servicios;
  try {
    [negocio, servicios] = await Promise.all([Datos.negocio(), Datos.servicios()]);
  } catch {
    return; // se mantiene el contenido base del HTML
  }

  const textos = { nombre: negocio.nombre, eslogan: negocio.eslogan, direccion: negocio.direccion, telefono: negocio.telefono, horario: negocio.horario.texto };
  document.querySelectorAll('[data-negocio]').forEach(el => { el.textContent = textos[el.dataset.negocio] ?? ''; });
  document.title = negocio.nombre;

  // Enlaces de contacto
  $('#enlace-telefono').href = `tel:${negocio.telefono.replace(/\s/g, '')}`;
  $('#acceso-whatsapp').href = `https://wa.me/${negocio.whatsapp}?text=${encodeURIComponent(`Hola ${negocio.nombre}, quisiera consultar por un lavado.`)}`;
  $('#acceso-mapa').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${negocio.nombre} ${negocio.direccion}`)}`;

  // Precio más bajo de todos los servicios
  const minimo = Math.min(...servicios.flatMap(s => Object.values(s.precios)));
  $('#desde').textContent = `Lavados desde ${Datos.dinero(minimo)}`;

  // Abierto / cerrado según el horario de negocio.json
  function pintarEstado() {
    const { apertura, cierre, diasCerrado = [] } = negocio.horario;
    const ahora = new Date();
    const minutos = ahora.getHours() * 60 + ahora.getMinutes();
    const aMin = (h) => { const [hh, mm] = h.split(':').map(Number); return hh * 60 + mm; };
    const abierto = !diasCerrado.includes(ahora.getDay()) && minutos >= aMin(apertura) && minutos < aMin(cierre);
    const el = $('#estado-local');
    el.classList.toggle('abierto', abierto);
    el.textContent = abierto ? `Abierto · cierra ${cierre}` : `Cerrado · abre ${apertura}`;
  }
  pintarEstado();
  setInterval(pintarEstado, 60000);
})();
