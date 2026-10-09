/* Vista dueño: KPIs del día, agenda con estados y resumen de servicios. */
(async () => {
  const $ = (sel) => document.querySelector(sel);
  const esc = Datos.escapar;
  const estado = { negocio: null, servicios: [], reservas: [], fecha: Datos.fechaISO(), filtro: 'todos' };

  try {
    [estado.negocio, estado.servicios, estado.reservas] =
      await Promise.all([Datos.negocio(), Datos.servicios(), Datos.reservas()]);
  } catch (err) {
    $('main').insertAdjacentHTML('afterbegin', `<div class="aviso">No se pudieron cargar los datos. ${esc(err.message)}</div>`);
    return;
  }
  const { negocio, servicios } = estado;
  document.querySelectorAll('[data-negocio="nombre"]').forEach(el => { el.textContent = negocio.nombre; });

  const servicioPorId = (id) => servicios.find(s => s.id === id);
  const nombreVehiculo = (id) => negocio.tiposVehiculo.find(v => v.id === id)?.nombre ?? id;
  const delDia = () => estado.reservas
    .filter(r => r.fecha === estado.fecha)
    .sort((a, b) => a.hora.localeCompare(b.hora));

  // ---- Fecha ----
  function moverDia(dias) {
    const f = new Date(estado.fecha + 'T12:00:00');
    f.setDate(f.getDate() + dias);
    estado.fecha = Datos.fechaISO(f);
    pintar();
  }
  $('#dia-anterior').addEventListener('click', () => moverDia(-1));
  $('#dia-siguiente').addEventListener('click', () => moverDia(1));
  $('#ir-hoy').addEventListener('click', () => { estado.fecha = Datos.fechaISO(); pintar(); });
  $('#fecha').addEventListener('change', (e) => { if (e.target.value) { estado.fecha = e.target.value; pintar(); } });

  // ---- KPIs ----
  function pintarKpis(lista) {
    const activas = lista.filter(r => r.estado !== 'cancelada');
    const ingresos = activas.reduce((t, r) => t + (r.precio || 0), 0);
    const enCurso = activas.filter(r => r.estado === 'pendiente' || r.estado === 'en-proceso').length;
    const kpis = [
      ['Reservas', activas.length],
      ['Ingresos estimados', Datos.dinero(ingresos)],
      ['Ticket promedio', activas.length ? Datos.dinero(Math.round(ingresos / activas.length)) : '—'],
      ['Por atender', enCurso]
    ];
    $('#kpis').innerHTML = kpis.map(([etq, val]) =>
      `<div class="tarjeta kpi"><div class="etiqueta">${etq}</div><div class="valor">${val}</div></div>`).join('');
  }

  // ---- Agenda ----
  function pintarFiltro(lista) {
    const opciones = [['todos', 'Todos', lista.length],
      ...Object.entries(Datos.ESTADOS).map(([id, e]) => [id, e.texto, lista.filter(r => r.estado === id).length])];
    $('#filtro-estado').innerHTML = opciones.map(([id, texto, n]) =>
      `<button type="button" data-filtro="${id}" aria-pressed="${estado.filtro === id}">${texto} (${n})</button>`).join('');
  }

  function pintarAgenda(lista) {
    const visibles = estado.filtro === 'todos' ? lista : lista.filter(r => r.estado === estado.filtro);
    if (!visibles.length) {
      $('#agenda').innerHTML = '<li class="tarjeta vacio">No hay reservas para mostrar.</li>';
      return;
    }
    $('#agenda').innerHTML = visibles.map(r => {
      const info = Datos.ESTADOS[r.estado] ?? { texto: r.estado };
      const siguiente = info.siguiente;
      const activa = r.estado !== 'entregado' && r.estado !== 'cancelada';
      const servicio = servicioPorId(r.servicioId);
      const msj = encodeURIComponent(`Hola ${r.cliente}, tu vehículo patente ${r.patente} ya está listo para retiro. ¡Gracias por preferir ${negocio.nombre}!`);
      return `
        <li class="tarjeta turno ${r.estado}">
          <div class="turno-cabecera">
            <span class="turno-hora">${esc(r.hora)}</span>
            <span class="chip ${esc(r.estado)}">${esc(info.texto)}</span>
          </div>
          <div class="turno-detalle">
            <span><strong>${esc(servicio?.nombre ?? r.servicioId)}</strong> · ${esc(nombreVehiculo(r.vehiculo))}</span>
            <span class="patente">${esc(r.patente)}</span>
            <span>${esc(r.cliente)}</span>
            <span><strong>${Datos.dinero(r.precio)}</strong></span>
          </div>
          <div class="turno-acciones">
            ${siguiente ? `<button type="button" class="btn btn-primario btn-sm" data-id="${esc(r.id)}" data-estado="${siguiente}">Marcar ${Datos.ESTADOS[siguiente].texto.toLowerCase()}</button>` : ''}
            ${r.estado === 'listo' ? `<a class="btn btn-secundario btn-sm" target="_blank" rel="noopener" href="https://wa.me/${esc(r.telefono)}?text=${msj}">
                <svg class="icono" aria-hidden="true"><use href="#i-mensaje"></use></svg> Avisar al cliente</a>` : ''}
            ${activa ? `<button type="button" class="btn btn-peligro btn-sm" data-id="${esc(r.id)}" data-estado="cancelada">Cancelar</button>` : ''}
          </div>
        </li>`;
    }).join('');
  }

  $('#filtro-estado').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filtro]');
    if (!btn) return;
    estado.filtro = btn.dataset.filtro;
    pintar();
  });

  $('#agenda').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-estado]');
    if (!btn) return;
    if (btn.dataset.estado === 'cancelada' && !confirm('¿Cancelar esta reserva?')) return;
    Datos.cambiarEstado(btn.dataset.id, btn.dataset.estado);
    const r = estado.reservas.find(x => x.id === btn.dataset.id);
    if (r) r.estado = btn.dataset.estado;
    pintar();
  });

  // ---- Servicios del día ----
  function pintarMix(lista) {
    const activas = lista.filter(r => r.estado !== 'cancelada');
    const conteo = servicios.map(s => ({ nombre: s.nombre, n: activas.filter(r => r.servicioId === s.id).length }))
      .filter(x => x.n > 0)
      .sort((a, b) => b.n - a.n);
    const max = Math.max(1, ...conteo.map(x => x.n));
    $('#mix-servicios').innerHTML = conteo.length
      ? conteo.map(x => `
          <div class="barra-fila">
            <div class="cab"><span>${esc(x.nombre)}</span><strong>${x.n}</strong></div>
            <div class="barra-pista" aria-hidden="true"><div class="barra-relleno" style="width:${(x.n / max) * 100}%"></div></div>
          </div>`).join('')
      : '<p class="texto-2" style="margin:0">Sin servicios este día.</p>';
  }

  function pintarPrecios() {
    const tipos = negocio.tiposVehiculo;
    $('#tabla-precios').innerHTML = `
      <thead><tr><th>Servicio</th>${tipos.map(t => `<th class="num">${esc(t.nombre)}</th>`).join('')}</tr></thead>
      <tbody>${servicios.map(s => `<tr><td>${esc(s.nombre)}</td>${tipos.map(t => `<td class="num">${Datos.dinero(s.precios[t.id])}</td>`).join('')}</tr>`).join('')}</tbody>`;
  }

  function pintar() {
    const lista = delDia();
    $('#fecha').value = estado.fecha;
    const esHoy = estado.fecha === Datos.fechaISO();
    const texto = new Date(estado.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
    $('#titulo-dia').textContent = esHoy ? `Hoy, ${texto}` : texto.charAt(0).toUpperCase() + texto.slice(1);
    pintarKpis(lista);
    pintarFiltro(lista);
    pintarAgenda(lista);
    pintarMix(lista);
  }

  $('#reiniciar-demo').addEventListener('click', async () => {
    if (!confirm('¿Borrar las reservas de prueba y volver a los datos de ejemplo?')) return;
    Datos.reiniciarDemo();
    estado.reservas = await Datos.reservas();
    estado.filtro = 'todos';
    pintar();
  });

  pintarPrecios();
  pintar();
})();
