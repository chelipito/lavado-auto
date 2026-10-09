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
      ['Ingresos estimados', Datos.dinero(ingresos), 'ancho'],
      ['Reservas', activas.length, ''],
      ['Por atender', enCurso, '']
    ];
    $('#kpis').innerHTML = kpis.map(([etq, val, clase]) =>
      `<div class="tarjeta kpi ${clase}"><div class="etiqueta">${etq}</div><div class="valor">${val}</div></div>`).join('');
  }

  // ---- Ranking: qué servicio se vende más (cantidad; ingresos como dato de apoyo) ----
  estado.periodo = 1; // días hacia atrás desde la fecha elegida, incluyéndola

  function reservasDelPeriodo() {
    const fin = new Date(estado.fecha + 'T12:00:00');
    const ini = new Date(fin);
    ini.setDate(ini.getDate() - (estado.periodo - 1));
    const desde = Datos.fechaISO(ini);
    return estado.reservas.filter(r => r.fecha >= desde && r.fecha <= estado.fecha && r.estado !== 'cancelada');
  }

  function pintarRanking() {
    const lista = reservasDelPeriodo();
    const total = lista.length;
    const filas = servicios.map(s => {
      const delServicio = lista.filter(r => r.servicioId === s.id);
      return { nombre: s.nombre, n: delServicio.length, ingresos: delServicio.reduce((t, r) => t + (r.precio || 0), 0) };
    }).sort((a, b) => b.n - a.n || b.ingresos - a.ingresos);
    const max = Math.max(1, ...filas.map(f => f.n));

    if (!total) {
      $('#ranking').innerHTML = '<li class="vacio" style="padding:16px 0">Sin ventas en este período.</li>';
      $('#ranking-nota').textContent = '';
      return;
    }
    $('#ranking').innerHTML = filas.map((f, i) => {
      const pct = Math.round((f.n / total) * 100);
      const lider = i === 0 && f.n > 0;
      return `
        <li class="ranking-fila" title="${esc(f.nombre)}: ${f.n} de ${total} lavados (${pct}%) · ${Datos.dinero(f.ingresos)}">
          <div class="ranking-texto">
            <span class="ranking-nombre">${esc(f.nombre)}${lider ? ' <span class="chip listo">Más vendido</span>' : ''}</span>
            <span class="ranking-valor"><strong>${f.n}</strong> · ${pct}%</span>
          </div>
          <div class="ranking-pista" aria-hidden="true">
            <div class="ranking-barra" style="width:${(f.n / max) * 100}%"></div>
          </div>
          <span class="ranking-ingresos">${Datos.dinero(f.ingresos)} en ventas</span>
        </li>`;
    }).join('');
    $('#ranking-nota').textContent = `${total} lavados ${estado.periodo === 1 ? 'este día' : 'en los últimos 7 días'} (sin contar cancelados).`;
  }

  $('#periodo-ranking').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-periodo]');
    if (!btn) return;
    estado.periodo = Number(btn.dataset.periodo);
    $('#periodo-ranking').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    pintarRanking();
  });

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

  // Vehículos en filas y servicios en columnas (igual que el afiche del local).
  function pintarPrecios() {
    const tipos = negocio.tiposVehiculo;
    $('#tabla-precios').innerHTML = `
      <thead><tr><th>Vehículo</th>${servicios.map(s => `<th class="num">${esc(s.nombre.replace(/^Lavado /, ''))}</th>`).join('')}</tr></thead>
      <tbody>${tipos.map(t => `<tr><td>${esc(t.nombre)}</td>${servicios.map(s => `<td class="num">${Datos.dinero(s.precios[t.id])}</td>`).join('')}</tr>`).join('')}</tbody>`;
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
    pintarRanking();
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
