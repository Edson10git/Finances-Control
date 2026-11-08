import test from 'node:test';
import assert from 'node:assert/strict';
import {todayISO,longDateLabel,isPast,nextMonthly} from '../src/dates.js';

test('a data de hoje vem do relogio do dispositivo', () => {
 assert.equal(todayISO(new Date(2027, 0, 3, 9, 30)), '2027-01-03');
 assert.match(todayISO(), /^\d{4}-\d{2}-\d{2}$/);
 assert.equal(todayISO(), new Date().toLocaleDateString('sv-SE'));
});

test('o cabecalho mostra o dia real em portugues', () => {
 assert.equal(longDateLabel(new Date(2027, 0, 3, 12)), 'DOMINGO, 3 DE JANEIRO');
 assert.equal(longDateLabel(new Date(2026, 10, 8, 12)), 'DOMINGO, 8 DE NOVEMBRO');
});

test('datas passadas sao reconhecidas', () => {
 assert.equal(isPast('2026-01-01', '2026-11-08'), true);
 assert.equal(isPast('2026-12-01', '2026-11-08'), false);
 assert.equal(isPast('', '2026-11-08'), false);
});

test('a sugestao de proximo pagamento avanca mes a mes e respeita meses curtos', () => {
 assert.equal(nextMonthly('2026-09-25', '2026-11-08'), '2026-11-25');
 assert.equal(nextMonthly('2026-11-25', '2026-11-08'), '2026-11-25');
 assert.equal(nextMonthly('2026-12-31', '2027-02-05'), '2027-02-28');
 assert.equal(nextMonthly('2026-11-30', '2027-01-05'), '2027-01-30');
});
