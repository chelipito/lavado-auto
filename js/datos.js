/*
 * Capa de datos de la app.
 * Hoy: lee los JSON de /data y guarda reservas nuevas en el navegador (localStorage).
 * Mañana: al conectar la base de datos, SOLO se reescribe este archivo;
 * cliente.js y dueno.js siguen llamando a las mismas funciones.
 */
const Datos = (() => {
  const CLAVE_RESERVAS = 'lavado.reservas';
  const CLAVE_ESTADOS = 'lavado.estados'; // cambios de estado hechos por el dueño

  const ESTADOS = {
    'pendiente':  { texto: 'Pendiente',  siguiente: 'en-proceso' },
    'en-proceso': { texto: 'En proceso', siguiente: 'listo' },
    'listo':      { texto: 'Listo',      siguiente: 'entregado' },
    'entregado':  { texto: 'Entregado',  siguiente: null },
    'cancelada':  { texto: 'Cancelada',  siguiente: null }
  };

  async function cargarJSON(ruta) {
    const resp = await fetch(ruta, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`No se pudo cargar ${ruta}`);
    return resp.json();
  }

  function leerLocal(clave, porDefecto) {
    try { return JSON.parse(localStorage.getItem(clave)) ?? porDefecto; }
    catch { return porDefecto; }
  }

  function guardarLocal(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); return true; }
    catch { return false; }
  }

  // ---- Utilidades de fecha/hora y formato ----
  function fechaISO(fecha = new Date()) {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const aMinutos = (hora) => { const [h, m] = hora.split(':').map(Number); return h * 60 + m; };
  const aHora = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

  const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
  const dinero = (monto) => formatoCLP.format(monto || 0);

  // Evita que textos escritos por clientes (nombre, patente) se interpreten como HTML.
  const escapar = (txt) => String(txt ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---- Lectura ----
  const negocio = () => cargarJSON('data/negocio.json');
  const servicios = () => cargarJSON('data/servicios.json');

  async function reservas() {
    // Las reservas demo usan "dia" relativo a hoy (0 = hoy, -1 = ayer) para que el bosquejo siempre tenga datos.
    const demo = await cargarJSON('data/reservas-demo.json').catch(() => []);
    const hoy = new Date();
    const demoConFecha = demo.map(({ dia = 0, ...r }) => {
      const f = new Date(hoy);
      f.setDate(f.getDate() + dia);
      return { ...r, fecha: fechaISO(f) };
    });
    const estados = leerLocal(CLAVE_ESTADOS, {});
    return [...demoConFecha, ...leerLocal(CLAVE_RESERVAS, [])]
      .map(r => (estados[r.id] ? { ...r, estado: estados[r.id] } : r));
  }

  // ---- Escritura ----
  function crearReserva(datos) {
    const reserva = {
      ...datos,
      id: 'R' + Date.now().toString(36).toUpperCase(),
      estado: 'pendiente',
      creada: new Date().toISOString()
    };
    const lista = leerLocal(CLAVE_RESERVAS, []);
    lista.push(reserva);
    if (!guardarLocal(CLAVE_RESERVAS, lista)) throw new Error('No se pudo guardar la reserva en este navegador.');
    return reserva;
  }

  function cambiarEstado(id, estado) {
    const estados = leerLocal(CLAVE_ESTADOS, {});
    estados[id] = estado;
    guardarLocal(CLAVE_ESTADOS, estados);
  }

  // ---- Disponibilidad ----
  // Un horario está libre si, durante toda la duración del servicio, hay menos autos que la capacidad del local.
  function horariosDisponibles({ negocio, servicios, reservas, fecha, duracionMin }) {
    const { apertura, cierre, intervaloMin, diasCerrado = [] } = negocio.horario;
    const diaSemana = new Date(fecha + 'T12:00:00').getDay();
    if (diasCerrado.includes(diaSemana)) return [];

    const duracionDe = (r) => servicios.find(s => s.id === r.servicioId)?.duracionMin ?? 30;
    const ocupadas = reservas
      .filter(r => r.fecha === fecha && r.estado !== 'cancelada')
      .map(r => ({ ini: aMinutos(r.hora), fin: aMinutos(r.hora) + duracionDe(r) }));

    const ahora = new Date();
    const minimo = fecha === fechaISO(ahora) ? ahora.getHours() * 60 + ahora.getMinutes() : -1;

    const libres = [];
    for (let ini = aMinutos(apertura); ini + duracionMin <= aMinutos(cierre); ini += intervaloMin) {
      if (ini <= minimo) continue;
      const fin = ini + duracionMin;
      const cruces = ocupadas.filter(o => o.ini < fin && o.fin > ini).length;
      if (cruces < negocio.capacidadSimultanea) libres.push(aHora(ini));
    }
    return libres;
  }

  return { ESTADOS, negocio, servicios, reservas, crearReserva, cambiarEstado, horariosDisponibles, fechaISO, dinero, escapar };
})();
