// La moto a detalle: giro de 360° con el dedo o el mouse, puntos que siguen a cada pieza, ficha técnica,
// plano técnico y galería de contexto. Los datos de cada moto vienen de js/motos-datos.js.
// Dos tipos de giro: «video» (secuencia de cientos de cuadros, la 450RR) y «vistas» (las vistas oficiales a 45°).
(() => {
  const MOTOS = window.KOVE_MOTOS || {};
  const ICONOS = window.KOVE_ICONOS || {};
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const seccion = $('#detalle');
  const lienzo = $('#giro');
  const ctx = lienzo.getContext('2d');
  const contPuntos = $('#puntos');
  const tarjeta = $('#tarjeta');
  const pista = $('#pista-giro');
  const aguja = $('#angulo-aguja');

  let m = null, id = null;           // moto abierta
  let ruta = '';                     // carpeta del giro (cambia con el color si hay fotos de ese color)
  let cuadros = [];
  const cache = {};                  // cuadros cargados por carpeta
  let angulo = 45, velocidad = 0, tocado = false;
  let arrastrando = false, ultimoX = 0, ultimoT = 0;
  let caja = { dx: 0, dy: 0, dw: 0, dh: 0 };
  let abierta = false, ultimo = -1, piezaActiva = null;
  let nodos = [];

  const norm = (a) => ((a % 360) + 360) % 360;
  const esVideo = () => m.giro.tipo === 'video';
  const PASO = () => 360 / m.giro.cuadros;

  // Cuadro que toca mostrar para el ángulo actual
  function indice() {
    if (esVideo()) return Math.round(norm(angulo - m.giro.inicio) / PASO()) % m.giro.cuadros;
    let mejor = 0, dist = 999;
    m.giro.vistas.forEach(([a], i) => {
      const d = Math.min(norm(angulo - a), norm(a - angulo));
      if (d < dist) { dist = d; mejor = i; }
    });
    return mejor;
  }
  const anguloVista = () => (esVideo() ? norm(angulo) : m.giro.vistas[indice()][0]);

  // ---- Puntos sobre la moto ----
  function crearPuntos() {
    contPuntos.innerHTML = '';
    nodos = m.piezas.map((p) => {
      const b = document.createElement('button');
      b.className = 'punto';
      b.type = 'button';
      b.setAttribute('aria-label', p.titulo);
      b.innerHTML = '<span aria-hidden="true">+</span>';
      b.addEventListener('click', (e) => { e.stopPropagation(); mostrarPieza(piezaActiva === p ? null : p); });
      contPuntos.appendChild(b);
      return b;
    });
  }

  const fotoPieza = (p) => (p.foto ? `${m.rutaPiezas || m.giro.ruta + '-piezas'}/${p.foto}.webp` : '');
  function mostrarPieza(p) {
    piezaActiva = p;
    nodos.forEach((n, i) => n.classList.toggle('activo', m.piezas[i] === p));
    if (!p) { tarjeta.hidden = true; return; }
    const foto = fotoPieza(p);
    const icono = $('#tarjeta-icono');
    icono.hidden = !foto;
    if (foto) icono.src = foto;
    $('#tarjeta-titulo').textContent = p.titulo;
    $('#tarjeta-texto').textContent = p.texto;
    tarjeta.classList.toggle('tarjeta--sin-foto', !foto);
    tarjeta.querySelector('.tarjeta__ampliar').hidden = !foto;
    tarjeta.hidden = false;
    colocar();
  }

  // Vista ampliada de la pieza, en la foto oficial a buena resolución
  const ampliar = $('#ampliar');
  function abrirAmpliada() {
    if (!piezaActiva || !piezaActiva.foto) return;
    $('#ampliar-img').src = fotoPieza(piezaActiva);
    $('#ampliar-img').alt = piezaActiva.titulo;
    $('#ampliar-titulo').textContent = piezaActiva.titulo;
    $('#ampliar-texto').textContent = piezaActiva.texto;
    ampliar.showModal();
  }
  tarjeta.addEventListener('click', (e) => { e.stopPropagation(); abrirAmpliada(); });
  ampliar.addEventListener('click', (e) => { if (e.target === ampliar) ampliar.close(); });

  // ---- Giro ----
  function cargar() {
    if (cache[ruta]) { cuadros = cache[ruta]; return; }
    cuadros = cache[ruta] = [];
    const repintar = (i) => () => { if (!esVideo() || Math.abs(i - indice()) < 8) { ultimo = -1; dibujar(); } };
    if (esVideo()) {
      const total = m.giro.cuadros;
      // primero cada 8° para tener la vuelta completa pronto, luego el resto
      const orden = [];
      for (let i = 0; i < total; i += 8) orden.push(i);
      for (let i = 0; i < total; i++) if (i % 8) orden.push(i);
      orden.forEach((i) => {
        const img = new Image(); img.decoding = 'async';
        img.onload = repintar(i);
        img.src = `${ruta}/g${String(i).padStart(3, '0')}.webp`;
        cuadros[i] = img;
      });
    } else {
      m.giro.vistas.forEach(([, archivo], i) => {
        const img = new Image(); img.decoding = 'async';
        img.onload = repintar(i);
        img.src = `${ruta}/${archivo}`;
        cuadros[i] = img;
      });
    }
  }

  function medir() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = lienzo.clientWidth, h = lienzo.clientHeight;
    lienzo.width = Math.round(w * dpr);
    lienzo.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // las vistas oficiales vienen recortadas al contorno: se les deja un poco de aire
    const aire = esVideo() ? 1 : 0.84;
    const escala = Math.min(w / m.giro.ancho, h / m.giro.alto) * aire;
    const dw = m.giro.ancho * escala, dh = m.giro.alto * escala;
    caja = { dx: (w - dw) / 2, dy: (h - dh) / 2 + (esVideo() ? 0 : h * 0.03), dw, dh };
    ultimo = -1;
    dibujar();
  }

  function dibujar() {
    if (!m) return;
    const i = indice(), n = cuadros.length;
    let img = cuadros[i];
    for (let d = 1; (!img || !img.naturalWidth) && d < n; d++) {
      const a = cuadros[(i - d + n) % n], b = cuadros[(i + d) % n];
      img = a && a.naturalWidth ? a : b && b.naturalWidth ? b : null;
    }
    if (img && img.naturalWidth && i !== ultimo) {
      ctx.clearRect(0, 0, lienzo.width, lienzo.height);
      ctx.drawImage(img, caja.dx, caja.dy, caja.dw, caja.dh);
      ultimo = i;
    }
    colocar();
  }

  // Posición de una pieza para el ángulo actual (interpolada en el giro de video, exacta en las vistas)
  function posicion(p) {
    const a = anguloVista();
    if (!esVideo()) {
      const v = p.vistas[a];
      return v ? { x: v[0], y: v[1], o: 1 } : { x: 50, y: 50, o: 0 };
    }
    const k0 = Math.floor(a / 45) * 45, k1 = (k0 + 45) % 360;
    const t = (a - k0) / 45;
    const v0 = p.vistas[k0], v1 = p.vistas[k1];
    if (v0 && v1) return { x: v0[0] + (v1[0] - v0[0]) * t, y: v0[1] + (v1[1] - v0[1]) * t, o: 1 };
    if (v0) return { x: v0[0], y: v0[1], o: Math.max(0, 1 - t * 2.5) };
    if (v1) return { x: v1[0], y: v1[1], o: Math.max(0, (t - 0.6) * 2.5) };
    return { x: 50, y: 50, o: 0 };
  }

  function colocar() {
    m.piezas.forEach((p, i) => {
      const { x, y, o } = posicion(p);
      const n = nodos[i];
      if (!n) return;
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
    aguja.style.transform = `rotate(${anguloVista()}deg)`;
  }

  function bucle() {
    if (!abierta) return;
    if (!arrastrando) {
      // giro lento de presentación hasta que la toquen; con vistas sueltas cambia de foto cada pocos segundos
      if (!tocado) velocidad = esVideo() ? 0.12 : 0.2;
      else velocidad *= 0.94;
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
    const d = -dx * (esVideo() ? 0.45 : 0.6);
    angulo += d;
    velocidad = esVideo() ? d / Math.max(1, (ahora - ultimoT) / 16) : 0;
    ultimoX = e.clientX; ultimoT = ahora;
    dibujar();
  });
  const soltar = () => {
    arrastrando = false;
    if (m && !esVideo()) { angulo = m.giro.vistas[indice()][0]; velocidad = 0; dibujar(); }   // queda quieta en una vista
  };
  lienzo.addEventListener('pointerup', soltar);
  lienzo.addEventListener('pointercancel', soltar);
  lienzo.tabIndex = 0;
  lienzo.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      tocado = true; velocidad = 0;
      angulo += (e.key === 'ArrowLeft' ? 1 : -1) * (esVideo() ? 10 : 45);
      if (!esVideo()) angulo = m.giro.vistas[indice()][0];
      dibujar(); e.preventDefault();
    }
  });
  lienzo.addEventListener('click', () => mostrarPieza(null));

  // ---- Panel ----
  const colores = $('#colores-opciones');
  let colorI = 0;
  function elegirColor(c, boton) {
    colorI = m.colores.indexOf(c);
    [...colores.children].forEach((o) => o.setAttribute('aria-checked', String(o === boton)));
    $('#color-nombre').textContent = c.nombre;
    $('#color-nota').textContent = c.nota || '';
    const nueva = c.ruta || m.giro.ruta;
    if (nueva !== ruta) { ruta = nueva; cargar(); ultimo = -1; dibujar(); }
  }

  function llenarPanel() {
    seccion.setAttribute('aria-label', `${m.nombre} a detalle`);
    lienzo.setAttribute('aria-label', `Fotos de la ${m.nombre} girando. Arrastra para girarla.`);
    $('#detalle-eyebrow').textContent = m.eyebrow;
    $('#detalle-titulo').textContent = 'KOVE ' + m.nombre;
    $('#detalle-precio').textContent = m.precio;
    $('#detalle-datos').innerHTML = m.datos.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
    colores.innerHTML = '';
    m.colores.forEach((c, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(i === 0));
      b.setAttribute('aria-label', c.nombre); b.style.setProperty('--c', c.c);
      b.addEventListener('click', () => elegirColor(c, b));
      colores.appendChild(b);
    });
    colorI = 0;
    $('#color-nombre').textContent = m.colores[0].nombre;
    $('.modo-vista').hidden = !m.piloto;
    $('#color-nota').textContent = m.colores.length > 1 ? '' : 'En Colombia se vende solo en este color.';
    $('#detalle-asesor').dataset.asesor = m.nombre;
    const b3d = $('#ver-3d');
    b3d.hidden = !m.modelo3d;
    b3d.dataset.modelo = id;
    $('#ver-contexto').hidden = !(m.galeria && m.galeria.length);
    $('.detalle__nota').textContent = esVideo() ? 'Toca los puntos sobre la moto para conocer cada pieza.'
      : 'Arrastra para ver las vistas oficiales y toca los puntos para conocer cada pieza.';
    pista.innerHTML = `<span aria-hidden="true">⟲</span> Arrastra para girarla`;
  }

  // ---- Plano técnico ----
  const icono = (k) => `<svg viewBox="0 0 32 32" aria-hidden="true">${ICONOS[k] || ''}</svg>`;
  const cota = ([tipo, estilo, valor, etiqueta]) => `<span class="cota cota--${tipo}" style="${estilo}"><i>${esc(valor)}</i><small>${esc(etiqueta)}</small></span>`;
  function laminaHTML() {
    const l = m.lamina;
    const vista = (v) => `<figure class="vista${v.lado ? ' vista--lado' : ''}"><figcaption>${esc(v.titulo)}</figcaption>
      <div class="vista__img${v.alta ? ' vista__img--alta' : ''}"><img src="${v.img}" alt="${esc(m.nombre)} vista ${esc(v.titulo.toLowerCase())}">${v.cotas.map(cota).join('')}</div></figure>`;
    return `<header class="lamina__cabeza">
        <div>
          <img class="lamina__logo" src="media/marca/kove-logo-blanco.svg" alt="KOVE">
          <h3 class="lamina__titulo"><span class="lamina__barra" aria-hidden="true"></span>${esc(m.nombre)}</h3>
          <p class="lamina__sub">Plano técnico</p>
        </div>
        <dl class="lamina__specs">${l.specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        <div class="lamina__sello"><p>${l.sello}</p><p class="lamina__color"><span aria-hidden="true"></span>${esc(l.color)}</p></div>
      </header>
      <figure class="lamina__principal"><div class="vista__img">
        <img src="${l.principal.img}" alt="${esc(m.nombre)} vista de tres cuartos">
        ${cota(['h', 'left:0;right:0;top:-7%', l.principal.largo, 'largo total'])}
        ${cota(['v', 'top:0;bottom:0;left:-9%', l.principal.alto, 'alto total'])}
      </div></figure>
      <div class="lamina__vistas">${l.vistas.map(vista).join('')}</div>
      <ul class="lamina__extra">${l.extra.map(([k, t, v]) => `<li>${icono(k)}<div><b>${esc(t)}</b><span>${esc(v)}</span></div></li>`).join('')}</ul>
      <footer class="lamina__rotulo">
        <div><small>Lámina</small><b>KOVE ${esc(m.nombre)} · plano técnico</b></div>
        <div><small>Unidades</small><b>mm</b></div>
        <div><small>N.º</small><b>${esc(l.numero)}</b></div>
        <div><small>Fecha</small><b>11 / 2026</b></div>
        <div><small>Rev.</small><b>A</b></div>
      </footer>`;
  }

  // ---- Ficha técnica completa ----
  const fichaNodo = $('#ficha-tecnica');
  const botonFicha = $('#ver-ficha');
  const botonPuntos = $('#ver-puntos');
  const contPestanas = $('#pestanas');
  const tabla = $('#tabla-ficha');
  const dominio = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
  function verSeccion(nombre) {
    [...contPestanas.children].forEach((b) => b.setAttribute('aria-selected', String(b.dataset.seccion === nombre)));
    tabla.innerHTML = m.ficha[nombre].map(([k, v, f]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}${f
      ? ` <a class="tabla__fuente" href="${esc(f)}" target="_blank" rel="noopener" title="Fuente: ${esc(f)}">${esc(dominio(f))} ↗</a>` : ''}</dd></div>`).join('');
  }
  function llenarFicha() {
    $('#ficha-barra-titulo').textContent = 'Ficha técnica · ' + m.nombre;
    $('#lamina').setAttribute('aria-label', `Plano técnico de la KOVE ${m.nombre}`);
    $('#lamina').innerHTML = laminaHTML();
    const pdf = $('#pdf-plano');
    pdf.href = `media/plano/kove-${id}-plano-tecnico.pdf`;
    pdf.download = `KOVE-${m.nombre.replace(/\s+/g, '-')}-plano-tecnico.pdf`;
    contPestanas.innerHTML = '';
    Object.keys(m.ficha).forEach((nombre, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.seccion = nombre; b.textContent = nombre;
      b.addEventListener('click', () => verSeccion(nombre));
      contPestanas.appendChild(b);
      if (i === 0) verSeccion(nombre);
    });
    const oficial = m.fichaOficial || `https://kovemotocolombia.co/es/modelos/${m.slugCo}`;
    $('#ficha-nota').innerHTML = `Datos de KOVE Colombia contrastados con la ficha de fábrica, importadores de otros países y pruebas de prensa; cada dato enlaza su fuente. Donde las fuentes no coinciden manda la ficha de Colombia y se anota la diferencia. Especificaciones sujetas a homologación y disponibilidad.
      <a href="${oficial}" target="_blank" rel="noopener">Ficha oficial en KOVE Colombia ↗</a>`;
  }
  function mostrarFicha(si) {
    fichaNodo.hidden = !si;
    document.body.classList.toggle('ficha-abierta', si);
    if (si) fichaNodo.scrollTop = 0;
    botonFicha.setAttribute('aria-expanded', String(si));
    botonFicha.textContent = si ? 'Volver a la moto' : 'Ficha técnica completa';
    [lienzo, contPuntos, pista, $('.angulo'), botonPuntos].forEach((n) => n.classList.toggle('apagado', si));
    if (si) mostrarPieza(null);
  }
  $('#cerrar-ficha').addEventListener('click', () => { mostrarFicha(false); botonFicha.focus(); });

  // ---- Por qué elegirla: galería de contexto ----
  const contexto = $('#contexto');
  function abrirContexto() {
    $('#contexto-eyebrow').textContent = m.eyebrow;
    $('#contexto-titulo').textContent = 'KOVE ' + m.nombre;
    $('#contexto-grilla').innerHTML = m.galeria.map((g, i) => `<article class="contexto__tarjeta${g.img ? '' : ' contexto__tarjeta--texto'}${i === 0 ? ' contexto__tarjeta--grande' : ''}">
        ${g.img ? `<img src="${g.img}" alt="" loading="lazy">` : ''}
        <div><h3>${esc(g.titulo)}</h3><p>${esc(g.texto)}</p>
        ${g.fuente ? `<a href="${esc(g.fuente)}" target="_blank" rel="noopener">Fuente: ${esc(dominio(g.fuente))} ↗</a>` : ''}</div>
      </article>`).join('');
    contexto.showModal();
    contexto.querySelector('.contexto__cuerpo').scrollTop = 0;
  }
  $('#ver-contexto').addEventListener('click', abrirContexto);
  $('#cerrar-contexto').addEventListener('click', () => contexto.close());
  contexto.addEventListener('click', (e) => { if (e.target === contexto) contexto.close(); });

  // Ocultar los puntos para ver la moto limpia
  function verPuntos(si) {
    seccion.querySelector('.detalle__escenario').classList.toggle('sin-puntos', !si);
    botonPuntos.setAttribute('aria-pressed', String(!si));
    botonPuntos.querySelector('span').textContent = si ? 'Ocultar detalles' : 'Mostrar detalles';
    if (!si) mostrarPieza(null);
  }
  botonPuntos.addEventListener('click', () => verPuntos(botonPuntos.getAttribute('aria-pressed') === 'true'));

  // ---- Vista del piloto: el puesto de mando con la foto oficial del tablero ----
  const piloto = $('#piloto');
  const modos = [...document.querySelectorAll('.modo-vista [data-vista]')];
  function verPiloto(si) {
    const en = !!(si && m && m.piloto);
    modos.forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.vista === 'piloto') === en)));
    seccion.querySelector('.detalle__escenario').classList.toggle('en-piloto', en);
    piloto.hidden = !en;
    if (!en) return;
    const p = m.piloto;
    mostrarPieza(null);
    piloto.dataset.ajuste = p.ajuste || 'cover';
    piloto.style.setProperty('--fondo', p.fondo || '#c9ced3');
    $('#piloto-img').src = p.img;
    $('#piloto-img').alt = `Tablero y mandos de la KOVE ${m.nombre}, foto oficial`;
    $('#piloto-titulo').textContent = p.titulo;
    $('#piloto-texto').textContent = p.texto;
    const f = $('#piloto-fuente');
    f.href = p.fuente; f.textContent = `Foto y datos: ${dominio(p.fuente)} ↗`;
  }
  modos.forEach((b) => b.addEventListener('click', () => verPiloto(b.dataset.vista === 'piloto')));

  // Foto de la moto en el color elegido, vista de tres cuartos (para el resumen de la cotización)
  function foto(a = 45) {
    const antes = angulo; angulo = a;
    const i = indice(); angulo = antes;
    return cuadros[i] ? cuadros[i].src : '';
  }

  // ---- Abrir y cerrar ----
  function abrir(cual = '450rr') {
    if (!MOTOS[cual]) return;
    if (cual !== id) {
      id = cual; m = MOTOS[cual];
      ruta = m.giro.ruta;
      angulo = esVideo() ? m.giro.inicio : 45;
      tocado = false; velocidad = 0;
      mostrarPieza(null);
      crearPuntos();
      llenarPanel();
      llenarFicha();
      verPuntos(true);
      verPiloto(false);
      pista.classList.remove('oculta');
    }
    mostrarFicha(false);
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

  document.addEventListener('kove:detalle', (e) => abrir(e.detail.id));
  $('#volver').addEventListener('click', () => { mostrarFicha(false); cerrar(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && abierta && !document.querySelector('dialog[open]')) cerrar();
  });
  window.addEventListener('resize', () => { if (abierta) medir(); });
  botonFicha.addEventListener('click', () => mostrarFicha(fichaNodo.hidden));
  tarjeta.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirAmpliada(); } });

  window.__koveDetalle = {
    abrir, cerrar, motos: MOTOS,
    get ficha() { return m ? Object.fromEntries(Object.entries(m.ficha).map(([k, v]) => [k, v.map(([a, b]) => [a, b])])) : null; },
    get id() { return id; },
    get moto() { return m; },
    get color() { return colorI; },
    elegirColor(i) { const b = colores.children[i]; if (b && m.colores[i]) elegirColor(m.colores[i], b); },
    foto, verPiloto,
    set angulo(v) { angulo = v; tocado = true; dibujar(); },
  };
})();
