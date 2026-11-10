// Visor 3D y realidad aumentada de la moto.
// El visor (model-viewer) se carga solo cuando alguien lo abre, para no pesar en la entrada.
// En el teléfono: botón que abre la cámara (Android: Scene Viewer / WebXR; iPhone: Quick Look).
// En el computador: código QR que abre este mismo visor en el teléfono.
(() => {
  const MODELOS = {
    '450rr': { nombre: '450RR', src: 'media/3d/450rr.glb', orbita: '35deg 78deg auto' },
  };
  const MV = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
  const QR = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js';
  const ANCLA = '#ver-en-3d';

  const $ = (s) => document.querySelector(s);
  const dialogo = $('#visor3d');
  const escena = $('#visor3d-escena');
  const cargando = $('#visor3d-cargando');
  const bloqueAr = $('#visor3d-ar');
  const bloqueQr = $('#visor3d-qr');
  let visor = null, origen = null;

  const cargarScript = (src, modulo) => new Promise((ok, mal) => {
    const s = document.createElement('script');
    if (modulo) s.type = 'module';
    s.src = src; s.onload = ok; s.onerror = mal;
    document.head.appendChild(s);
  });

  async function preparar(id) {
    const m = MODELOS[id];
    $('#visor3d-titulo').textContent = m.nombre + ' en 3D';
    if (!customElements.get('model-viewer')) await cargarScript(MV, true);
    await customElements.whenDefined('model-viewer');
    if (!visor) {
      visor = document.createElement('model-viewer');
      Object.entries({
        'camera-controls': '', 'touch-action': 'pan-y', 'interaction-prompt': 'none',
        'shadow-intensity': '1', 'shadow-softness': '.8', 'environment-image': 'neutral', exposure: '1.05',
        ar: '', 'ar-modes': 'webxr scene-viewer quick-look', 'ar-scale': 'fixed', 'ar-placement': 'floor',
        alt: 'Modelo 3D de la moto, se puede girar',
      }).forEach(([k, v]) => visor.setAttribute(k, v));
      // el botón propio reemplaza al de model-viewer
      const vacio = document.createElement('span'); vacio.slot = 'ar-button'; vacio.hidden = true;
      visor.appendChild(vacio);
      visor.addEventListener('load', () => { cargando.hidden = true; mostrarOpciones(); });
      visor.addEventListener('error', () => { cargando.hidden = false; cargando.textContent = 'No se pudo cargar el modelo 3D.'; });
      escena.appendChild(visor);
    }
    if (visor.getAttribute('src') !== m.src) {
      cargando.hidden = false; cargando.textContent = 'Cargando la moto en 3D…';
      visor.setAttribute('camera-orbit', m.orbita);
      visor.setAttribute('src', m.src);
    }
  }

  async function mostrarOpciones() {
    // canActivateAR se sabe después de cargar el modelo
    await new Promise((r) => setTimeout(r, 50));
    const puede = !!(visor && visor.canActivateAR);
    bloqueAr.hidden = !puede;
    bloqueQr.hidden = puede;
    if (!puede) {
      try {
        if (!window.qrcode) await cargarScript(QR);
        const q = window.qrcode(0, 'M');
        q.addData(location.href.split('#')[0] + ANCLA);
        q.make();
        $('#visor3d-codigo').innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
      } catch { bloqueQr.hidden = true; }
    }
  }

  async function abrir(id, boton) {
    origen = boton || null;
    if (!dialogo.open) dialogo.showModal();
    document.body.classList.add('visor3d-abierto');
    try { await preparar(id); }
    catch { cargando.hidden = false; cargando.textContent = 'No se pudo cargar el visor 3D. Revisa tu conexión.'; }
  }

  function cerrar() {
    if (dialogo.open) dialogo.close();
  }
  dialogo.addEventListener('close', () => {
    document.body.classList.remove('visor3d-abierto');
    if (location.hash === ANCLA) history.replaceState(null, '', location.pathname + location.search);
    if (origen) origen.focus();
  });
  // tocar el fondo oscuro también cierra
  dialogo.addEventListener('click', (e) => { if (e.target === dialogo) cerrar(); });
  $('#cerrar-3d').addEventListener('click', cerrar);
  $('#activar-ar').addEventListener('click', () => { if (visor) visor.activateAR(); });

  document.querySelectorAll('[data-modelo]').forEach((b) =>
    b.addEventListener('click', () => abrir(b.dataset.modelo, b)));

  // Llegada desde el código QR: abrir el detalle y el visor
  if (location.hash === ANCLA) {
    window.addEventListener('load', () => {
      document.dispatchEvent(new CustomEvent('kove:detalle', { detail: { id: '450rr' } }));
      setTimeout(() => abrir('450rr', $('#ver-3d')), 400);
    });
  }

  window.__koveVisor3d = { abrir, cerrar };
})();
