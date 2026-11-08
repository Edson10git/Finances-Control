import test from 'node:test';
import assert from 'node:assert/strict';
import {formatMoney,toBase,convertState,knownRate,rememberRate,isFixedPair} from '../src/money.js';

const plain = s => s.replace(/[\u00a0\u202f]/g,' ').replace(/[\u2019]/g,"'").trim();
test('formata cada moeda na notacao do seu pais', () => {
 assert.equal(plain(formatMoney(1234.5,'CHF')), "CHF 1'234.50");
 assert.equal(plain(formatMoney(1234.5,'EUR')), '1234,50 €');
 assert.match(plain(formatMoney(1234.5,'CVE')), /^1234\$50/);
});

test('despesa noutra moeda e guardada na base com o original preservado', () => {
 // 1 CHF = 117 CVE; 1170 CVE -> 10 CHF
 assert.deepEqual(toBase(1170,'CVE','CHF',117), {amount:10, original:{amount:1170, currency:'CVE', rate:117}});
 assert.deepEqual(toBase(12.3,'CHF','CHF'), {amount:12.3});
 assert.throws(() => toBase(10,'EUR','CHF',0), /taxa/);
});

test('a paridade EUR/CVE e conhecida sem o utilizador a escrever', () => {
 assert.equal(knownRate({}, 'EUR', 'CVE'), 110.265);
 assert.ok(Math.abs(knownRate({}, 'CVE', 'EUR') - 1/110.265) < 1e-9);
 assert.equal(isFixedPair('CVE','EUR'), true);
 assert.equal(knownRate({}, 'CHF', 'EUR'), null, 'sem taxa guardada, nao inventa');
});

test('a ultima taxa usada e lembrada nos dois sentidos', () => {
 const s = {};
 rememberRate(s, 'CHF', 'EUR', 1.06);
 assert.equal(knownRate(s, 'CHF', 'EUR'), 1.06);
 assert.ok(Math.abs(knownRate(s, 'EUR', 'CHF') - 1/1.06) < 1e-9);
});

test('mudar a moeda base converte tudo e deixa registo', () => {
 const s = {currency:'CHF', balance:100, goal:{target:300, saved:150, reserved:20},
  expenses:[{amount:10}], bills:[{amount:50}], incomes:[{amount:200}], holdings:[{cost:2, price:4}], contract:{rate:30, hours:10}};
 convertState(s, 'EUR', 1.05);
 assert.equal(s.currency, 'EUR');
 assert.equal(s.balance, 105);
 assert.deepEqual(s.goal, {target:315, saved:157.5, reserved:21});
 assert.equal(s.expenses[0].amount, 10.5);
 assert.equal(s.holdings[0].price, 4.2);
 assert.equal(s.contract.rate, 31.5);
 assert.equal(s.currencyLog.length, 1);
 assert.throws(() => convertState(s, 'CVE', 0), /taxa/);
 assert.throws(() => convertState(s, 'XXX', 1), /suportada/);
});
