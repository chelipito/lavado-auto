# Alta Vista Carwash — app de reservas (demo)

App web para una pyme de lavado de autos con dos vistas:

- **Cliente** (`cliente.html`): servicios y precios por tipo de vehículo, reserva de hora con disponibilidad, consulta de estado por patente.
- **Dueño** (`dueno.html`): KPIs del día, agenda con cambio de estado (Pendiente → En proceso → Listo → Entregado), aviso por WhatsApp y resumen de servicios.

> Nombre, dirección, servicios y precios tomados del afiche del local. Teléfono, WhatsApp, horario, duraciones y reservas son **de ejemplo**.

## ¿Qué archivo edito?

| Quiero cambiar… | Archivo |
|---|---|
| Nombre, dirección, horario, WhatsApp, capacidad del local | `data/negocio.json` |
| Servicios, descripciones, duración, precios | `data/servicios.json` |
| Reservas de ejemplo del panel | `data/reservas-demo.json` |
| Colores, tipografía, espaciados | `css/estilos.css` |
| Íconos | `js/iconos.js` |
| Comportamiento de la vista cliente | `js/cliente.js` / `cliente.html` |
| Comportamiento de la vista dueño | `js/dueno.js` / `dueno.html` |
| Dónde se leen/guardan los datos (futura base de datos) | `js/datos.js` |

## Probar en el computador

Los JSON se cargan con `fetch`, que no funciona abriendo el archivo con doble clic. Hay que levantar un servidor local:

```
cd 01-Apps/lavado-auto
python -m http.server 8000
```

Luego abrir http://localhost:8000

## Limitaciones actuales
- Las reservas nuevas se guardan solo en el navegador de quien reserva (localStorage): el dueño no las ve desde otro dispositivo. Se resuelve con la base de datos.
- La vista del dueño no tiene login. No publicar datos reales hasta agregar autenticación.
