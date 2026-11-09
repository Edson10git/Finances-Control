import test from 'node:test';
import assert from 'node:assert/strict';
import {parseReceipt, amountsIn, detectReceiptDate} from '../src/receipt.js';
const cats = ['Alimentação','Transporte','Restaurantes','Casa','Saúde','Compras','Outros'];
const today = '2026-11-09';

test('talao suico da Migros', () => {
 const text = `MIGROS
Genossenschaft Migros Luzern
Filiale Schwanenplatz
Bananen          1.95
Vollmilch 1l     1.80
Brot Ruchmehl    3.20
Total CHF       23.40
Zwischensumme   23.40
MWST 2.6%  0.59
Karte Maestro   23.40
Rückgeld         0.00
08.11.2026 17:42`;
 const r = parseReceipt(text, {categories: cats, today});
 assert.deepEqual([r.merchant, r.amount, r.currency, r.date, r.category], ['Migros', 23.4, 'CHF', '2026-11-08', 'Alimentação']);
 assert.equal(r.confidence.amount, 'high');
});

test('talao portugues do Continente com IVA e troco', () => {
 const text = `CONTINENTE
Modelo Continente Hipermercados SA
NIF 502011475
PAO DE FORMA        1,49
LEITE MEIO GORDO    0,89
TOTAL A PAGAR       12,38 EUR
IVA 6%              0,70
Dinheiro            20,00
Troco                7,62
2026-11-07 10:15`;
 const r = parseReceipt(text, {categories: cats, today});
 assert.deepEqual([r.merchant, r.amount, r.currency, r.date], ['Continente', 12.38, 'EUR', '2026-11-07']);
});

test('talao de Cabo Verde com o cifrao como separador decimal', () => {
 const text = `Mercearia Boa Esperanca
Praia - Plateau
Arroz 1kg          250$00
Oleo               480$00
TOTAL            1.230$00
Recebido         2.000$00
Troco              770$00
05/11/26`;
 const r = parseReceipt(text, {categories: cats, today});
 assert.deepEqual([r.amount, r.currency, r.date, r.category], [1230, 'CVE', '2026-11-05', 'Alimentação']);
 assert.equal(r.merchant, 'Mercearia Boa Esperanca');
 assert.equal(r.confidence.merchant, 'low');
});

test('erros tipicos de OCR nos valores', () => {
 assert.deepEqual(amountsIn('Total 23.4O'), [23.4]);
 assert.deepEqual(amountsIn('Summe 1O5.20'), [105.2]);
 assert.deepEqual(amountsIn("TOTAL 1'234.50"), [1234.5]);
 assert.deepEqual(amountsIn('TOTAL 23 . 40'), [23.4]);
 assert.deepEqual(amountsIn('Total Fr. 12.-'), [12]);
 assert.deepEqual(amountsIn('Datum 08.11.2026'), [], 'datas nao sao valores');
});

test('sem linha de total, usa o valor repetido e marca como incerto', () => {
 const r = parseReceipt(`Kiosk\nCola 3.50\nChips 2.90\n6.40\nTWINT 6.40`, {categories: cats, today});
 assert.equal(r.amount, 6.4); assert.equal(r.confidence.amount, 'low');
});

test('texto ilegivel nao inventa valores', () => {
 const r = parseReceipt('~~ ## ||| ..', {categories: cats, today});
 assert.equal(r.amount, null); assert.equal(r.merchant, ''); assert.equal(r.confidence.amount, 'none');
});

test('datas futuras ou impossiveis sao ignoradas', () => {
 assert.equal(detectReceiptDate('31.02.2026', today), null);
 assert.equal(detectReceiptDate('01.12.2027', today), null);
});
