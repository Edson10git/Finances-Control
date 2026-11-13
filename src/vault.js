const VAULT='fc-vault-v1', LEGACY='fc-v1';
let key=null,salt=null,queue=Promise.resolve();
const bytesToBase64=bytes=>btoa(String.fromCharCode(...bytes));
const fromBase64=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
async function derive(password,salt){const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
async function encrypted(state){const iv=crypto.getRandomValues(new Uint8Array(12));const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(state)));return JSON.stringify({version:1,salt:bytesToBase64(salt),iv:bytesToBase64(iv),data:bytesToBase64(new Uint8Array(data))});}
export function protectedVault(){return !!localStorage.getItem(VAULT);}
export async function loadState(){
 const raw=localStorage.getItem(VAULT);
 if(!raw){try{return JSON.parse(localStorage.getItem(LEGACY));}catch{return null;}}
 return new Promise(resolve=>{
  document.querySelector('#app').innerHTML=`<div class="vault-screen"><form id="unlock-form" class="card"><div class="logo">fc·</div><h1>O teu espaço está bloqueado.</h1><p>Introduz a palavra-passe do cofre local.</p><label>Palavra-passe<input type="password" name="password" autocomplete="current-password" required></label><p id="unlock-error" role="alert"></p><button class="primary full">Desbloquear</button><p class="fine">Sem recuperação de palavra-passe. Os dados ficam apenas neste dispositivo.</p></form></div>`;
  document.querySelector('#unlock-form').onsubmit=async event=>{event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;try{const payload=JSON.parse(raw);salt=fromBase64(payload.salt);const candidate=await derive(new FormData(event.target).get('password'),salt);const decoded=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromBase64(payload.iv)},candidate,fromBase64(payload.data));const state=JSON.parse(new TextDecoder().decode(decoded));key=candidate;resolve(state);}catch{document.querySelector('#unlock-error').textContent='Não foi possível desbloquear. Verifica a palavra-passe. Nenhum dado foi eliminado.';}finally{button.disabled=false;}};
  document.querySelector('[name=password]').focus();
 });
}
export function saveState(state){
 // Serialize immediately; queue encryption so older writes cannot overwrite newer ones.
 const snapshot=JSON.stringify(state);
 if(!key){localStorage.setItem(LEGACY,snapshot);return;}
 queue=queue.catch(()=>{}).then(async()=>{localStorage.setItem(VAULT,await encrypted(JSON.parse(snapshot)));});
 queue.catch(()=>{window.alert('Não foi possível guardar a última alteração no cofre. Exporta os dados antes de fechar o app.');});
}
export async function enableVault(password,state){
 if(password.length<12)throw new Error('Usa pelo menos 12 caracteres.');
 if(!crypto.subtle)throw new Error('O cofre exige um endereço HTTPS.');
 const previousKey=key,previousSalt=salt;
 try{salt=crypto.getRandomValues(new Uint8Array(16));key=await derive(password,salt);const raw=await encrypted(state);localStorage.setItem(VAULT,raw);localStorage.removeItem(LEGACY);}catch(error){key=previousKey;salt=previousSalt;throw error;}
}
export async function lockVault(){await queue;location.reload();}

// Ficheiros anexados: ficam no IndexedDB, nao no localStorage, e sao cifrados
// com a mesma chave do cofre quando o cofre esta ativo.
export const vaultActive = () => !!key;
export async function sealBytes(bytes) {
 if (!key) return {sealed: false, data: bytes};
 const iv = crypto.getRandomValues(new Uint8Array(12));
 const data = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, bytes);
 return {sealed: true, iv, data: new Uint8Array(data)};
}
export async function openBytes(record) {
 if (!record.sealed) return record.data;
 if (!key) throw new Error('Desbloqueia o cofre para abrir este documento.');
 return new Uint8Array(await crypto.subtle.decrypt({name: 'AES-GCM', iv: record.iv}, key, record.data));
}
