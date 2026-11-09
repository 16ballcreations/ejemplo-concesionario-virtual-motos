// La moto a detalle: giro de 360° con el dedo o el mouse, y puntos que siguen a cada pieza.
(() => {
  const RUTA = 'media/giro/450rr';
  const CUADROS = 320, ANCHO = 960, ALTO = 600;
  const PASO = 360 / CUADROS;        // grados por cuadro
  const INICIO = 45;                 // el cuadro 0 muestra la moto a 45°

  // Posición de cada pieza (en % del cuadro) en las 8 vistas reales; null = la pieza queda oculta
  // Fotos de las piezas: kovemoto.com (página oficial de la 450RR)
  const PIEZAS = [
    {
      id: 'motor', titulo: '4 cilindros en línea · 443 cc',
      texto: 'Un tetracilíndrico que estira hasta 13.000 rpm: 69,7 HP y 39 Nm, inyección Bosch y embrague antirrebote.',
      foto: 'motor',
      vistas: { 0: null, 45: [43.8, 58.8], 90: [53.9, 60], 135: [61, 56.3], 180: null, 225: [39.1, 55], 270: [46.1, 60], 315: [55.5, 57.5] },
    },
    {
      id: 'frenos', titulo: 'Horquilla invertida y doble disco',
      texto: 'Horquilla invertida de 41 mm totalmente ajustable y doble disco de 300 mm con pinzas radiales de 4 pistones y ABS.',
      foto: 'frenos',
      vistas: { 0: null, 45: [67.2, 66.3], 90: [77.3, 66.3], 135: [72.7, 60], 180: null, 225: [29.7, 62.5], 270: [21.1, 67.5], 315: [32, 65] },
    },
    {
      id: 'basculante', titulo: 'Basculante y suspensión trasera',
      texto: 'Monoamortiguador ajustable con depósito externo. Llanta trasera 160/60 R17 con neumáticos radiales Maxxis.',
      foto: 'basculante',
      vistas: { 0: null, 45: [31.3, 60], 90: [28.1, 61.3], 135: [37.5, 53.8], 180: [50, 60], 225: [57.8, 61.3], 270: [68.8, 62.5], 315: [68.8, 57.5] },
    },
    {
      id: 'tablero', titulo: 'Pantalla TFT a color',
      texto: 'Velocidad, revoluciones, marcha, combustible y modos de conducción, con telemetría para la pista.',
      foto: 'tablero',
      vistas: { 0: [50, 20], 45: [61.7, 23.8], 90: [64, 27.5], 135: [67.2, 20], 180: [50, 18.8], 225: [36.7, 22.5], 270: [30.5, 26.3], 315: [41.4, 21.3] },
    },
    {
      id: 'ramair', titulo: 'Toma Ram-Air',
      texto: 'El aire entra por la nariz y llega con más presión al motor cuanto más rápido vas.',
      foto: 'ramair',
      vistas: { 0: [50, 40], 45: [68.8, 35], 90: [78.1, 41.3], 135: null, 180: null, 225: [26.6, 36.3], 270: [20.3, 40], 315: [30.5, 38.8] },
    },
  ];

  const $ = (s) => document.querySelector(s);
  const seccion = $('#detalle');
  const lienzo = $('#giro');
  const ctx = lienzo.getContext('2d');
  const contPuntos = $('#puntos');
  const tarjeta = $('#tarjeta');
  const pista = $('#pista-giro');
  const aguja = $('#angulo-aguja');

  const cuadros = new Array(CUADROS);
  let cargando = false;
  let angulo = INICIO;       // grados
  let velocidad = 0;         // grados por cuadro de animación
  let tocado = false;        // el visitante ya giró la moto
  let arrastrando = false, ultimoX = 0, ultimoT = 0;
  let caja = { dx: 0, dy: 0, dw: 0, dh: 0 };
  let abierta = false, ultimo = -1, piezaActiva = null;

  // Puntos
  const nodos = PIEZAS.map((p) => {
    const b = document.createElement('button');
    b.className = 'punto';
    b.type = 'button';
    b.setAttribute('aria-label', p.titulo);
    b.innerHTML = '<span aria-hidden="true">+</span>';
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      mostrarPieza(piezaActiva === p ? null : p);
    });
    contPuntos.appendChild(b);
    return b;
  });

  function mostrarPieza(p) {
    piezaActiva = p;
    nodos.forEach((n, i) => n.classList.toggle('activo', PIEZAS[i] === p));
    if (!p) { tarjeta.hidden = true; return; }
    $('#tarjeta-icono').src = `${RUTA}-piezas/${p.foto}.webp`;
    $('#tarjeta-titulo').textContent = p.titulo;
    $('#tarjeta-texto').textContent = p.texto;
    tarjeta.hidden = false;
    colocar();
  }

  // Vista ampliada de la pieza, en la foto oficial a buena resolución
  const ampliar = $('#ampliar');
  function abrirAmpliada() {
    if (!piezaActiva) return;
    $('#ampliar-img').src = `${RUTA}-piezas/${piezaActiva.foto}.webp`;
    $('#ampliar-img').alt = piezaActiva.titulo;
    $('#ampliar-titulo').textContent = piezaActiva.titulo;
    $('#ampliar-texto').textContent = piezaActiva.texto;
    ampliar.showModal();
  }
  tarjeta.addEventListener('click', (e) => { e.stopPropagation(); abrirAmpliada(); });
  ampliar.addEventListener('click', (e) => { if (e.target === ampliar) ampliar.close(); });

  function cargar() {
    if (cargando) return;
    cargando = true;
    // primero cada 8° para tener la vuelta completa pronto, luego el resto
    const orden = [];
    for (let i = 0; i < CUADROS; i += 8) orden.push(i);
    for (let i = 0; i < CUADROS; i++) if (i % 8) orden.push(i);
    orden.forEach((i) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { if (Math.abs(i - indice()) < 8) { ultimo = -1; dibujar(); } };
      img.src = `${RUTA}/g${String(i).padStart(3, '0')}.webp`;
      cuadros[i] = img;
    });
  }

  const norm = (a) => ((a % 360) + 360) % 360;
  const indice = () => Math.round(norm(angulo - INICIO) / PASO) % CUADROS;

  function medir() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = lienzo.clientWidth, h = lienzo.clientHeight;
    lienzo.width = Math.round(w * dpr);
    lienzo.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // "contain" con un poco de aire alrededor
    const escala = Math.min(w / ANCHO, h / ALTO) * 1.0;
    const dw = ANCHO * escala, dh = ALTO * escala;
    caja = { dx: (w - dw) / 2, dy: (h - dh) / 2, dw, dh };
    ultimo = -1;
    dibujar();
  }

  function dibujar() {
    const i = indice();
    let img = cuadros[i];
    for (let d = 1; (!img || !img.naturalWidth) && d < CUADROS; d++) {
      const a = cuadros[(i - d + CUADROS) % CUADROS], b = cuadros[(i + d) % CUADROS];
      img = a && a.naturalWidth ? a : b && b.naturalWidth ? b : null;
    }
    if (img && img.naturalWidth && i !== ultimo) {
      ctx.clearRect(0, 0, lienzo.width, lienzo.height);
      ctx.drawImage(img, caja.dx, caja.dy, caja.dw, caja.dh);
      ultimo = i;
    }
    colocar();
  }

  // Interpola la posición de una pieza para el ángulo actual
  function posicion(p) {
    const a = norm(angulo);
    const k0 = Math.floor(a / 45) * 45, k1 = (k0 + 45) % 360;
    const t = (a - k0) / 45;
    const v0 = p.vistas[k0], v1 = p.vistas[k1];
    if (v0 && v1) return { x: v0[0] + (v1[0] - v0[0]) * t, y: v0[1] + (v1[1] - v0[1]) * t, o: 1 };
    if (v0) return { x: v0[0], y: v0[1], o: Math.max(0, 1 - t * 2.5) };
    if (v1) return { x: v1[0], y: v1[1], o: Math.max(0, (t - 0.6) * 2.5) };
    return { x: 50, y: 50, o: 0 };
  }

  function colocar() {
    PIEZAS.forEach((p, i) => {
      const { x, y, o } = posicion(p);
      const n = nodos[i];
      n.style.left = `${caja.dx + (x / 100) * caja.dw}px`;
      n.style.top = `${caja.dy + (y / 100) * caja.dh}px`;
      n.style.opacity = String(o);
      n.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
      n.tabIndex = o > 0.5 ? 0 : -1;
      if (p === piezaActiva) {
        if (o < 0.3) { mostrarPieza(null); return; }
        const angosto = lienzo.clientWidth < 600;
        tarjeta.classList.toggle('tarjeta--abajo', angosto);
        if (angosto) { tarjeta.style.left = ''; tarjeta.style.top = ''; return; }
        const px = caja.dx + (x / 100) * caja.dw, py = caja.dy + (y / 100) * caja.dh;
        const derecha = px < lienzo.clientWidth * 0.6;
        tarjeta.style.left = `${lienzo.offsetLeft + (derecha ? px + 26 : px - 26)}px`;
        tarjeta.style.top = `${lienzo.offsetTop + py}px`;
        tarjeta.classList.toggle('tarjeta--izq', !derecha);
      }
    });
    aguja.style.transform = `rotate(${norm(angulo)}deg)`;
  }

  function bucle() {
    if (!abierta) return;
    if (!arrastrando) {
      if (!tocado) velocidad = 0.12;          // giro lento de presentación hasta que la toquen
      else velocidad *= 0.94;                  // inercia al soltar
      if (Math.abs(velocidad) > 0.001) { angulo += velocidad; dibujar(); }
    }
    requestAnimationFrame(bucle);
  }

  // Arrastre
  lienzo.addEventListener('pointerdown', (e) => {
    arrastrando = true; tocado = true; velocidad = 0;
    ultimoX = e.clientX; ultimoT = performance.now();
    lienzo.setPointerCapture(e.pointerId);
    pista.classList.add('oculta');
  });
  lienzo.addEventListener('pointermove', (e) => {
    if (!arrastrando) return;
    const dx = e.clientX - ultimoX, ahora = performance.now();
    const d = -dx * 0.45;
    angulo += d;
    velocidad = d / Math.max(1, (ahora - ultimoT) / 16);
    ultimoX = e.clientX; ultimoT = ahora;
    dibujar();
  });
  const soltar = () => { arrastrando = false; };
  lienzo.addEventListener('pointerup', soltar);
  lienzo.addEventListener('pointercancel', soltar);
  lienzo.tabIndex = 0;
  lienzo.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      tocado = true; velocidad = 0;
      angulo += e.key === 'ArrowLeft' ? 10 : -10;
      dibujar(); e.preventDefault();
    }
  });
  lienzo.addEventListener('click', () => mostrarPieza(null));

  function abrir() {
    seccion.hidden = false;
    document.body.classList.add('en-detalle');
    requestAnimationFrame(() => seccion.classList.add('visible'));
    abierta = true;
    cargar();
    medir();
    requestAnimationFrame(bucle);
    $('#volver').focus({ preventScroll: true });
  }
  function cerrar() {
    seccion.classList.remove('visible');
    document.body.classList.remove('en-detalle');
    abierta = false;
    mostrarPieza(null);
    setTimeout(() => { if (!abierta) seccion.hidden = true; }, 450);
  }

  document.addEventListener('kove:detalle', (e) => { if (e.detail.id === '450rr') abrir(); });
  $('#volver').addEventListener('click', cerrar);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && abierta && !document.querySelector('dialog[open]')) cerrar();
  });
  window.addEventListener('resize', () => { if (abierta) medir(); });
  // Ficha técnica completa, tal como la publica KOVE Colombia
  const FICHA = {
    Motor: [
      ['Motor', '4 cilindros en línea, 4 tiempos, DOHC, 16 válvulas, refrigeración líquida'],
      ['Cilindraje', '443 cc tetracilíndrico'],
      ['Máxima potencia', '69,73 HP @ 13.000 rpm'],
      ['Torque máximo', '39 Nm @ 10.500 rpm'],
      ['Embrague', 'Multidisco en baño de aceite, antirrebote'],
      ['Transmisión', '6 velocidades'],
      ['Arranque', 'Eléctrico'],
      ['Alimentación', 'Inyección electrónica BOSCH EFI'],
      ['Refrigeración', 'Líquida'],
      ['Velocidad máxima', '220 km/h'],
      ['Capacidad de combustible', '14–15 L'],
    ],
    Eléctrico: [
      ['Batería', '12 V (tipo no especificado por el fabricante)'],
      ['Farola', 'LED'],
      ['Stop', 'LED'],
      ['Direccionales', 'LED'],
      ['Indicadores del tablero', 'Velocidad, RPM, marcha, combustible, modos de conducción'],
      ['Sistema de encendido', 'Electrónico (ECU)'],
      ['Tablero', 'TFT a color con telemetría'],
      ['Faro', 'LED'],
      ['Luces traseras', 'LED'],
      ['Carga USB', 'No especificado por el fabricante'],
    ],
    Chasis: [
      ['Tipo', 'Deportiva (Supersport), estructura de celosía HC700+Q355B'],
      ['Chasis', 'Marco de aluminio tipo trellis / 3/4'],
      ['Suspensión delantera', 'Horquilla invertida Ø41 mm totalmente ajustable'],
      ['Suspensión trasera', 'Monoamortiguador ajustable con depósito externo'],
      ['Freno delantero', 'Doble disco 300 mm, pinza radial de 4 pistones, ABS'],
      ['Freno trasero', 'Disco 220 mm, pinza de 1 pistón, ABS'],
      ['ABS', 'Sí, doble canal'],
      ['Llanta delantera', '120/70 - R17'],
      ['Llanta trasera', '160/60 - R17'],
      ['Neumáticos', 'Radiales deportivos (MAXXIS)'],
      ['Embrague', 'Multidisco antirrebote'],
      ['Despeje del suelo', '140 mm'],
    ],
    Dimensiones: [
      ['Longitud', '2.015 mm'],
      ['Ancho', '740 mm'],
      ['Altura', '1.090 mm'],
      ['Distancia entre ejes', '1.385 mm'],
      ['Distancia mínima del suelo', '140 mm'],
      ['Peso', '165 kg'],
      ['Capacidad del tanque', '14–15 L'],
      ['Altura del asiento', '780–795 mm'],
      ['Número de pasajeros', '2'],
    ],
    Tecnología: [
      ['Tablero', 'TFT digital'],
    ],
  };
  const fichaNodo = $('#ficha-tecnica');
  const botonFicha = $('#ver-ficha');
  const contPestanas = $('#pestanas');
  const tabla = $('#tabla-ficha');
  function verSeccion(nombre) {
    [...contPestanas.children].forEach((b) => b.setAttribute('aria-selected', String(b.dataset.seccion === nombre)));
    tabla.innerHTML = FICHA[nombre].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  }
  Object.keys(FICHA).forEach((nombre, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.seccion = nombre; b.textContent = nombre;
    b.addEventListener('click', () => verSeccion(nombre));
    contPestanas.appendChild(b);
    if (i === 0) verSeccion(nombre);
  });
  function mostrarFicha(si) {
    fichaNodo.hidden = !si;
    botonFicha.setAttribute('aria-expanded', String(si));
    botonFicha.textContent = si ? 'Volver a la moto' : 'Ficha técnica completa';
    [lienzo, contPuntos, pista, $('.angulo')].forEach((n) => n.classList.toggle('apagado', si));
    if (si) mostrarPieza(null);
  }
  botonFicha.addEventListener('click', () => mostrarFicha(fichaNodo.hidden));
  tarjeta.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirAmpliada(); } });
  $('#volver').addEventListener('click', () => mostrarFicha(false));

  window.__koveDetalle = { abrir, cerrar, set angulo(v) { angulo = v; tocado = true; dibujar(); } };
})();
