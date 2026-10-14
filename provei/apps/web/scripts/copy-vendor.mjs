// Copia o worker do MapLibre para public/vendor: o Next não emite o ficheiro que a v6 resolve via import.meta.url.
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const dist = dirname(require.resolve('maplibre-gl/package.json'));
mkdirSync('public/vendor', { recursive: true });
copyFileSync(join(dist, 'dist/maplibre-gl-worker.mjs'), 'public/vendor/maplibre-gl-worker.mjs');
