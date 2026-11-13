import test from 'node:test';
import assert from 'node:assert/strict';
import {parseContract, parseValueDocument, findRate, findHours, findEmployer, findDate} from '../src/contract.js';

const suico = `ICM Bau Baar AG
Personalverleih-Vertrag
Arbeitgeberin: ICM Bau Baar AG, Baar ZG
Einsatzbetrieb: Baustelle Zug
Stundenlohn: CHF 28.50
Wochenstunden: 42.5
Zahltag: 25.11.2026`;

const portugues = `Contrato de trabalho temporário
Entidade patronal: Construções Fernandes Semedo Lda
Taxa horária: 9,75 EUR
Horas por semana: 40
Data de pagamento: 25/11/2026`;

test('contrato suíço em alemão', () => {
 const c = parseContract(suico);
 assert.equal(c.agency, 'ICM Bau Baar AG');
 assert.equal(c.rate, 28.5);
 assert.equal(c.hours, 42.5);
 assert.equal(c.payday, '2026-11-25');
 assert.deepEqual(c.found.sort(), ['agency','hours','payday','rate']);
});

test('contrato português com vírgula decimal', () => {
 const c = parseContract(portugues);
 assert.equal(c.agency, 'Construções Fernandes Semedo Lda');
 assert.equal(c.rate, 9.75);
 assert.equal(c.hours, 40);
 assert.equal(c.payday, '2026-11-25');
});

test('taxa escrita por extenso na linha', () => {
 assert.equal(findRate('O trabalhador recebe 31.20 CHF / h durante a missão.'), 31.2);
 assert.equal(findRate('Lohn 24,80 pro Stunde'), 24.8);
 assert.equal(findHours('Arbeitszeit beträgt 41 Stunden pro Woche'), 41);
});

test('não inventa o que não está no documento', () => {
 const c = parseContract('Documento sem nada de útil.');
 assert.deepEqual([c.agency, c.rate, c.hours, c.payday], [null, null, null, null]);
 assert.deepEqual(c.found, []);
 assert.equal(findEmployer('texto solto'), null);
 assert.equal(findDate('sem datas aqui'), null);
});

test('valores absurdos são rejeitados em vez de aceites', () => {
 assert.equal(findRate('Stundenlohn: CHF 4800.00'), null);
 assert.equal(findHours('Horas por semana: 900'), null);
 assert.equal(findDate('13/13/2026'), null);
});

test('escritura: propõe o maior valor e a data', () => {
 const d = parseValueDocument('Escritura de compra e venda, celebrado em 12/03/2024, pelo preço de 1.200.000,00 escudos, com sinal de 200.000 escudos.');
 assert.equal(d.amount, 1200000);
 assert.equal(d.date, '2024-03-12');
});
