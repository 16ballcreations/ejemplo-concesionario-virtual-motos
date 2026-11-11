// Entrada al concesionario: el video avanza con el scroll, cuadro por cuadro, en un canvas.
(() => {
  const TOTAL = 190;                 // cuadros en media/entrada (f000…f189); el primero y el último en 1920 px
  const FIN_VIDEO = 0.82;            // de 0 a este punto del scroll corre el video; luego aparece el salón
  const ANCHO = 1280, ALTO = 720;    // proporción de los cuadros (16:9)

  // Banda del letrero en la fachada, en % del cuadro, según el cuadro (medida siguiendo el marco de luz de la puerta)
  const BANDA = [
    [0, 12.5, 7.9, 87.3, 23.6],
    [10, 11.7, 6.6, 88.2, 22.6],
    [20, 10.3, 4.3, 89.7, 20.9],
    [30, 8.4, 1.2, 91.4, 18.7],
    [40, 6.1, -2.5, 93.7, 15.9],
    [50, 3.1, -7.3, 96.8, 12.3],
    [60, -0.6, -12.9, 100.2, 8.2],
    [70, -5.0, -20.1, 104.7, 2.9],
    [80, -10.4, -28.5, 109.9, -3.3],
  ];

  // La galería: seis motos en un arco, tres por lado, cada una sobre su pedestal y mirando hacia el centro.
  // Posición en unidades de un cuadro 16:9 que cabe en la pantalla (u = 1 % de su ancho): dx desde el centro,
  // y = tapa del pedestal en % del alto, k = alto de la moto en u por metro (las de las orillas, más cerca).
  // alto = alto real de la moto en metros, para que entre ellas guarden la proporción.
  const MOTOS = [
    { id: '800xpro',  nombre: '800X Pro',  familia: 'Adventure · 799 cc', precio: '$ 43.990.000', alto: 1.41, dx: -38.5, y: 79, k: 12.5, anillo: 2 },
    { id: '625x',     nombre: '625 X',     familia: 'Adventure · 581 cc', precio: '$ 38.490.000', alto: 1.39, dx: -25,   y: 67, k: 10.2,  anillo: 1 },
    { id: '350r',     nombre: '350R',      familia: 'Naked · 344 cc',     precio: '$ 23.490.000', alto: 1.08, dx: -11.5, y: 58, k: 8.4,  anillo: 0 },
    { id: '350rr',    nombre: '350RR',     familia: 'Sport · 344 cc',     precio: '$ 25.490.000', alto: 1.10, dx: 11.5,  y: 58, k: 8.4,  anillo: 0 },
    { id: '450rally', nombre: '450 Rally', familia: 'Rally · 449 cc',     precio: '$ 33.990.000', alto: 1.39, dx: 25,    y: 67, k: 10.2,  anillo: 1 },
    { id: '450rr',    nombre: '450RR',     familia: 'Sport · 443 cc',     precio: '$ 36.490.000', alto: 1.09, dx: 38.5,  y: 79, k: 12.5, anillo: 2 },
  ];
  // Proporción (ancho / alto) de cada foto de media/salon
  const PROP = { '800xpro': 1.123, '625x': 0.98, '350r': 1.538, '350rr': 1.735, '450rally': 0.998, '450rr': 1.203 };

  const $ = (s) => document.querySelector(s);
  const seccion = $('#entrada');
  const lienzo = $('#lienzo');
  const ctx = lienzo.getContext('2d');
  const letrero = $('#letrero');
  const intro = $('#intro');
  const salon = $('#salon');
  const contMotos = $('#motos');
  const barra = $('#progreso');
  const cargando = $('#cargando');
  const avanceCarga = $('#cargando-avance');

  const cuadros = new Array(TOTAL);
  let cargados = 0;
  let actual = 0, objetivo = 0, ultimoDibujado = -1;
  let caja = { dx: 0, dy: 0, dw: 0, dh: 0 };
  let enSalon = 0;
  let unidad = 1, anchoV = 1, altoV = 1;   // u en px y tamaño de la pantalla

  // Motos en el DOM: foto, pedestal y ficha
  const nodosMoto = MOTOS.map((m) => {
    const d = document.createElement('div');
    d.className = 'moto moto--anillo' + m.anillo;
    d.style.zIndex = String(10 + m.anillo);
    const src = `media/salon/${m.id}.webp?v=2`;
    d.innerHTML =
      `<span class="pedestal" aria-hidden="true"></span>` +
      `<button class="moto__boton" type="button" aria-label="${m.nombre}, ${m.familia}, desde ${m.precio}">` +
        `<img src="${src}" alt="" draggable="false"></button>` +
      `<div class="ficha"><b>${m.nombre}</b><span>${m.familia}</span><em>Desde ${m.precio}</em>` +
        `<button class="ficha__accion" type="button" data-detalle="${m.id}">Verla a detalle</button>` +
      `</div>`;
    d.querySelector('.moto__boton').addEventListener('click', () => {
      if (recorrido) {
        const k = ORDEN.indexOf(MOTOS.indexOf(m));
        if (k === elegida) abrirDetalle(m.id); else elegir(k);
        return;
      }
      const abierta = d.classList.contains('abierta');
      nodosMoto.forEach((n) => n.classList.remove('abierta'));
      if (!abierta) d.classList.add('abierta');
    });
    d.querySelector('.ficha__accion').addEventListener('click', () => { d.classList.remove('abierta'); abrirDetalle(m.id); });
    contMotos.appendChild(d);
    return d;
  });
  function abrirDetalle(id) { document.dispatchEvent(new CustomEvent('kove:detalle', { detail: { id } })); }
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.moto')) nodosMoto.forEach((n) => n.classList.remove('abierta'));
  });

  function cargar() {
    for (let i = 0; i < TOTAL; i++) {
      const img = new Image();
      img.decoding = 'async';
      img.src = `media/entrada/f${String(i).padStart(3, '0')}.webp`;
      img.onload = img.onerror = () => {
        cargados++;
        avanceCarga.style.width = `${(cargados / TOTAL) * 100}%`;
        if (i === 0) { ultimoDibujado = -1; dibujar(); }
        if (cargados === TOTAL) cargando.classList.add('listo');
      };
      cuadros[i] = img;
    }
    // Si la red es lenta, no dejar al visitante frente a la pantalla de carga
    setTimeout(() => cargando.classList.add('listo'), 6000);
  }

  function medir() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = lienzo.clientWidth, h = lienzo.clientHeight;
    lienzo.width = Math.round(w * dpr);
    lienzo.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const escala = Math.max(w / ANCHO, h / ALTO);
    const dw = ANCHO * escala, dh = ALTO * escala;
    caja = { dx: (w - dw) / 2, dy: (h - dh) / 2, dw, dh };
    anchoV = w; altoV = h;
    unidad = Math.min(w, h * 16 / 9) / 100;
    modoRecorrido(w / h < 1);
    colocarMotos();
    ultimoDibujado = -1;
    dibujar();
  }

  const px = (xPct) => caja.dx + (xPct / 100) * caja.dw;
  const py = (yPct) => caja.dy + (yPct / 100) * caja.dh;

  // Lugar de cada moto: el arco en pantallas anchas; en el teléfono, la elegida al centro y sus vecinas asomadas
  const lugares = [];
  function lugar(i) {
    const m = MOTOS[i];
    if (!recorrido) {
      return { x: anchoV / 2 + m.dx * unidad, y: (m.y / 100) * altoV, alto: m.alto * m.k * unidad, opacidad: 1 };
    }
    const rel = ORDEN.indexOf(i) - elegida;
    const grande = Math.min(anchoV * 0.6, altoV * 0.32) * (m.alto / 1.4);
    const lejos = Math.abs(rel);
    return {
      x: anchoV / 2 + rel * anchoV * 0.6,
      y: altoV * (lejos ? 0.55 : 0.64),
      alto: grande * (lejos ? 0.7 : 1),
      opacidad: lejos === 0 ? 1 : lejos === 1 ? 0.45 : 0,
    };
  }
  function colocarMotos() {
    MOTOS.forEach((m, i) => {
      const l = lugares[i] = lugar(i);
      const n = nodosMoto[i];
      const ancho = l.alto * PROP[m.id];
      // pedestal: un poco más ancho que la moto; la tapa se ve más abierta cuanto más cerca (más abajo) está
      const pw = Math.max(ancho, l.alto * 0.9) * 1.12;
      const abierto = 0.1 + 0.16 * Math.min(1, Math.max(0, (l.y / altoV - 0.45) / 0.4));
      n.style.width = `${ancho}px`;
      n.style.height = `${l.alto}px`;
      n.style.left = `${l.x}px`;
      n.style.top = `${l.y}px`;
      n.style.setProperty('--pw', `${pw}px`);
      n.style.setProperty('--ph', `${pw * abierto}px`);
      n.style.setProperty('--pt', `${Math.max(10, l.alto * 0.13)}px`);
      n.classList.toggle('elegida', recorrido && ORDEN[elegida] === i);
    });
  }

  // ---- Recorrido de lado a lado (teléfono) ----
  const ORDEN = MOTOS.map((m, i) => i);   // ya están de izquierda a derecha
  let elegida = 0;
  let recorrido = false;
  const panel = $('#recorrido');
  const puntosRec = $('#recorrido-puntos');
  ORDEN.forEach(() => puntosRec.appendChild(document.createElement('span')));
  const textoSalon = $('.salon__texto');

  function modoRecorrido(si) {
    recorrido = si;
    panel.hidden = !si;
    salon.classList.toggle('salon--recorrido', si);
    textoSalon.textContent = si ? 'Desliza para ver las demás.' : 'Toca una moto para conocerla.';
    if (si) elegir(elegida, true);
    else nodosMoto.forEach((n) => n.classList.remove('elegida'));
  }

  function elegir(k, directo) {
    elegida = Math.min(ORDEN.length - 1, Math.max(0, k));
    const m = MOTOS[ORDEN[elegida]];
    $('#recorrido-nombre').textContent = m.nombre;
    $('#recorrido-familia').textContent = m.familia + ' · ' + m.precio;
    $('#recorrido-asesor').dataset.asesor = m.nombre;
    [...puntosRec.children].forEach((p, x) => p.classList.toggle('activo', x === elegida));
    $('#recorrido-antes').disabled = elegida === 0;
    $('#recorrido-despues').disabled = elegida === ORDEN.length - 1;
    if (!directo) { colocarMotos(); capas(progreso()); }
  }

  $('#recorrido-antes').addEventListener('click', () => elegir(elegida - 1));
  $('#recorrido-despues').addEventListener('click', () => elegir(elegida + 1));
  $('#recorrido-detalle').addEventListener('click', () => abrirDetalle(MOTOS[ORDEN[elegida]].id));
  // Deslizar con el dedo sobre el salón (el scroll vertical sigue funcionando)
  let toque = null;
  salon.addEventListener('touchstart', (e) => { if (recorrido) toque = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
  salon.addEventListener('touchend', (e) => {
    if (!toque) return;
    const dx = e.changedTouches[0].clientX - toque.x, dy = e.changedTouches[0].clientY - toque.y;
    toque = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) elegir(elegida + (dx < 0 ? 1 : -1));
  }, { passive: true });

  function progreso() {
    const r = seccion.getBoundingClientRect();
    const recorrido = r.height - window.innerHeight;
    return Math.min(1, Math.max(0, -r.top / recorrido));
  }

  function banda(f) {
    for (let i = 0; i < BANDA.length - 1; i++) {
      const a = BANDA[i], b = BANDA[i + 1];
      if (f <= b[0]) {
        const t = (f - a[0]) / (b[0] - a[0]);
        return a.map((v, k) => (k === 0 ? f : v + (b[k] - v) * t));
      }
    }
    return BANDA[BANDA.length - 1];
  }

  function dibujar() {
    const i = Math.round(actual);
    if (i === ultimoDibujado) return;
    let img = cuadros[i];
    // Si ese cuadro aún no carga, usar el más cercano ya cargado
    for (let d = 1; (!img || !img.complete || !img.naturalWidth) && d < TOTAL; d++) {
      img = cuadros[i - d] && cuadros[i - d].naturalWidth ? cuadros[i - d] : cuadros[i + d];
    }
    if (!img || !img.naturalWidth) return;
    ctx.drawImage(img, caja.dx, caja.dy, caja.dw, caja.dh);
    ultimoDibujado = i;
  }

  function capas(p) {
    const f = actual;

    // Logo sobre el letrero: sigue a la banda y se apaga al cruzar la puerta
    const [, x1, y1, x2, y2] = banda(f);
    const alto = (py(y2) - py(y1)) * 0.5;
    letrero.style.width = `${(alto * 389.73) / 78.78}px`;
    letrero.style.left = `${px((x1 + x2) / 2)}px`;
    letrero.style.top = `${py((y1 + y2) / 2)}px`;
    letrero.style.opacity = String(Math.max(0, 1 - Math.max(0, f - 55) / 20));

    // Texto de bienvenida: se va en el primer tramo
    const oIntro = Math.max(0, 1 - p / 0.12);
    intro.style.opacity = String(oIntro);
    intro.style.transform = `translateY(${(1 - oIntro) * -20}px)`;
    intro.style.visibility = oIntro < 0.01 ? 'hidden' : 'visible';

    // Salón: aparece cuando termina el video
    const oSalon = Math.min(1, Math.max(0, (p - FIN_VIDEO) / 0.08));
    enSalon = oSalon;
    // Panel del teléfono: solo cuando las motos ya están en su pedestal (97 % del recorrido)
    const panelListo = p >= 0.97;
    if (panel.classList.contains("visible") !== panelListo) {
      panel.classList.toggle("visible", panelListo);
      panel.inert = !panelListo;
    }
    const rs = seccion.getBoundingClientRect();
    document.body.classList.toggle('salon-en-pantalla', oSalon > 0.6 && rs.bottom > window.innerHeight * 0.6);
    salon.style.opacity = String(oSalon);
    salon.classList.toggle('activo', oSalon > 0.6);
    document.body.classList.toggle('en-salon', oSalon > 0.6);
    salon.setAttribute('aria-hidden', oSalon > 0.6 ? 'false' : 'true');
    // El salón de la foto queda de fondo, desenfocado y oscuro, para que mande la galería
    lienzo.style.filter = oSalon > 0 ? `blur(${(oSalon * 7).toFixed(1)}px) brightness(${(1 - oSalon * 0.5).toFixed(2)})` : '';
    // Las motos nacen del centro y se abren hacia su pedestal: primero las del fondo, luego las de las orillas
    nodosMoto.forEach((n, k) => {
      const m = MOTOS[k], l = lugares[k];
      if (!l) return;
      const t = Math.min(1, Math.max(0, (p - FIN_VIDEO - 0.03 * (recorrido ? 0 : m.anillo)) / 0.08));
      const e = 1 - Math.pow(1 - t, 3);
      const hacia = (anchoV / 2 - l.x) * (1 - e);
      n.style.opacity = String(e * l.opacidad);
      n.style.transform = `translate(calc(-50% + ${hacia.toFixed(1)}px), calc(-100% + ${((1 - e) * -6).toFixed(1)}vh)) scale(${(0.55 + 0.45 * e).toFixed(3)})`;
      n.style.visibility = e * l.opacidad < 0.01 ? 'hidden' : 'visible';
    });

    barra.style.height = `${p * 100}%`;
  }

  let ultimoPaso = 0;
  function paso(directo) {
    const p = progreso();
    objetivo = Math.min(1, p / FIN_VIDEO) * (TOTAL - 1);
    // Suavizado: el cuadro se acerca al objetivo sin saltos (directo cuando no hay animación disponible)
    actual = directo ? objetivo : actual + (objetivo - actual) * 0.18;
    if (Math.abs(objetivo - actual) < 0.01) actual = objetivo;
    capas(p);
    dibujar();
  }
  function bucle(t) {
    ultimoPaso = t;
    paso(false);
    requestAnimationFrame(bucle);
  }
  // Si el navegador pausa las animaciones (pestaña en segundo plano), el scroll igual mueve la escena
  window.addEventListener('scroll', () => {
    if (performance.now() - ultimoPaso > 120) paso(true);
  }, { passive: true });

  $('#entrar').addEventListener('click', () => {
    const fin = seccion.offsetTop + seccion.offsetHeight - window.innerHeight;
    window.scrollTo({ top: fin, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });

  window.__kove = { get actual() { return actual; }, get objetivo() { return objetivo; }, get caja() { return caja; } };
  window.addEventListener('resize', medir);
  medir();
  cargar();
  requestAnimationFrame(bucle);
})();
