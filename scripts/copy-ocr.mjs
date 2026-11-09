// Copia o motor de OCR e os idiomas para public/ocr antes do build.
// Assim tudo e servido pelo proprio site: a foto do talao nunca sai do telemovel.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const root = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const out = path.join(root, 'public', 'ocr');
const pkgDir = name => path.dirname(require.resolve(`${name}/package.json`));

fs.rmSync(out, {recursive: true, force: true});
fs.mkdirSync(path.join(out, 'lang'), {recursive: true});

fs.copyFileSync(path.join(pkgDir('tesseract.js'), 'dist', 'worker.min.js'), path.join(out, 'worker.min.js'));
// Apenas as variantes LSTM: o carregador escolhe uma conforme o processador do telemovel.
for (const file of ['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js'])
 fs.copyFileSync(path.join(pkgDir('tesseract.js-core'), file), path.join(out, file));

for (const lang of ['por', 'deu']) {
 const gz = fs.readFileSync(path.join(pkgDir(`@tesseract.js-data/${lang}`), '4.0.0_best_int', `${lang}.traineddata.gz`));
 fs.writeFileSync(path.join(out, 'lang', `${lang}.traineddata`), zlib.gunzipSync(gz));
}
const size = fs.readdirSync(out, {recursive: true}).map(f => path.join(out, f)).filter(f => fs.statSync(f).isFile()).reduce((a, f) => a + fs.statSync(f).size, 0);
console.log(`OCR copiado para public/ocr (${(size / 1048576).toFixed(1)} MB)`);
