/* Vista cliente: catálogo, reserva y consulta de estado. */
(async () => {
  const $ = (sel) => document.querySelector(sel);
  const estado = { negocio: null, servicios: [], reservas: [], vehiculo: 'auto', hora: null };

  try {
    [estado.negocio, estado.servicios, estado.reservas] =
      await Promise.all([Datos.negocio(), Datos.servicios(), Datos.reservas()]);
  } catch (err) {
    document.querySelector('main').insertAdjacentHTML('afterbegin',
      `<div class="contenedor" style="padding-top:16px"><div class="aviso">No se pudieron cargar los datos. ${err.message}</div></div>`);
    return;
  }
  const { negocio, servicios } = estado;
  estado.vehiculo = negocio.tiposVehiculo[0].id;

  // ---- Datos del negocio en la página ----
  const textos = { nombre: negocio.nombre, eslogan: negocio.eslogan, direccion: negocio.direccion, telefono: negocio.telefono, horario: negocio.horario.texto };
  document.querySelectorAll('[data-negocio]').forEach(el => { el.textContent = textos[el.dataset.negocio] ?? ''; });
  document.title = `Reserva tu lavado · ${negocio.nombre}`;

  const nombreVehiculo = (id) => negocio.tiposVehiculo.find(v => v.id === id)?.nombre ?? id;
  const servicioPorId = (id) => servicios.find(s => s.id === id);

  // ---- Catálogo ----
  function pintarFiltro() {
    $('#filtro-vehiculo').innerHTML = negocio.tiposVehiculo.map(v =>
      `<button type="button" data-vehiculo="${v.id}" aria-pressed="${v.id === estado.vehiculo}">${v.nombre}</button>`).join('');
  }

  function pintarServicios() {
    $('#lista-servicios').innerHTML = servicios.map(s => `
      <article class="tarjeta servicio ${s.destacado ? 'destacado' : ''}">
        ${s.destacado ? '<span class="etiqueta-destacado">Más pedido</span>' : ''}
        <h3>${s.nombre}</h3>
        <p class="texto-2" style="margin:0">${s.descripcion}</p>
        <span class="duracion"><svg class="icono" aria-hidden="true"><use href="#i-reloj"></use></svg>${s.duracionMin} min aprox.</span>
        <span class="precio">${Datos.dinero(s.precios[estado.vehiculo])}</span>
        <button type="button" class="btn ${s.destacado ? 'btn-primario' : 'btn-secundario'}" data-elegir="${s.id}">Elegir</button>
      </article>`).join('');
  }

  $('#filtro-vehiculo').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-vehiculo]');
    if (!btn) return;
    estado.vehiculo = btn.dataset.vehiculo;
    $('#f-vehiculo').value = estado.vehiculo;
    pintarFiltro(); pintarServicios(); pintarHorarios();
  });

  $('#lista-servicios').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-elegir]');
    if (!btn) return;
    $('#f-servicio').value = btn.dataset.elegir;
    pintarHorarios();
    $('#reservar').scrollIntoView();
    $('#f-servicio').focus({ preventScroll: true });
  });

  // ---- Formulario de reserva ----
  $('#f-servicio').innerHTML = servicios.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');
  $('#f-servicio').value = servicios.find(s => s.destacado)?.id ?? servicios[0].id;
  $('#f-vehiculo').innerHTML = negocio.tiposVehiculo.map(v => `<option value="${v.id}">${v.nombre}</option>`).join('');
  $('#f-vehiculo').value = estado.vehiculo;
  $('#f-fecha').min = Datos.fechaISO();
  $('#f-fecha').value = Datos.fechaISO();

  function pintarHorarios() {
    const servicio = servicioPorId($('#f-servicio').value);
    const libres = Datos.horariosDisponibles({
      negocio, servicios, reservas: estado.reservas,
      fecha: $('#f-fecha').value, duracionMin: servicio.duracionMin
    });
    if (!libres.includes(estado.hora)) estado.hora = null;
    $('#f-horarios').innerHTML = libres.length
      ? libres.map(h => `<button type="button" data-hora="${h}" aria-pressed="${h === estado.hora}">${h}</button>`).join('')
      : '<p class="horarios-vacio">No hay horas disponibles este día. Prueba con otra fecha.</p>';
    pintarResumen();
  }

  function pintarResumen() {
    const servicio = servicioPorId($('#f-servicio').value);
    const vehiculo = $('#f-vehiculo').value;
    $('#resumen').innerHTML = `
      <div class="texto-2">${servicio.nombre} · ${nombreVehiculo(vehiculo)}${estado.hora ? ` · ${estado.hora} h` : ''}</div>
      <div class="total">${Datos.dinero(servicio.precios[vehiculo])}</div>`;
  }

  $('#f-horarios').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-hora]');
    if (!btn) return;
    estado.hora = btn.dataset.hora;
    $('#e-hora').textContent = '';
    pintarHorarios();
  });
  $('#f-servicio').addEventListener('change', pintarHorarios);
  $('#f-fecha').addEventListener('change', pintarHorarios);
  $('#f-vehiculo').addEventListener('change', () => {
    estado.vehiculo = $('#f-vehiculo').value;
    pintarFiltro(); pintarServicios(); pintarResumen();
  });

  const normalizarPatente = (txt) => txt.toUpperCase().replace(/[^A-Z0-9]/g, '');

  function validar() {
    const reglas = [
      ['nombre', $('#f-nombre').value.trim().length >= 2, 'Ingresa tu nombre.'],
      ['telefono', $('#f-telefono').value.replace(/\D/g, '').length >= 8, 'Ingresa un teléfono válido.'],
      ['patente', /^[A-Z0-9]{5,8}$/.test(normalizarPatente($('#f-patente').value)), 'Ingresa la patente (ej. ABCD12).']
    ];
    let primeroInvalido = null;
    reglas.forEach(([campo, ok, msj]) => {
      const input = $(`#f-${campo}`);
      input.setAttribute('aria-invalid', String(!ok));
      $(`#e-${campo}`).textContent = ok ? '' : msj;
      if (!ok && !primeroInvalido) primeroInvalido = input;
    });
    if (!estado.hora) {
      $('#e-hora').textContent = 'Elige una hora.';
      primeroInvalido ??= $('#f-horarios button') ?? $('#f-fecha');
    }
    primeroInvalido?.focus();
    return !primeroInvalido;
  }

  $('#form-reserva').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validar()) return;
    const servicio = servicioPorId($('#f-servicio').value);
    const vehiculo = $('#f-vehiculo').value;
    try {
      const reserva = Datos.crearReserva({
        fecha: $('#f-fecha').value,
        hora: estado.hora,
        servicioId: servicio.id,
        vehiculo,
        cliente: $('#f-nombre').value.trim(),
        telefono: $('#f-telefono').value.replace(/\D/g, ''),
        patente: normalizarPatente($('#f-patente').value),
        precio: servicio.precios[vehiculo] // se guarda el precio del momento de la reserva
      });
      estado.reservas.push(reserva);
      mostrarConfirmacion(reserva, servicio);
      $('#form-reserva').reset();
      $('#f-fecha').value = Datos.fechaISO();
      $('#f-vehiculo').value = estado.vehiculo;
      estado.hora = null;
      pintarHorarios();
    } catch (err) {
      $('#e-hora').textContent = err.message;
    }
  });

  function mostrarConfirmacion(r, servicio) {
    const fecha = new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
    const texto = encodeURIComponent(`Hola, reservé ${servicio.nombre} para el ${fecha} a las ${r.hora}. Patente ${r.patente}. Código ${r.id}.`);
    const caja = $('#confirmacion');
    caja.hidden = false;
    caja.innerHTML = `
      <div class="aviso exito" role="status" style="margin-bottom:12px">
        <svg class="icono" aria-hidden="true"><use href="#i-check"></use></svg>
        <div>
          <strong>¡Reserva confirmada!</strong><br>
          ${servicio.nombre} · ${fecha}, ${r.hora} h<br>
          Patente <span class="patente">${r.patente}</span> · Código ${r.id}
        </div>
      </div>
      <a class="btn btn-secundario btn-bloque" style="margin-bottom:12px" target="_blank" rel="noopener"
         href="https://wa.me/${negocio.whatsapp}?text=${texto}">
        <svg class="icono" aria-hidden="true"><use href="#i-mensaje"></use></svg> Avisar por WhatsApp
      </a>`;
    caja.scrollIntoView({ block: 'nearest' });
  }

  // ---- Consulta de estado por patente ----
  $('#form-estado').addEventListener('submit', async (e) => {
    e.preventDefault();
    const patente = normalizarPatente($('#f-buscar-patente').value);
    const hoy = Datos.fechaISO();
    const todas = await Datos.reservas();
    const suyas = todas
      .filter(r => r.patente === patente && r.fecha >= hoy)
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));

    $('#resultado-estado').innerHTML = suyas.length
      ? suyas.map(r => `
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;padding:10px 0;border-top:1px solid var(--borde)">
            <span>${servicioPorId(r.servicioId)?.nombre ?? r.servicioId}<br>
              <span class="texto-2">${r.fecha === hoy ? 'Hoy' : r.fecha} · ${r.hora} h</span></span>
            <span class="chip ${r.estado}">${Datos.ESTADOS[r.estado]?.texto ?? r.estado}</span>
          </div>`).join('')
      : '<p class="texto-2" style="margin:0">No encontramos reservas activas para esa patente.</p>';
  });

  pintarFiltro();
  pintarServicios();
  pintarHorarios();
})();
