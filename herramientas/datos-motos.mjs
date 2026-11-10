// Arma js/motos-datos.js: une los datos escritos a mano (herramientas/motos-base.mjs) con la ficha técnica
// investigada y con fuentes (fuentes/investigacion/motos.json). Uso: node herramientas/datos-motos.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { BASE, FILAS_FUERA, ICONOS } from './motos-base.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const inv = JSON.parse(readFileSync(join(raiz, 'fuentes/investigacion/motos.json'), 'utf8')).motos;
const salida = {};
for (const [id, m] of Object.entries(BASE)) {
  const ficha = {};
  for (const [seccion, filas] of Object.entries(inv[id].secciones)) {
    const limpias = filas.filter(([k, v]) => !/^No publicad/i.test(v) && !FILAS_FUERA.test(k)).map(([k, v, f]) => [k, v, f || '']);
    if (limpias.length) ficha[seccion] = limpias;
  }
  salida[id] = { ...m, ficha, completitud: inv[id].completitud || '' };
}
const js = `// Generado por herramientas/datos-motos.mjs a partir de motos-base.mjs y la investigación con fuentes. No editar a mano.
window.KOVE_MOTOS = ${JSON.stringify(salida, null, 1)};
window.KOVE_ICONOS = ${JSON.stringify(ICONOS)};
`;
writeFileSync(join(raiz, 'js/motos-datos.js'), js);
console.log('js/motos-datos.js:', Object.keys(salida).join(', '), (js.length / 1024).toFixed(0) + ' KB');
