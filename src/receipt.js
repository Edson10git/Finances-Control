// Interpreta o texto lido de um talao (Suica, Portugal, Cabo Verde).
// Devolve so o que encontrou, com o grau de confianca; nunca preenche valores inventados.
import {matchCategory} from './speech.js';

const KNOWN = ['Migros','Coop','Lidl','Aldi','Denner','Spar','Volg','Manor','Landi','Jumbo','Ikea','Interdiscount','Media Markt','Galaxus','SBB','Continente','Pingo Doce','Intermarché','Minipreço','Mercadona','Auchan','Leclerc','Worten','Fnac','Decathlon','Zara','H&M','Primark','Mango','Kiabi','McDonald\'s','Burger King','KFC','Starbucks','Shell','BP','Galp','Repsol','Tamoil','Avia'];
const TOTAL = /\b(total(?:\s*a\s*pagar)?|totale|gesamt(?:betrag)?|summe|zu\s*zahlen|a\s*pagar|montante|endbetrag|rechnungsbetrag|betrag)\b/i;
const NOT_TOTAL = /(sub\s*-?\s*total|zwischensumme|\d+[.,]?\d*\s*%|r[üu]ckgeld|troco|change|gegeben|entregue|recebido|punkte|pontos|cumulus|supercard)/i;
const NOT_AMOUNT_LINE = /(r[üu]ckgeld|troco|change|gegeben|entregue|recebido|\d+[.,]?\d*\s*%|tel\.?|telefone|nif|uid|mwst-?nr|che-\d)/i;

// "1'234.50" "1 234,50" "1.234,50" "12.50" "12,50" "1.250$00" (escudo) "12.-" (Suica)
const AMOUNT = /(?<![\d.,'$])(\d{1,3}(?:[' ’., ]\d{3})+|\d+)(?:\s?([.,$])\s?(\d{2})(?![\d]|[./-]\d)|\.\s?[-–](?!\d))/g;

function fixOcr(line) {
 return line
  .replace(/(?<=\d)[oO](?=[\d.,$])|(?<=[\d.,$])[oO](?=\d)|(?<=[.,$]\d)[oO]\b/g, '0')
  .replace(/(?<=\d)\s+([.,])\s*(?=\d{2}\b)/g, '$1');
}

export function amountsIn(line) {
 const found = [];
 for (const m of fixOcr(line).matchAll(AMOUNT)) {
  const whole = Number(m[1].replace(/[' ’., ]/g, ''));
  const cents = m[3] ? Number(m[3]) : 0;
  const value = Math.round((whole + cents / 100) * 100) / 100;
  if (value > 0 && value < 1e7) found.push(value);
 }
 return found;
}

export function detectReceiptCurrency(text) {
 if (/\bCHF\b|\bSFr\b|\bFr\.\s?\d/i.test(text)) return 'CHF';
 if (/€|\bEUR\b/i.test(text)) return 'EUR';
 if (/\bCVE\b|\bECV\b|\d\$\d{2}\b/i.test(text)) return 'CVE';
 return null;
}

export function detectReceiptDate(text, today = new Date().toLocaleDateString('sv-SE')) {
 const candidates = [];
 for (const m of text.matchAll(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})\b/g)) {
  const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  candidates.push([y, Number(m[2]), Number(m[1])]);
 }
 for (const m of text.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g)) candidates.push([Number(m[1]), Number(m[2]), Number(m[3])]);
 for (const [y, mo, d] of candidates) {
  const date = new Date(y, mo - 1, d, 12);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) continue;
  const iso = date.toLocaleDateString('sv-SE');
  if (iso <= today && y >= 2000) return iso;
 }
 return null;
}

function detectMerchant(lines) {
 const joined = lines.join('\n');
 for (const name of KNOWN) {
  const re = new RegExp(`(^|[^a-zà-ú])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s/g, '\\s*')}($|[^a-zà-ú])`, 'i');
  if (re.test(joined)) return {merchant: name, sure: true};
 }
 for (const line of lines.slice(0, 6)) {
  const clean = line.replace(/[^\p{L}\p{N}&' .-]/gu, ' ').replace(/\s+/g, ' ').trim();
  const letters = (clean.match(/\p{L}/gu) || []).length;
  if (letters < 3 || letters < clean.length * 0.5) continue;
  if (/www\.|http|tel|fax|mwst|iva|nif|uid|rua |strasse|straße|avenida|\d{4}\s/i.test(clean)) continue;
  const name = clean.split(' ').slice(0, 4).join(' ');
  return {merchant: name.toLocaleLowerCase('pt-PT').replace(/(^|\s)\p{L}/gu, c => c.toLocaleUpperCase('pt-PT')), sure: false};
 }
 return {merchant: '', sure: false};
}

export function parseReceipt(text, {categories = [], today} = {}) {
 const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
 let amount = null, amountSure = false;
 const totals = lines.filter(l => TOTAL.test(l) && !NOT_TOTAL.test(l)).flatMap(amountsIn);
 if (totals.length) { amount = Math.max(...totals); amountSure = true; }
 else {
  // Sem linha de total: o valor que mais se repete (total + pagamento com cartao).
  const all = lines.filter(l => !NOT_AMOUNT_LINE.test(l)).flatMap(amountsIn);
  const count = new Map(); all.forEach(v => count.set(v, (count.get(v) || 0) + 1));
  const best = [...count].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
  if (best && best[1] >= 2) amount = best[0];
 }
 const {merchant, sure} = detectMerchant(lines);
 const {category} = matchCategory(`${merchant} ${text}`, categories);
 return {
  amount, merchant, category,
  date: detectReceiptDate(text, today),
  currency: detectReceiptCurrency(text),
  confidence: {amount: amount == null ? 'none' : amountSure ? 'high' : 'low', merchant: merchant ? (sure ? 'high' : 'low') : 'none'},
 };
}
