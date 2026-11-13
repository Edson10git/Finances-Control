// Património: o que é teu depois de pagar o que deves.
// As outras páginas respondem "quanto posso gastar"; esta responde "quanto valho".
// Nada aqui mexe no orçamento: bens e dívidas não aumentam nem reduzem o dinheiro disponível.
import {portfolio} from './finance.js';
import {currencies, formatMoney, knownRate, rememberRate, toBase} from './money.js';
import {readDocument} from './readdoc.js';
import {parseValueDocument} from './contract.js';
import {saveDocument, deleteDocument, openDocument} from './docs.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let cur = 'CHF';
// Documento anexado no formulario aberto, ainda nao guardado com o bem ou a divida.
let docDraft = null;
export function resetPatrimonioDraft() {
 if (docDraft?.doc) deleteDocument(docDraft.doc.id);
 docDraft = null;
}
const money = n => formatMoney(n, cur);

export const ASSET_KINDS = [
 ['imovel', 'Casa ou terreno'],
 ['veiculo', 'Veículo'],
 ['equipamento', 'Equipamento ou ferramentas'],
 ['poupanca', 'Dinheiro noutra conta'],
 ['negocio', 'Parte de um negócio'],
 ['outro', 'Outro bem'],
];
const kindLabel = id => ASSET_KINDS.find(([k]) => k === id)?.[1] || 'Outro bem';
const kindIcon = id => ({imovel:'⌂', veiculo:'⛟', equipamento:'⚒', poupanca:'▤', negocio:'◈', outro:'◆'}[id] || '◆');

export function patrimonio(state) {
 cur = state.currency || 'CHF';
 const n = netWorth(state);
 const share = n.owned > 0 ? Math.min(100, Math.round(n.debts / n.owned * 100)) : 0;

 const ownedRows = [
  ['Dinheiro em conta', n.cash],
  ['Investimentos', n.invested],
  ['Bens registados', n.goods],
 ].map(([label, value]) => `<div class="equation"><span>${label}</span><b>${money(value)}</b></div>`).join('');

 const assetsList = (state.assets || []).length
  ? state.assets.map(a => `<div class="movement"><span class="merchant-icon">${kindIcon(a.kind)}</span><div><b>${esc(a.name)}</b><small>${esc(kindLabel(a.kind))}${a.place ? ' · ' + esc(a.place) : ''} · avaliado em ${esc(a.date)}${a.doc ? ' · ▤ ' + esc(a.doc.name) : ''}</small>${a.original ? `<small>Valor indicado: ${formatMoney(a.original.amount, a.original.currency)}</small>` : ''}</div><div class="movement-value"><b>${money(a.value)}</b>${a.doc ? `<button class="text-button" data-open-doc="${esc(a.doc.id)}">Ver documento</button>` : ''}<button class="text-button" data-remove-asset="${esc(a.id)}">Eliminar</button></div></div>`).join('')
  : '<div class="empty"><h2>Os teus bens começam aqui.</h2><p>Casa, terreno, carro, ferramentas — o que tens e não está em conta.</p></div>';

 const debtsList = (state.debts || []).length
  ? state.debts.map(d => `<div class="movement"><span class="merchant-icon">↘</span><div><b>${esc(d.name)}</b><small>${d.creditor ? esc(d.creditor) + ' · ' : ''}em falta desde ${esc(d.date)}${d.interest ? ' · juro ' + esc(String(d.interest)) + '%' : ''}</small>${d.monthly ? `<small>Pagamento mensal: ${money(d.monthly)}</small>` : ''}${d.original ? `<small>Valor indicado: ${formatMoney(d.original.amount, d.original.currency)}</small>` : ''}</div><div class="movement-value"><b class="loss">− ${money(d.remaining)}</b>${d.doc ? `<button class="text-button" data-open-doc="${esc(d.doc.id)}">Ver documento</button>` : ''}<button class="text-button" data-remove-debt="${esc(d.id)}">Eliminar</button></div></div>`).join('')
  : '<div class="empty"><h2>Sem dívidas registadas.</h2><p>Crédito, prestação, dinheiro emprestado por alguém — regista aqui para o número ser verdadeiro.</p></div>';

 return `<div class="dashboard">
  <section class="hero">
   <div class="hero-top"><span>◈ O QUE É TEU</span><span class="pill">${esc(cur)}</span></div>
   <p>Depois de pagar o que deves</p>
   <h2>${money(n.net)}</h2>
   <div class="daily">${money(n.owned)}<span>que tens</span> · ${money(n.debts)}<span>que deves</span></div>
   <div class="hero-line"></div>
   <div class="hero-foot"><div>Pagamentos mensais de dívida<b>${money(n.monthly)}</b></div><div class="hero-note">${n.debts > 0 ? `${share}% do que tens<br>já está prometido` : 'Não deves nada<br>registado ✓'}</div></div>
  </section>
  <section class="card summary">
   <div class="section-heading"><h3>De onde vem este valor?</h3><span class="muted">ⓘ</span></div>
   ${ownedRows}
   <div class="equation"><span>Dívidas por pagar</span><b>− ${money(n.debts)}</b></div>
   <div class="equation total"><span>Património líquido</span><b>${money(n.net)}</b></div>
   <p class="fine">Este valor não é dinheiro disponível para gastar. O que podes gastar até receber está na Visão geral.</p>
  </section>
 </div>
 <section class="card section-gap">
  <div class="section-heading"><h3>O que tens</h3><button class="primary" data-open="asset">＋ Adicionar bem</button></div>
  <p class="fine">Valores indicados por ti. O app não avalia nada nem consulta preços de mercado.</p>
  ${assetsList}
 </section>
 <section class="card section-gap">
  <div class="section-heading"><h3>O que deves</h3><button class="primary" data-open="debt">＋ Adicionar dívida</button></div>
  <p class="fine">Regista aqui o valor que falta pagar. Para a prestação entrar no orçamento do mês, regista-a também como conta por pagar — aqui ela não é descontada do disponível.</p>
  ${debtsList}
 </section>`;
}

// Tudo em moeda base. Investimentos entram pelo valor, nao pelo custo.
export function netWorth(state) {
 const number = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
 const cash = number(state.balance);
 const invested = portfolio(state.holdings || []).value;
 const goods = (state.assets || []).reduce((sum, a) => sum + number(a.value), 0);
 const debts = (state.debts || []).reduce((sum, d) => sum + number(d.remaining), 0);
 const monthly = (state.debts || []).reduce((sum, d) => sum + number(d.monthly), 0);
 const owned = cash + invested + goods;
 return {cash, invested, goods, owned, debts, monthly, net: owned - debts};
}

const currencyRow = (state, selected) => {
 const same = selected === state.currency;
 const rate = knownRate(state, state.currency, selected);
 return `<div class="form-row"><label>Moeda<select name="currency">${currencies.map(c => `<option value="${c.code}" ${c.code === selected ? 'selected' : ''}>${c.code} · ${c.name}</option>`).join('')}</select></label><label class="rate-field" ${same ? 'hidden' : ''}>1 ${esc(state.currency)} = ? <input name="rate" type="number" min="0.000001" step="any" value="${same ? '' : (rate ?? '')}"></label></div>`;
};

const attachField = () => `<label class="photo-pick" for="asset-doc"><span>▤</span> ${docDraft?.doc ? 'Anexar outro documento' : 'Anexar documento (PDF ou foto)'}</label><input type="file" id="asset-doc" accept="application/pdf,image/*" hidden><p class="fine" id="asset-doc-status" role="status">${docDraft?.note ? esc(docDraft.note) : 'Escritura, contrato, fatura. É lido e guardado só neste dispositivo, e nunca enviado.'}</p>`;

export function patrimonioDialog(type, state) {
 if (!['asset', 'debt'].includes(type)) return null;
 cur = state.currency || 'CHF';
 const today = state.today;
 const title = type === 'asset' ? 'Adicionar um bem' : 'Adicionar uma dívida';
 const fields = type === 'asset'
  ? `<p class="fine">O que tens e não está na conta: casa, terreno, carro, ferramentas, dinheiro noutro banco. Indica o valor que achas que vale hoje.</p>
     ${attachField()}
     <label>O que é<input name="name" value="${esc(docDraft?.name || '')}" maxlength="80" placeholder="Terreno em Santa Catarina" required></label>
     <label>Tipo<select name="kind">${ASSET_KINDS.map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}</select></label>
     <div class="form-row"><label>Valor<input name="amount" type="number" min="0.01" step="0.01" value="${docDraft?.amount ?? ''}" required></label><label>Data da avaliação<input name="date" type="date" value="${docDraft?.date || today}" max="${today}" required></label></div>
     ${currencyRow(state, state.currency)}
     <label>Onde está (opcional)<input name="place" maxlength="60" placeholder="Cabo Verde · Santiago"></label>`
  : `<p class="fine">Indica o valor que ainda falta pagar, não o valor total emprestado.</p>
     ${attachField()}
     <label>Que dívida é<input name="name" value="${esc(docDraft?.name || '')}" maxlength="80" placeholder="Crédito do carro" required></label>
     <label>A quem deves (opcional)<input name="creditor" maxlength="60" placeholder="Banco, família, loja"></label>
     <div class="form-row"><label>Falta pagar<input name="amount" type="number" min="0.01" step="0.01" value="${docDraft?.amount ?? ''}" required></label><label>Pagamento mensal (opcional)<input name="monthly" type="number" min="0" step="0.01"></label></div>
     ${currencyRow(state, state.currency)}
     <div class="form-row"><label>Taxa de juro % (opcional)<input name="interest" type="number" min="0" max="100" step="0.01"></label><label>Desde<input name="date" type="date" value="${docDraft?.date || today}" max="${today}" required></label></div>`;

 return `<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="section-heading"><h2 id="dialog-title">${title}</h2><button class="close" id="close" aria-label="Fechar">×</button></div><form id="asset-form" data-kind="${type}">${fields}<p id="asset-error" role="alert"></p><button class="primary full" type="submit">Confirmar e guardar</button></form></section></div>`;
}

export function bindPatrimonio({state, save, render, close, notify}) {
 const docInput = document.querySelector('#asset-doc');
 if (docInput) docInput.onchange = async () => {
  const file = docInput.files?.[0];
  if (!file) return;
  const status = document.querySelector('#asset-doc-status'), pick = document.querySelector('.photo-pick');
  pick?.classList.add('busy');
  const show = (label, pct) => { if (status) status.textContent = pct && pct < 100 ? `${label}… ${pct}%` : `${label}…`; };
  try {
   show('A ler o documento');
   const {text, source} = await readDocument(file, {currency: state.currency, onProgress: show});
   const read = parseValueDocument(text);
   const stored = await saveDocument(file);
   const found = [read.amount !== null && 'um valor', read.date && 'uma data'].filter(Boolean);
   docDraft = {doc: stored, amount: read.amount ?? docDraft?.amount, date: read.date ?? docDraft?.date, name: docDraft?.name || file.name.replace(/\.[^.]+$/, '').slice(0, 80),
    note: found.length ? `${stored.name}: li ${found.join(' e ')} do ${source}. Confirma — pode não ser o valor certo.` : `${stored.name} ficou anexado. Não consegui ler valores deste ${source}; escreve-os à mão.`};
   render();
  } catch (error) { if (status) status.textContent = error.message; }
  finally { pick?.classList.remove('busy'); }
 };
 document.querySelectorAll('[data-open-doc]').forEach(el => el.onclick = () => openDocument(el.dataset.openDoc).catch(error => { notify(error.message); render(); }));
 document.querySelector('#asset-form select[name=currency]')?.addEventListener('change', event => {
  const field = document.querySelector('#asset-form .rate-field');
  const same = event.target.value === state.currency;
  field.hidden = same;
  field.querySelector('input').value = same ? '' : (knownRate(state, state.currency, event.target.value) ?? '');
 });
 for (const [attr, key] of [['removeAsset', 'assets'], ['removeDebt', 'debts']]) {
  document.querySelectorAll(`[data-${attr === 'removeAsset' ? 'remove-asset' : 'remove-debt'}]`).forEach(el => el.onclick = () => {
   const id = el.dataset[attr];
   const item = (state[key] || []).find(x => x.id === id);
   if (!item || !confirm(`Eliminar «${item.name}»? Esta ação não pode ser anulada.`)) return;
   if (item.doc) deleteDocument(item.doc.id);
   state[key] = state[key].filter(x => x.id !== id);
   save(); render();
  });
 }
 document.querySelector('#asset-form')?.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target;
  const d = Object.fromEntries(new FormData(form));
  try {
   const amount = Number(d.amount);
   if (!Number.isFinite(amount) || amount <= 0) throw new Error('Indica um valor maior que zero.');
   const conv = toBase(amount, d.currency, state.currency, Number(d.rate));
   if (d.currency !== state.currency) rememberRate(state, state.currency, d.currency, Number(d.rate));
   const base = {id: crypto.randomUUID(), name: String(d.name).trim(), date: d.date, ...(conv.original ? {original: conv.original} : {}), ...(docDraft?.doc ? {doc: docDraft.doc} : {})};
   if (form.dataset.kind === 'asset') {
    state.assets.unshift({...base, kind: d.kind, place: String(d.place || '').trim(), value: conv.amount});
    notify('Bem registado. O dinheiro disponível não mudou.');
   } else {
    const monthly = Number(d.monthly) || 0;
    if (monthly < 0) throw new Error('O pagamento mensal não pode ser negativo.');
    const monthlyBase = monthly ? toBase(monthly, d.currency, state.currency, Number(d.rate)).amount : 0;
    state.debts.unshift({...base, creditor: String(d.creditor || '').trim(), remaining: conv.amount, monthly: monthlyBase, interest: Number(d.interest) || 0});
    notify('Dívida registada. O orçamento do mês não foi alterado.');
   }
   docDraft = null;
   save(); close(); render();
  } catch (error) {
   document.querySelector('#asset-error').textContent = error.message;
  }
 });
}
