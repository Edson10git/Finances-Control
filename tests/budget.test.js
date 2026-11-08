import test from 'node:test';
import assert from 'node:assert/strict';
import {budget,parseExpense} from '../src/budget.js';
const state=()=>({balance:1000,expenses:[{amount:100}],bills:[{amount:200,paid:false}],goal:{reserved:50},today:'2026-11-08',payday:'2026-11-18',contract:{rate:25,hours:160}});
test('reserves essential bills and goal without spending expected wages',()=>{assert.deepEqual(budget(state()),{spent:100,reserved:200,available:650,days:10,daily:65});});
test('paying a bill preserves available money when deducted from balance',()=>{const s=state();const before=budget(s).available;s.balance-=200;s.bills[0].paid=true;assert.equal(budget(s).available,before);});
test('overspending remains visible and daily allowance cannot be negative',()=>{const s=state();s.balance=0;assert.equal(budget(s).available,-350);assert.equal(budget(s).daily,0);});
test('payment dates today or past do not divide by zero',()=>{const s=state();s.payday='2026-11-01';assert.equal(budget(s).days,1);});
test('natural expense entry parses decimal amounts and shop',()=>{assert.deepEqual(parseExpense('Gastei 15,50 francos no Lidl'),{amount:15.5,merchant:'Lidl'});assert.equal(parseExpense('fui ao Lidl'),null);assert.equal(parseExpense('gastei 0 francos'),null);});
