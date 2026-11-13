import test from 'node:test';
import assert from 'node:assert/strict';
import {migrate,portfolio,incomeTotals,addIncome,receiveIncome,removeIncome,addCategory} from '../src/finance.js';
import {budget} from '../src/budget.js';
test('existing records survive schema migration',()=>{const s={balance:120,expenses:[{amount:5}]};migrate(s);assert.equal(s.balance,120);assert.equal(s.expenses.length,1);assert.deepEqual(s.holdings,[]);assert.ok(s.categories.income.includes('Dividendos'));});
test('portfolio tracks gains without entering available budget',()=>{const s=migrate({balance:100,expenses:[],bills:[],goal:{reserved:0},today:'2026-11-08',payday:'2026-11-25'});s.holdings=[{quantity:2,cost:50,price:60},{quantity:0.5,cost:100,price:80}];assert.deepEqual(portfolio(s.holdings),{cost:150,value:160,gain:10,percent:10/150*100});assert.equal(budget(s).available,100);});
test('expected income is excluded until confirmed exactly once',()=>{const s=migrate({balance:100});addIncome(s,{id:'a',name:'Salário',amount:500,date:'2026-11-25',status:'expected'});assert.equal(s.balance,100);assert.deepEqual(incomeTotals(s.incomes,'2026-11'),{received:0,expected:500});receiveIncome(s,'a');receiveIncome(s,'a');assert.equal(s.balance,600);removeIncome(s,'a');assert.equal(s.balance,100);});
test('categories distinguish income from expenses and reject duplicates',()=>{const s=migrate({});addCategory(s,'income',' Rendas ');assert.ok(s.categories.income.includes('Rendas'));assert.ok(!s.categories.expense.includes('Rendas'));assert.throws(()=>addCategory(s,'income','rendas'));assert.throws(()=>addCategory(s,'expense','  '));});
import {normalizeCategories} from '../src/finance.js';
import {convertState} from '../src/money.js';
test('categorias antigas sem acentos sao corrigidas e nao ficam duplicadas',()=>{
 const s=migrate({balance:100,expenses:[{id:'1',amount:10,category:'Alimentacao'},{id:'2',amount:5,category:'Saude'},{id:'3',amount:7,category:'Mercearia do bairro'}],categories:{expense:['Alimentacao','Alimentação','Saude','Mercearia do bairro'],income:['Salario']}});
 assert.equal(s.expenses[0].category,'Alimentação');
 assert.equal(s.expenses[1].category,'Saúde');
 assert.equal(s.expenses[2].category,'Mercearia do bairro');
 assert.equal(s.categories.expense.filter(c=>c==='Alimentação').length,1);
 assert.ok(!s.categories.expense.includes('Alimentacao'));
 assert.ok(s.categories.expense.includes('Mercearia do bairro'));
 assert.ok(s.categories.income.includes('Salário'));
 assert.ok(!s.categories.income.includes('Salario'));
 assert.deepEqual(normalizeCategories(s).categories.expense.filter(c=>c==='Alimentação').length,1);
});
import {netWorth} from '../src/patrimonio.js';
test('património líquido = o que tens menos o que deves',()=>{
 const s=migrate({balance:2840,holdings:[{quantity:2,cost:100,price:150}],assets:[{id:'a',name:'Terreno',value:12000},{id:'b',name:'Carro',value:3500}],debts:[{id:'d',name:'Crédito',remaining:4200,monthly:180},{id:'e',name:'Empréstimo',remaining:800,monthly:0}]});
 const n=netWorth(s);
 assert.equal(n.cash,2840);
 assert.equal(n.invested,300);
 assert.equal(n.goods,15500);
 assert.equal(n.owned,18640);
 assert.equal(n.debts,5000);
 assert.equal(n.monthly,180);
 assert.equal(n.net,13640);
});
test('estado sem bens nem dívidas não parte e dá o saldo',()=>{
 const n=netWorth(migrate({balance:500}));
 assert.deepEqual([n.owned,n.debts,n.net],[500,0,500]);
});
test('mudar a moeda base converte bens e dívidas',()=>{
 const s=migrate({balance:100,assets:[{id:'a',name:'Terreno',value:1000}],debts:[{id:'d',name:'Crédito',remaining:200,monthly:50}],goal:{target:1,saved:0,reserved:0},currency:'CHF'});
 convertState(s,'EUR',2);
 assert.equal(s.assets[0].value,2000);
 assert.equal(s.debts[0].remaining,400);
 assert.equal(s.debts[0].monthly,100);
 assert.equal(netWorth(s).net,100*2+2000-400);
});
