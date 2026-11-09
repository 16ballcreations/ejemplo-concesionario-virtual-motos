// Noticias de kovemotocolombia.co, en formato de revista: una principal y el resto en grilla, con filtro.
(() => {
  const BASE = 'https://kovemotocolombia.co/es/noticias/';
  const NOTICIAS = [
    { cat: 'colombia', fecha: '2026-10-29', titulo: 'KOVE en la Expo 2 Ruedas de Bogotá',
      resumen: 'La gama se presenta en Corferias del 29 de octubre al 1 de noviembre, de la mano de Carrera Motos.',
      img: 'expo-thumb', url: 'expo-2-ruedas' },
    { cat: 'colombia', fecha: '2026-08-20', titulo: 'KOVE nombra a Carrera Motos representante oficial en Colombia',
      resumen: 'La fábrica lo publica en kovemoto.com: el primer respaldo del importador que se comprueba en el sitio del fabricante.',
      img: null, url: 'carrera-motos-representante-oficial-kove-colombia' },
    { cat: 'marca', fecha: null, titulo: 'KOVE se muda a una fábrica nueva',
      resumen: 'La marca trasladó desarrollo, pruebas y producción a una planta más grande.',
      img: 'kove-fabrica', url: 'kove-nueva-fabrica' },
    { cat: 'competicion', fecha: '2026-04-20', titulo: 'La 450RR marca récord de vuelta en WorldSPB',
      resumen: "Beñat Fernández firma 1'42.190 en Assen, récord de la categoría en el Mundial FIM Sportbike 2026.",
      img: 'worldspb-thumb', url: 'worldspb-assen-record' },
    { cat: 'competicion', fecha: '2026-01-18', titulo: 'Tres victorias de etapa en el Dakar 2026',
      resumen: 'La 450 Rally EX gana tres etapas en Rally2: la primera marca china que gana etapas del Dakar.',
      img: 'dakar-45-pista', url: 'dakar-2026-tres-victorias-de-etapa' },
    { cat: 'competicion', fecha: '2025-10-20', titulo: 'Primera marca china campeona del mundo en WSBK SSP300',
      resumen: 'El 19 de octubre de 2025, en Jerez, KOVE gana el título en la máxima categoría de motos de producción.',
      img: 'wsbk-thumb', url: 'wsbk-championship' },
    { cat: 'competicion', fecha: '2025-08-26', titulo: 'KOVE Italia corre el ISDE 2025 con motos de rally',
      resumen: 'En los Seis Días Internacionales de Enduro de Bérgamo, un equipo oficial nuevo con motos de rally.',
      img: 'isde-2025', url: 'kove-italia-isde-2025' },
  ];
  const CATS = { colombia: 'Colombia', competicion: 'Competición', marca: 'Marca' };
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const fecha = (f) => { if (!f) return ''; const [a, m, d] = f.split('-'); return `${Number(d)} ${MESES[Number(m) - 1]} ${a}`; };

  const grilla = document.getElementById('noticias-grilla');
  const filtros = [...document.querySelectorAll('#filtro-noticias [data-cat]')];

  function tarjeta(n, principal) {
    const foto = n.img
      ? `<img src="media/marca-kove/${n.img}.webp" alt="" loading="lazy">`
      : `<div class="nota__sinfoto" aria-hidden="true"><img src="media/marca/kove-logo-blanco.svg" alt=""></div>`;
    return `<a class="nota${principal ? ' nota--principal' : ''} nota--${n.cat}" href="${BASE}${n.url}" target="_blank" rel="noopener">
      <div class="nota__foto">${foto}</div>
      <div class="nota__texto">
        <p class="nota__meta"><span class="nota__cat">${CATS[n.cat]}</span>${n.fecha ? `<time datetime="${n.fecha}">${fecha(n.fecha)}</time>` : ''}</p>
        <h3>${n.titulo}</h3>
        ${principal ? `<p class="nota__resumen">${n.resumen}</p>` : ''}
        <span class="nota__leer">Leer la nota ↗</span>
      </div>
    </a>`;
  }

  function pintar(cat) {
    const lista = NOTICIAS.filter((n) => cat === 'todas' || n.cat === cat);
    grilla.innerHTML = lista.map((n, i) => tarjeta(n, i === 0)).join('');
  }

  filtros.forEach((b) => b.addEventListener('click', () => {
    filtros.forEach((f) => f.setAttribute('aria-selected', String(f === b)));
    pintar(b.dataset.cat);
  }));
  pintar('todas');
})();
