import test from 'node:test';
import assert from 'node:assert/strict';
import {accountsSummary, upsertAccount, daysSince} from '../src/accounts.js';

const base = () => ({currency: 'CHF', rates: {'CHF>EUR': 1.05}, accounts: []});

test('soma as contas na moeda base, incluindo escudos pela paridade EUR', () => {
 const s = base();
 upsertAccount(s, {name: 'UBS', kind: 'bank', country: 'CH', currency: 'CHF', balance: '1200'}, '2026-11-15');
 upsertAccount(s, {name: 'Wise EUR', kind: 'wise', country: 'LT', currency: 'EUR', balance: '525'}, '2026-11-15');
 upsertAccount(s, {name: 'Revolut', kind: 'revolut', country: 'LT', currency: 'EUR', balance: '105'}, '2026-11-15');
 const r = accountsSummary(s, '2026-11-15');
 assert.equal(r.total, 1800); // 1200 + 500 + 100
 assert.deepEqual(r.byCurrency, {CHF: 1200, EUR: 630});
 assert.deepEqual(r.missing, []);
});

test('escudos sem taxa CHF ficam de fora do total e sao assinalados', () => {
 const s = base();
 upsertAccount(s, {name: 'BCA Praia', kind: 'bank', country: 'CV', currency: 'CVE', balance: '50000'}, '2026-11-15');
 const r = accountsSummary(s, '2026-11-15');
 assert.equal(r.total, 0);
 assert.deepEqual(r.missing, ['CVE']);
 // com base em EUR, a paridade fixa resolve: 50000 / 110.265
 const eur = {currency: 'EUR', rates: {}, accounts: s.accounts};
 assert.equal(accountsSummary(eur, '2026-11-15').total, 453.45);
});

test('saldos antigos sao marcados para atualizar', () => {
 const s = base();
 upsertAccount(s, {name: 'Conta PT', kind: 'bank', country: 'PT', currency: 'EUR', balance: '10'}, '2026-09-01');
 const r = accountsSummary(s, '2026-11-15');
 assert.equal(r.rows[0].age, 75); assert.equal(r.rows[0].stale, true); assert.equal(r.stale, 1);
 assert.equal(daysSince('2026-11-15', '2026-11-15'), 0);
});

test('atualizar mantem a mesma conta e muda a data', () => {
 const s = base();
 const a = upsertAccount(s, {name: 'Wise CHF', kind: 'wise', country: 'LT', currency: 'CHF', balance: '10'}, '2026-11-01');
 upsertAccount(s, {...a, balance: '99.5'}, '2026-11-15');
 assert.equal(s.accounts.length, 1);
 assert.deepEqual([s.accounts[0].balance, s.accounts[0].updatedAt], [99.5, '2026-11-15']);
});

test('nao aceita conta sem nome, saldo invalido ou IBAN no nome', () => {
 const s = base();
 assert.throws(() => upsertAccount(s, {name: ' ', currency: 'CHF', balance: '1'}, '2026-11-15'), /nome/);
 assert.throws(() => upsertAccount(s, {name: 'X', currency: 'CHF', balance: 'abc'}, '2026-11-15'), /saldo/);
 assert.throws(() => upsertAccount(s, {name: 'CH93 0076 2011 6238 5295 7', currency: 'CHF', balance: '1'}, '2026-11-15'), /IBAN/);
 // descoberto bancario e permitido
 assert.equal(upsertAccount(s, {name: 'Conta a descoberto', currency: 'CHF', balance: '-40'}, '2026-11-15').balance, -40);
});
