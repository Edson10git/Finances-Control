// Contas bancarias e carteiras (Wise, Revolut, bancos em CH/PT/CV...): saldos introduzidos
// pelo utilizador, convertidos para a moeda base com as taxas que ele indicou.
// Nao guarda numeros de conta, IBAN nem credenciais.
import {knownRate, round} from './money.js';

export const accountKinds = {bank: 'Banco', wise: 'Wise', revolut: 'Revolut', cash: 'Dinheiro vivo', other: 'Outra'};
export const accountCountries = {CH: 'Suíça', PT: 'Portugal', CV: 'Cabo Verde', LT: 'Lituânia', FR: 'França', OTHER: 'Outro país'};
export const STALE_DAYS = 30;

export function daysSince(iso, today) {
 if (!iso || !today) return null;
 const diff = (new Date(today + 'T12:00:00') - new Date(iso + 'T12:00:00')) / 86400000;
 return Number.isFinite(diff) ? Math.max(0, Math.round(diff)) : null;
}

export function accountsSummary(state, today) {
 const base = state.currency;
 const rows = (state.accounts || []).map(a => {
  const rate = knownRate(state, base, a.currency);
  const age = daysSince(a.updatedAt, today);
  return {...a, inBase: rate ? round(a.balance / rate) : null, missingRate: !rate, age, stale: age != null && age > STALE_DAYS};
 });
 const byCurrency = {};
 for (const r of rows) byCurrency[r.currency] = round((byCurrency[r.currency] || 0) + r.balance);
 return {
  rows,
  total: round(rows.filter(r => r.inBase != null).reduce((s, r) => s + r.inBase, 0)),
  missing: rows.filter(r => r.missingRate).map(r => r.currency).filter((c, i, all) => all.indexOf(c) === i),
  stale: rows.filter(r => r.stale).length,
  byCurrency,
 };
}

export function upsertAccount(state, data, today) {
 const name = String(data.name || '').trim().slice(0, 60);
 if (!name) throw new Error('Dá um nome à conta, por exemplo «Wise EUR» ou «Banco em Cabo Verde».');
 const balance = Number(data.balance);
 if (!Number.isFinite(balance)) throw new Error('Indica o saldo atual da conta.');
 if (/\b[A-Z]{2}\d{2}[A-Z0-9 ]{10,}\b/i.test(name)) throw new Error('Não escrevas o IBAN no nome. Usa só um nome para reconhecer a conta.');
 state.accounts ??= [];
 const entry = {
  id: data.id || crypto.randomUUID(),
  name,
  kind: accountKinds[data.kind] ? data.kind : 'other',
  country: accountCountries[data.country] ? data.country : 'OTHER',
  currency: data.currency,
  balance: round(balance),
  updatedAt: today,
 };
 const idx = state.accounts.findIndex(a => a.id === entry.id);
 if (idx >= 0) state.accounts[idx] = entry; else state.accounts.push(entry);
 return entry;
}
