# KOVE · Concesionario virtual: concepto

Concepto de [16 Ball Creations](https://16ballcreations.com) de un **concesionario virtual de motos**: se entra a la
tienda bajando (video movido por el scroll), se recorre el salón y cada moto se gira en 360° con sus piezas,
plano técnico, sedes, competición, noticias y asesor.

Publicado en https://16ballcreations.github.io/ejemplo-concesionario-virtual-motos/

> **Concepto no oficial.** No está hecho por KOVE ni por Carrera Motos ni afiliado a ellos. La marca, los logos, las
> fotos y los datos técnicos son de sus dueños y se tomaron de kovemotocolombia.co y kovemoto.com para la propuesta.
> El panel «Hablar con un asesor» no envía nada: solo muestra avisos de demo. La página lleva `noindex`.

Sin modelos 3D: el giro de la 450RR son 320 cuadros (`media/giro/450rr`) normalizados con `herramientas/exportar-giro.py`.
La fachada, el salón y la entrada se generaron con IA (Artlist). Las fuentes pesadas (`fuentes/`) no van al repo.

El modelo 3D de la 450RR (`media/3d/450rr.glb`, visor en `js/visor3d.js`) es una prueba generada con IA desde una foto oficial; se deja a tamaño real con `node herramientas/escalar-glb.mjs <entrada.glb> <salida.glb> 2.015`.

El PDF del plano técnico (`media/plano/kove-450rr-plano-tecnico.pdf`) es una hoja carta vertical ocupada entera por la lámina de la página: con el servidor corriendo, `node herramientas/pdf-plano.mjs` (`PAPEL=a4` para A4). Hay que regenerarlo si cambia la lámina.

Para verlo en local: `node herramientas/servir.mjs 4390`.
