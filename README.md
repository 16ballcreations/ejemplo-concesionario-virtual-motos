# KOVE · Concesionario virtual: concepto

Concepto de [16 Ball Creations](https://16ballcreations.com) de un **concesionario virtual de motos**: se entra a la
tienda bajando (video movido por el scroll), se recorre el salón y cada moto se gira en 360° con sus piezas,
plano técnico, sedes, competición, noticias y asesor.

Publicado en https://16ballcreations.github.io/ejemplo-concesionario-virtual-motos/

> **Concepto no oficial.** No está hecho por KOVE ni por Carrera Motos ni afiliado a ellos. La marca, los logos, las
> fotos y los datos técnicos son de sus dueños y se tomaron de kovemotocolombia.co y kovemoto.com para la propuesta.
> El panel «Hablar con un asesor» no envía nada: solo muestra avisos de demo. La página lleva `noindex`.

Sin modelos 3D: el giro de la 450RR son 320 cuadros (`media/giro/450rr`) normalizados con `herramientas/exportar-giro.py`.
La entrada son 190 cuadros (`media/entrada`) del video de transición fachada → salón; el primero y el último salen de las imágenes 2K de las que se hizo el video: `py -3 herramientas/exportar-entrada.py` (fuentes en `fuentes/entrada-v3`).
La fachada, el salón y la entrada se generaron con IA (Artlist). Las fuentes pesadas (`fuentes/`) no van al repo.

El modelo 3D de la 450RR (`media/3d/450rr.glb`, visor en `js/visor3d.js`) es una prueba generada con IA desde una foto oficial; se deja a tamaño real con `node herramientas/escalar-glb.mjs <entrada.glb> <salida.glb> 2.015`.

El PDF del plano técnico (`media/plano/kove-450rr-plano-tecnico.pdf`) es una hoja carta vertical ocupada entera por la lámina de la página: con el servidor corriendo, `node herramientas/pdf-plano.mjs` (`PAPEL=a4` para A4). Hay que regenerarlo si cambia la lámina.

Para verlo en local: `node herramientas/servir.mjs 4390`.

## Datos de las motos

- `js/motos-datos.js` se genera con `node herramientas/datos-motos.mjs`: une lo escrito a mano en `herramientas/motos-base.mjs` (panel, puntos sobre la moto, plano técnico y galería «Por qué elegirla») con la ficha investigada y con fuentes de `fuentes/investigacion/motos.json` (fuera del repo).
- La 450RR gira con 320 cuadros; la 350R, la 625X y la 800X Pro con las vistas oficiales de KOVE Colombia y kovemoto.com, recortadas con `node herramientas/recortar-vistas.mjs` (`UNION=1` para el giro).
- Los PDF del plano técnico de las cuatro motos salen con `node herramientas/pdf-plano.mjs` (o solo algunas: `... http://localhost:4390/ 350r,625x`).
- Fotos de la galería: kovemoto.com y prensa, reducidas con `herramientas/redimensionar.mjs`. Sin licencia publicada: uso de concepto, con aviso de no afiliación.

## Barra de compra

- `js/compra.js`: «Cotizar» abre el resumen (moto, color, precio con el bono de reserva) y el simulador de cuotas, sin pedir datos. La tasa es ilustrativa (`TASA`, 1,8 % mes vencido). «Compartir» copia un enlace `#cotizar=<moto>-<color>-<inicial>-<plazo>-<bono>` que abre la misma cotización.
- «Prueba de manejo» lista las vitrinas de `js/concesionarios.js` (`window.KOVE_SEDES`); «Sedes» lleva al buscador. En la demo nada se envía.
- Vista del piloto: botón «Piloto» sobre la moto, con la foto oficial del tablero (`piloto` en `motos-base.mjs`, fotos en `media/piloto`).
- Precio, bono y nota legal salen de kovemotocolombia.co/es/precios: no incluyen matrícula, placas ni SOAT.
