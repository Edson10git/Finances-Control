// Leitura de taloes no proprio telemovel (Tesseract, servido pelo site em /ocr/).
// A foto nao sai do dispositivo. Motor e idioma sao descarregados so no primeiro uso.
let workerPromise = null;
let workerLang = null;
let progressHandler = null;

const STATUS = {
 'loading tesseract core': 'A preparar o leitor de talões',
 'initializing tesseract': 'A preparar o leitor de talões',
 'loading language traineddata': 'A descarregar o idioma (só na primeira vez)',
 'initializing api': 'Quase pronto',
 'recognizing text': 'A ler o talão',
};

// Taloes suicos estao sobretudo em alemao; Portugal e Cabo Verde em portugues.
export const ocrLanguage = currency => currency === 'CHF' ? 'deu' : 'por';

async function getWorker(lang) {
 if (workerPromise && workerLang === lang) return workerPromise;
 if (workerPromise) { try { (await workerPromise).terminate(); } catch {} }
 workerLang = lang;
 const base = new URL('ocr/', document.baseURI).href;
 const {createWorker} = await import('tesseract.js');
 workerPromise = createWorker(lang, 1, {
  workerPath: `${base}worker.min.js`,
  corePath: base,
  langPath: `${base}lang`,
  gzip: false,
  workerBlobURL: false,
  logger: m => progressHandler?.(STATUS[m.status] || 'A ler o talão', Math.round((m.progress || 0) * 100)),
 });
 workerPromise.catch(() => { workerPromise = null; workerLang = null; });
 return workerPromise;
}

// Reduz a foto e passa a tons de cinzento: mais rapido e mais legivel para o OCR.
async function prepare(file) {
 try {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.filter = 'grayscale(1) contrast(1.35)';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas;
 } catch { return file; }
}

export async function readReceiptImage(file, {currency, onProgress} = {}) {
 progressHandler = onProgress;
 const worker = await getWorker(ocrLanguage(currency));
 const {data} = await worker.recognize(await prepare(file));
 return {text: data.text || '', confidence: Math.round(data.confidence || 0)};
}
