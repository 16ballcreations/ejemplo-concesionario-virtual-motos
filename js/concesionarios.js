// Encuentra tu concesionario: lista con búsqueda y mapa con las sedes de KOVE Colombia.
// Datos de kovemotocolombia.co/es/sedes (consultados el 9 de noviembre de 2026). Coordenadas aproximadas.
(() => {
  const SEDES = [
    { tipo: 'vitrina', nombre: 'Megasala KOVE', ciudad: 'Bogotá, D.C.', direccion: 'Av. Primera de Mayo #27-24',
      estado: 'obra', nota: 'Todavía no atiende público.', telefono: '311 883 4991', lat: 4.5846, lng: -74.1137 },
    { tipo: 'vitrina', nombre: 'Palo Blanco KOVE', ciudad: 'Bogotá, D.C.', direccion: 'Av. Carrera 72 #69A-36',
      estado: 'obra', nota: 'Todavía no atiende público.', telefono: '302 320 4995', lat: 4.6872, lng: -74.0915 },
    { tipo: 'vitrina', nombre: 'Alquería KOVE', ciudad: 'Bogotá, D.C.', direccion: 'Dirección próximamente',
      estado: 'pronto', nota: 'Ubicación por confirmar.', lat: 4.6040, lng: -74.1350 },
    { tipo: 'vitrina', nombre: 'Medellín KOVE', ciudad: 'Medellín, Antioquia', direccion: 'Dirección próximamente',
      estado: 'pronto', nota: '', lat: 6.2442, lng: -75.5812 },
    { tipo: 'vitrina', nombre: 'Cali KOVE', ciudad: 'Cali, Valle del Cauca', direccion: 'Dirección próximamente',
      estado: 'pronto', nota: '', lat: 3.4516, lng: -76.5320 },
    { tipo: 'posventa', nombre: 'Carrera Motos · posventa', ciudad: 'Bogotá, D.C.', direccion: 'C. C. Carrera, Av. Américas #50-15',
      estado: 'oficina', nota: 'Atiende consultas de posventa. Es una oficina, no un taller, y no atiende público.',
      horario: 'Lun a vie 8:00–18:00 · Sáb 9:00–14:00', lat: 4.6236, lng: -74.1178 },
  ];
  const ESTADOS = { abierta: 'Abierta', obra: 'En obra', pronto: 'Próximamente', oficina: 'Solo canales en línea' };
  window.KOVE_SEDES = SEDES; window.KOVE_ESTADOS = ESTADOS;

  const lista = document.getElementById('sedes');
  const buscar = document.getElementById('buscar-sede');
  const conteo = document.getElementById('sedes-conteo');
  const pestanas = [...document.querySelectorAll('.concesionarios [data-tipo]')];
  let tipo = 'vitrina';
  let mapa = null;
  const pines = new Map();

  const sinTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function iniciarMapa() {
    if (!window.L) {
      document.getElementById('mapa').innerHTML = '<p class="mapa__aviso">El mapa no cargó. Revisa tu conexión.</p>';
      return;
    }
    mapa = L.map('mapa', { scrollWheelZoom: false, zoomControl: true }).setView([4.65, -74.1], 11);
    // Demo: teselas de OpenStreetMap (en producción, un proveedor con clave propia)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapa);
    SEDES.forEach((s, i) => {
      const icono = L.divIcon({ className: `pin pin--${s.estado}`, html: '<span></span>', iconSize: [26, 26], iconAnchor: [13, 13] });
      const m = L.marker([s.lat, s.lng], { icon: icono, title: s.nombre }).addTo(mapa);
      m.bindPopup(`<b>${s.nombre}</b><br>${s.direccion}<br><small>${ESTADOS[s.estado]}</small>`);
      m.on('click', () => seleccionar(i, false));
      pines.set(i, m);
    });
  }

  function pintar() {
    const q = sinTildes(buscar.value.trim());
    const visibles = SEDES.map((s, i) => ({ s, i }))
      .filter(({ s }) => s.tipo === tipo)
      .filter(({ s }) => !q || sinTildes(`${s.nombre} ${s.ciudad} ${s.direccion}`).includes(q));
    lista.innerHTML = visibles.map(({ s, i }) => `
      <li class="sede" data-i="${i}">
        <button class="sede__cabeza" type="button" data-ir="${i}">
          <span class="estado estado--${s.estado}">${ESTADOS[s.estado]}</span>
          <b>${s.nombre}</b>
          <span>${s.ciudad}</span>
          <span>${s.direccion}</span>
        </button>
        ${s.nota ? `<p class="sede__nota">${s.nota}</p>` : ''}
        ${s.horario ? `<p class="sede__nota">${s.horario}</p>` : ''}
        <div class="sede__acciones">
          ${s.telefono ? `<span class="sede__tel">Cel. ${s.telefono}</span>` : ''}
          ${s.direccion.startsWith('Dirección') ? '' :
            `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.direccion}, ${s.ciudad}, Colombia`)}" target="_blank" rel="noopener">Cómo llegar ↗</a>`}
          <button type="button" class="sede__agendar" data-asesor="" data-sede="${s.nombre}" data-abierta="${s.estado === 'abierta' || s.tipo === 'posventa'}">${s.tipo === 'posventa' ? 'Hablar con posventa' : s.estado === 'abierta' ? 'Agendar visita' : 'Avísame cuando abra'}</button>
        </div>
      </li>`).join('');
    conteo.textContent = visibles.length
      ? `${visibles.length} ${visibles.length === 1 ? 'sede' : 'sedes'}${q ? ` para «${buscar.value.trim()}»` : ''}`
      : 'No hay sedes con esa búsqueda. Prueba con Bogotá, Medellín o Cali.';
    if (mapa) {
      SEDES.forEach((s, i) => {
        const m = pines.get(i);
        const ver = visibles.some((v) => v.i === i);
        if (ver && !mapa.hasLayer(m)) m.addTo(mapa);
        if (!ver && mapa.hasLayer(m)) m.remove();
      });
      if (visibles.length) mapa.fitBounds(L.latLngBounds(visibles.map(({ s }) => [s.lat, s.lng])).pad(0.35), { maxZoom: 13 });
    }
  }

  function seleccionar(i, mover = true) {
    lista.querySelectorAll('.sede').forEach((li) => li.classList.toggle('activa', Number(li.dataset.i) === i));
    const li = lista.querySelector(`.sede[data-i="${i}"]`);
    if (li && !mover) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (mapa && mover) {
      const s = SEDES[i];
      mapa.flyTo([s.lat, s.lng], 13, { duration: 0.8 });
      pines.get(i).openPopup();
    }
  }

  lista.addEventListener('click', (e) => {
    const ir = e.target.closest('[data-ir]');
    if (ir) seleccionar(Number(ir.dataset.ir));
  });
  buscar.addEventListener('input', pintar);
  pestanas.forEach((b) => b.addEventListener('click', () => {
    tipo = b.dataset.tipo;
    pestanas.forEach((p) => p.setAttribute('aria-selected', String(p === b)));
    pintar();
  }));

  // El mapa se arma cuando la sección se acerca a la pantalla
  const obs = new IntersectionObserver((entradas) => {
    if (entradas.some((e) => e.isIntersecting)) {
      obs.disconnect();
      iniciarMapa();
      pintar();
      setTimeout(() => mapa && mapa.invalidateSize(), 200);
    }
  }, { rootMargin: '300px' });
  obs.observe(document.getElementById('concesionarios'));
  pintar();

  window.__koveSedes = { seleccionar };
})();
