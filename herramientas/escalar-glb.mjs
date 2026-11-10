// Deja un GLB a tamaño real para la realidad aumentada: lo escala para que el largo (eje más largo) mida LARGO_M
// y apoya las llantas en el piso (y = 0). Uso: node herramientas/escalar-glb.mjs entrada.glb salida.glb 2.015
import { readFileSync, writeFileSync } from 'node:fs';
const [entrada, salida, largo] = process.argv.slice(2);
const b = readFileSync(entrada);
const lenJson = b.readUInt32LE(12);
const json = JSON.parse(b.subarray(20, 20 + lenJson).toString());
const resto = b.subarray(20 + lenJson);                       // trozo binario tal cual
let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
for (const m of json.meshes) for (const p of m.primitives) {
  const a = json.accessors[p.attributes.POSITION];
  a.min.forEach((v, i) => { min[i] = Math.min(min[i], v); }); a.max.forEach((v, i) => { max[i] = Math.max(max[i], v); });
}
const tam = max.map((v, i) => v - min[i]);
const s = Number(largo) / Math.max(...tam);
const raiz = { name: 'escala-real', scale: [s, s, s], translation: [-(min[0] + max[0]) / 2 * s, -min[1] * s, -(min[2] + max[2]) / 2 * s], children: json.scenes[json.scene || 0].nodes };
json.nodes.push(raiz);
json.scenes[json.scene || 0].nodes = [json.nodes.length - 1];
let texto = Buffer.from(JSON.stringify(json));
const relleno = (4 - (texto.length % 4)) % 4;
texto = Buffer.concat([texto, Buffer.alloc(relleno, 0x20)]);
const cab = Buffer.alloc(20);
cab.write('glTF', 0); cab.writeUInt32LE(2, 4); cab.writeUInt32LE(20 + texto.length + resto.length, 8);
cab.writeUInt32LE(texto.length, 12); cab.write('JSON', 16);
writeFileSync(salida, Buffer.concat([cab, texto, resto]));
console.log('escala', s.toFixed(4), 'tamaño real (m):', tam.map((v) => (v * s).toFixed(3)).join(' × '));
