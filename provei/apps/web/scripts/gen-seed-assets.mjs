// Gera imagens-marcador locais (SVG) para os dados de exemplo. Sem imagens com direitos de autor.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'seed');
mkdirSync(out, { recursive: true });

const palettes = [
  ['#7BC62D', '#2D7F1A'], ['#FFD60A', '#E8A400'], ['#F4A261', '#C0392B'], ['#A7D676', '#0A3D1C'],
  ['#FFE08A', '#D98E04'], ['#9AD0A0', '#2D7F1A'], ['#FFB4A2', '#B5443A'], ['#CDE7A5', '#4A5D4F'],
];
const svg = (i, [a, b]) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" role="img" aria-label="Imagem de exemplo ${i + 1}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
  <rect width="800" height="1000" fill="url(#g)"/>
  <circle cx="400" cy="460" r="250" fill="#FFFFFF" fill-opacity="0.92"/>
  <circle cx="400" cy="460" r="190" fill="${a}" fill-opacity="0.55"/>
  <circle cx="330" cy="420" r="46" fill="${b}" fill-opacity="0.8"/><circle cx="450" cy="500" r="58" fill="${b}" fill-opacity="0.7"/><circle cx="410" cy="380" r="34" fill="#FFD60A"/>
  <text x="400" y="840" text-anchor="middle" font-family="Georgia, serif" font-size="54" fill="#FFFFFF">Imagem de exemplo</text>
  <text x="400" y="900" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="#FFFFFF" fill-opacity="0.9">Provei · dados fictícios</text>
</svg>`;
palettes.forEach((p, i) => writeFileSync(join(out, `dish-${i + 1}.svg`), svg(i, p)));
palettes.forEach((p, i) => writeFileSync(join(out, `cover-${i + 1}.svg`), svg(i, p).replace('viewBox="0 0 800 1000"', 'viewBox="0 0 1600 640" preserveAspectRatio="xMidYMid slice"')));
console.log('Marcadores gerados em', out);
