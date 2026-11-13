// Documentos anexados (contrato, escritura, foto). Ficam no IndexedDB deste
// navegador: nunca sao enviados para lado nenhum e nunca entram no localStorage,
// que e pequeno demais para ficheiros. Com o cofre ativo ficam cifrados.
import {sealBytes, openBytes, vaultActive} from './vault.js';

const DB = 'fc-docs';
const STORE = 'files';
export const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export const isDocument = file => ALLOWED.includes(file?.type) || /\.(pdf|jpe?g|png|webp|heic|heif)$/i.test(file?.name || '');

function open() {
 return new Promise((resolve, reject) => {
  const request = indexedDB.open(DB, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE, {keyPath: 'id'});
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(new Error('Este navegador não deixou guardar o documento.'));
 });
}
const run = (mode, action) => open().then(db => new Promise((resolve, reject) => {
 const tx = db.transaction(STORE, mode);
 const request = action(tx.objectStore(STORE));
 request.onsuccess = () => resolve(request.result);
 request.onerror = () => reject(new Error('Não foi possível ler ou guardar o documento.'));
 tx.oncomplete = () => db.close();
}));

export async function saveDocument(file) {
 if (!isDocument(file)) throw new Error('Anexa um PDF ou uma imagem (JPG, PNG).');
 if (file.size > MAX_BYTES) throw new Error(`O ficheiro tem ${(file.size / 1048576).toFixed(1)} MB. O limite é 8 MB.`);
 const bytes = new Uint8Array(await file.arrayBuffer());
 const sealed = await sealBytes(bytes);
 const record = {id: crypto.randomUUID(), name: file.name.slice(0, 120), type: file.type || 'application/octet-stream', size: file.size, addedAt: new Date().toISOString(), ...sealed};
 await run('readwrite', store => store.put(record));
 // So a referencia vai para o estado; os bytes ficam no IndexedDB.
 return {id: record.id, name: record.name, type: record.type, size: record.size, sealed: record.sealed};
}

export async function documentBlob(id) {
 const record = await run('readonly', store => store.get(id));
 if (!record) throw new Error('Documento não encontrado neste dispositivo.');
 const bytes = await openBytes(record);
 return new Blob([bytes], {type: record.type});
}
export const deleteDocument = id => run('readwrite', store => store.delete(id)).catch(() => {});
export const vaultProtectsDocuments = () => vaultActive();

// Abre numa janela nova a partir da memoria. Sem servidor, sem link partilhavel.
export async function openDocument(id) {
 const url = URL.createObjectURL(await documentBlob(id));
 const anchor = document.createElement('a');
 anchor.href = url;
 anchor.target = '_blank';
 anchor.rel = 'noopener';
 anchor.click();
 setTimeout(() => URL.revokeObjectURL(url), 60000);
}
