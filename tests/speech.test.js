import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSpoken,detectAmount,detectCurrency,detectCategory,wordsToNumbers} from '../src/speech.js';
const cats = ['Alimentação','Transporte','Restaurantes','Casa','Saúde','Compras','Outros'];

test('o exemplo do shopping: a loja ganha ao lugar generico', () => {
 const r = parseSpoken('Estou no shopping, fiz uma compra na loja Zara e o valor deu 45 francos', {categories:cats});
 assert.equal(r.amount, 45); assert.equal(r.currency, 'CHF'); assert.equal(r.merchant, 'Zara'); assert.equal(r.category, 'Compras'); assert.equal(r.complete, true);
});

test('frases curtas do dia a dia', () => {
 const lidl = parseSpoken('gastei 23,40 no Lidl', {categories:cats});
 assert.deepEqual([lidl.amount, lidl.merchant, lidl.category, lidl.currency], [23.4, 'Lidl', 'Alimentação', null]);
 const cafe = parseSpoken('paguei 4.50 euros no café central', {categories:cats});
 assert.deepEqual([cafe.amount, cafe.currency, cafe.category], [4.5, 'EUR', 'Restaurantes']);
 const pao = parseSpoken('300 escudos na padaria', {categories:cats});
 assert.deepEqual([pao.amount, pao.currency, pao.category], [300, 'CVE', 'Alimentação']);
 const sbb = parseSpoken('comprei um bilhete na SBB por 12 francos', {categories:cats});
 assert.deepEqual([sbb.amount, sbb.merchant, sbb.category], [12, 'SBB', 'Transporte']);
});

test('valores falados com centimos separados e milhares', () => {
 assert.equal(detectAmount('67 francos e 40'), 67.4);
 assert.equal(detectAmount('3 euros e 5'), 3.05);
 assert.equal(detectAmount("custou 1'200 francos"), 1200);
 assert.equal(detectAmount('deu 1 200 escudos'), 1200);
 assert.equal(detectAmount('nada aqui'), null);
});

test('moedas reconhecidas pelo nome', () => {
 assert.equal(detectCurrency('foram 20 euros'), 'EUR');
 assert.equal(detectCurrency('500 escudos'), 'CVE');
 assert.equal(detectCurrency('um franco'), 'CHF');
 assert.equal(detectCurrency('sem moeda'), null);
});

test('sem valor a frase fica incompleta e nao e guardada sozinha', () => {
 const r = parseSpoken('fui ao Lidl', {categories:cats});
 assert.equal(r.amount, null); assert.equal(r.complete, false);
});

test('categoria inexistente no utilizador cai em Outros', () => {
 assert.equal(detectCategory('zara', ['Alimentação','Outros']), 'Outros');
 assert.equal(detectCategory('coisa estranha', cats), 'Outros');
});

test('numeros ditos por extenso', () => {
 assert.equal(wordsToNumbers('gastei quinze francos'), 'gastei 15 francos');
 assert.equal(wordsToNumbers('vinte e cinco euros'), '25 euros');
 assert.equal(wordsToNumbers('mil e duzentos escudos'), '1200 escudos');
 assert.equal(wordsToNumbers('cento e vinte'), '120');
 assert.equal(wordsToNumbers('comprei um bilhete'), 'comprei um bilhete', 'artigo nao vira valor');
 const r = parseSpoken('gastei quinze francos no Lidl', {categories:cats});
 assert.deepEqual([r.amount, r.merchant, r.complete], [15, 'Lidl', true]);
});

test('sem loja, a palavra-chave serve de descricao', () => {
 const renda = parseSpoken('paguei a renda 1100', {categories:cats});
 assert.deepEqual([renda.amount, renda.merchant, renda.category, renda.complete], [1100, 'Renda', 'Casa', true]);
 const ikea = parseSpoken('Ikea 89.90', {categories:cats});
 assert.deepEqual([ikea.merchant, ikea.complete], ['Ikea', true]);
});
