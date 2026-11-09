// Entrada al concesionario: el video avanza con el scroll, cuadro por cuadro, en un canvas.
(() => {
  const TOTAL = 121;                 // cuadros en media/entrada (f000…f120)
  const FIN_VIDEO = 0.82;            // de 0 a este punto del scroll corre el video; luego aparece el salón
  const ANCHO = 1280, ALTO = 714;    // tamaño de los cuadros

  // Banda del letrero en la fachada, en % del cuadro, según el cuadro (medido sobre el video)
  const BANDA = [
    [0, 22.5, 19.6, 77.5, 30.2],
    [15, 21.9, 18.2, 78.4, 29.3],
    [30, 19.3, 11.7, 80.4, 27.1],
    [45, 15.6, 8.9, 84.3, 22.9],
    [60, 10.0, 2.0, 90.0, 17.0],
  ];

  // Motos sobre los pedestales del último cuadro: centro x, apoyo y y ancho del pedestal, en %
  const MOTOS = [
    { id: '625x',    nombre: '625 X',    familia: 'Adventure · 581 cc', precio: '$ 38.490.000', x: 36.8, y: 67.2, ancho: 9.2 * 0.95, orden: 1 },
    { id: '350r',    nombre: '350R',     familia: 'Naked · 344 cc',     precio: '$ 23.490.000', x: 29.6, y: 72.8, ancho: 13.7 * 1.0, orden: 2 },
    { id: '450rr',   nombre: '450RR',    familia: 'Sport · 443 cc',     precio: '$ 36.490.000', x: 70.1, y: 72.8, ancho: 13.7 * 1.0, orden: 3 },
    { id: '800xpro', nombre: '800X Pro', familia: 'Adventure · 799 cc', precio: '$ 43.990.000', x: 49.9, y: 78.6, ancho: 18.2 * 1.0, orden: 4 },
  ];

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
  let base = { dx: 0 };            // posición centrada; en el teléfono la cámara se corre desde aquí
  let paneo = 0, paneoMeta = 0, enSalon = 0;

  // Motos en el DOM
  const DETALLE = { '450rr': true };   // motos con vista a detalle lista
  const nodosMoto = MOTOS.map((m) => {
    const d = document.createElement('div');
    d.className = 'moto' + (m.orden === 1 ? ' moto--fondo' : '');
    d.style.zIndex = String(m.orden);
    const src = `media/motos/${m.id}.webp`;
    d.style.setProperty('--recorte', `url("${new URL(src, location.href).href}")`);
    d.innerHTML =
      `<img class="moto__reflejo" src="${src}" alt="" aria-hidden="true">` +
      `<button class="moto__boton" type="button" aria-label="${m.nombre}, ${m.familia}, desde ${m.precio}">` +
        `<img src="${src}" alt=""><span class="moto__luz" aria-hidden="true"></span></button>` +
      `<div class="ficha"><b>${m.nombre}</b><span>${m.familia}</span><em>Desde ${m.precio}</em>` +
        (DETALLE[m.id]
          ? `<button class="ficha__accion" type="button" data-detalle="${m.id}">Verla a detalle</button>`
          : `<small>Vista a detalle muy pronto</small>`) +
      `</div>`;
    d.querySelector('.moto__boton').addEventListener('click', () => {
      if (recorrido) { elegir(ORDEN.indexOf(MOTOS.indexOf(m))); return; }
      const abierta = d.classList.contains('abierta');
      nodosMoto.forEach((n) => n.classList.remove('abierta'));
      if (!abierta) d.classList.add('abierta');
    });
    const accion = d.querySelector('.ficha__accion');
    if (accion) accion.addEventListener('click', () => {
      d.classList.remove('abierta');
      document.dispatchEvent(new CustomEvent('kove:detalle', { detail: { id: m.id } }));
    });
    contMotos.appendChild(d);
    return d;
  });
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
    base = { dx: (w - dw) / 2 };
    caja = { dx: base.dx + paneo, dy: (h - dh) / 2, dw, dh };
    modoRecorrido(w / dw < 0.6);
    colocarMotos();
    ultimoDibujado = -1;
    dibujar();
  }

  const px = (xPct) => caja.dx + (xPct / 100) * caja.dw;
  const py = (yPct) => caja.dy + (yPct / 100) * caja.dh;

  function colocarMotos() {
    MOTOS.forEach((m, i) => {
      const n = nodosMoto[i];
      n.style.width = `${(m.ancho / 100) * caja.dw}px`;
      n.style.left = `${px(m.x)}px`;
      n.style.top = `${py(m.y)}px`;
    });
  }

  // ---- Recorrido de lado a lado (teléfono) ----
  const ORDEN = MOTOS.map((m, i) => i).sort((a, b) => MOTOS[a].x - MOTOS[b].x);   // de izquierda a derecha
  let elegida = ORDEN.indexOf(MOTOS.findIndex((m) => m.id === '800xpro'));
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
    else { paneo = paneoMeta = 0; nodosMoto.forEach((n) => n.classList.remove('elegida')); }
  }

  function metaPaneo() {
    if (!recorrido) return 0;
    const w = lienzo.clientWidth;
    const m = MOTOS[ORDEN[elegida]];
    const dx = Math.min(0, Math.max(w - caja.dw, w / 2 - (m.x / 100) * caja.dw));
    return (dx - base.dx) * enSalon;   // mientras corre el video la cámara sigue centrada
  }

  function aplicarPaneo() {
    caja.dx = base.dx + paneo;
    colocarMotos();
    ultimoDibujado = -1;
    dibujar();
  }

  function elegir(k, directo) {
    elegida = (k + ORDEN.length) % ORDEN.length;
    const i = ORDEN[elegida], m = MOTOS[i];
    nodosMoto.forEach((n, x) => n.classList.toggle('elegida', x === i));
    $('#recorrido-nombre').textContent = m.nombre;
    $('#recorrido-familia').textContent = m.familia + ' · ' + m.precio;
    const det = $('#recorrido-detalle');
    det.disabled = !DETALLE[m.id];
    det.textContent = DETALLE[m.id] ? 'Verla a detalle' : 'Detalle muy pronto';
    $('#recorrido-asesor').dataset.asesor = m.nombre;
    [...puntosRec.children].forEach((p, x) => p.classList.toggle('activo', x === elegida));
    if (directo) { paneo = metaPaneo(); aplicarPaneo(); }
    // Si el navegador pausa las animaciones, saltar directo
    setTimeout(() => { if (performance.now() - ultimoPaso > 120) { paneo = metaPaneo(); aplicarPaneo(); } }, 150);
  }

  $('#recorrido-antes').addEventListener('click', () => elegir(elegida - 1));
  $('#recorrido-despues').addEventListener('click', () => elegir(elegida + 1));
  $('#recorrido-detalle').addEventListener('click', () => {
    const m = MOTOS[ORDEN[elegida]];
    if (DETALLE[m.id]) document.dispatchEvent(new CustomEvent('kove:detalle', { detail: { id: m.id } }));
  });
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
    letrero.style.opacity = String(Math.max(0, 1 - Math.max(0, f - 38) / 14));

    // Texto de bienvenida: se va en el primer tramo
    const oIntro = Math.max(0, 1 - p / 0.12);
    intro.style.opacity = String(oIntro);
    intro.style.transform = `translateY(${(1 - oIntro) * -20}px)`;
    intro.style.visibility = oIntro < 0.01 ? 'hidden' : 'visible';

    // Salón: aparece cuando termina el video
    const oSalon = Math.min(1, Math.max(0, (p - FIN_VIDEO) / 0.08));
    enSalon = oSalon;
    const rs = seccion.getBoundingClientRect();
    document.body.classList.toggle('salon-en-pantalla', oSalon > 0.6 && rs.bottom > window.innerHeight * 0.6);
    salon.style.opacity = String(oSalon);
    salon.classList.toggle('activo', oSalon > 0.6);
    document.body.classList.toggle('en-salon', oSalon > 0.6);
    salon.setAttribute('aria-hidden', oSalon > 0.6 ? 'false' : 'true');
    nodosMoto.forEach((n, k) => {
      const t = Math.min(1, Math.max(0, (p - FIN_VIDEO - 0.02 * k) / 0.08));
      n.style.opacity = String(t);
      n.style.transform = `translate(-50%, ${-100 + (1 - t) * 6}%)`;
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
    // la cámara del salón se desliza hacia la moto elegida
    paneoMeta = metaPaneo();
    const antes = paneo;
    paneo = directo ? paneoMeta : paneo + (paneoMeta - paneo) * 0.14;
    if (Math.abs(paneoMeta - paneo) < 0.3) paneo = paneoMeta;
    if (paneo !== antes) aplicarPaneo(); else dibujar();
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
