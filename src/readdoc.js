// Le um documento no proprio dispositivo: texto do PDF quando existe,
// OCR da primeira pagina quando o PDF e digitalizado, OCR da foto nos outros casos.
// Nada sai do telemovel. O motor de PDF so e descarregado quando anexas um PDF.
import {readReceiptImage} from './ocr.js';

const isPdf = file => file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');

async function pdfjs() {
 const [lib, worker] = await Promise.all([
  import('pdfjs-dist'),
  import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
 ]);
 lib.GlobalWorkerOptions.workerSrc = worker.default;
 return lib;
}

async function pdfDocument(file) {
 const lib = await pdfjs();
 const data = new Uint8Array(await file.arrayBuffer());
 // isEvalSupported a false: nada do PDF é executado como código.
 return lib.getDocument({data, isEvalSupported: false, disableAutoFetch: true}).promise;
}

// Ate 5 paginas: um contrato de trabalho raramente tem o essencial depois disso.
async function textLayer(doc) {
 let text = '';
 for (let n = 1; n <= Math.min(doc.numPages, 5); n++) {
  const page = await doc.getPage(n);
  const content = await page.getTextContent();
  text += content.items.map(item => item.str).join(' ') + '\n';
 }
 return text;
}

async function firstPageCanvas(doc) {
 const page = await doc.getPage(1);
 const base = page.getViewport({scale: 1});
 const viewport = page.getViewport({scale: Math.min(2.5, 1800 / base.width)});
 const canvas = document.createElement('canvas');
 canvas.width = Math.round(viewport.width);
 canvas.height = Math.round(viewport.height);
 await page.render({canvasContext: canvas.getContext('2d'), viewport, canvas}).promise;
 return canvas;
}

export async function readDocument(file, {currency, onProgress} = {}) {
 if (!isPdf(file)) {
  onProgress?.('A ler a imagem', 0);
  const {text, confidence} = await readReceiptImage(file, {currency, onProgress});
  return {text, confidence, source: 'imagem'};
 }
 onProgress?.('A abrir o PDF', 0);
 const doc = await pdfDocument(file);
 const text = await textLayer(doc);
 // Um PDF digitalizado traz pouco ou nenhum texto: nesse caso passa pelo OCR.
 if (text.replace(/\s/g, '').length >= 40) return {text, confidence: 100, source: 'PDF', pages: doc.numPages};
 onProgress?.('PDF digitalizado: a ler a primeira página', 0);
 const ocr = await readReceiptImage(await firstPageCanvas(doc), {currency, onProgress});
 return {text: ocr.text, confidence: ocr.confidence, source: 'PDF digitalizado', pages: doc.numPages};
}
