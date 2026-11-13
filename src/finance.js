export const defaultCategories = {expense:['Alimentação','Transporte','Restaurantes','Casa','Saúde','Compras','Outros'],income:['Salário','Trabalho independente','Negócio','Dividendos','Juros','Outros']};
const fold=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-PT');
// Registos criados por versoes antigas ficaram com "Alimentacao" em vez de "Alimentação".
// Sem isto o utilizador acaba com duas categorias iguais com nomes diferentes.
export function normalizeCategories(state){
 const canon=new Map([...defaultCategories.expense,...defaultCategories.income].map(name=>[fold(name),name]));
 const fix=name=>canon.get(fold(name))??name;
 for(const list of ['expenses','incomes'])for(const item of state[list]||[])if(item?.category)item.category=fix(item.category);
 for(const type of ['expense','income']){
  const seen=new Set();
  state.categories[type]=(state.categories[type]||[]).map(fix).filter(name=>{const key=fold(name);if(seen.has(key))return false;seen.add(key);return true;});
  for(const name of defaultCategories[type])if(!state.categories[type].some(c=>fold(c)===fold(name)))state.categories[type].push(name);
 }
 return state;
}
export function migrate(state){
 state.connections ??= []; state.incomes ??= []; state.holdings ??= []; state.wallets ??= [];
 state.assets ??= []; state.debts ??= [];
 state.profile ??= {name:''}; state.demo ??= false; state.payday ??= '';
 state.currency ??= 'CHF'; state.spendCurrency ??= state.currency; state.rates ??= {};
 state.categories ??= {};
 for(const type of ['expense','income']) state.categories[type] ??= [...defaultCategories[type]];
 normalizeCategories(state);
 return state;
}
export function portfolio(holdings){
 const cost=holdings.reduce((sum,h)=>sum+h.quantity*h.cost,0);
 const value=holdings.reduce((sum,h)=>sum+h.quantity*h.price,0);
 return {cost,value,gain:value-cost,percent:cost?(value-cost)/cost*100:null};
}
export function incomeTotals(incomes,month){
 const rows=incomes.filter(i=>i.date.startsWith(month));
 return {received:rows.filter(i=>i.status==='received').reduce((s,i)=>s+i.amount,0),expected:rows.filter(i=>i.status==='expected').reduce((s,i)=>s+i.amount,0)};
}
export function addIncome(state,entry){
 state.incomes.unshift(entry);
 if(entry.status==='received')state.balance+=entry.amount;
}
export function receiveIncome(state,id){
 const entry=state.incomes.find(i=>i.id===id);
 if(entry && entry.status==='expected'){entry.status='received';state.balance+=entry.amount;}
}
export function removeIncome(state,id){
 const entry=state.incomes.find(i=>i.id===id);
 if(entry?.status==='received')state.balance-=entry.amount;
 state.incomes=state.incomes.filter(i=>i.id!==id);
}
export function addCategory(state,type,name){
 const clean=name.trim();
 if(!['expense','income'].includes(type)||!clean||clean.length>60)throw new Error('Indica uma categoria entre 1 e 60 caracteres.');
 if(state.categories[type].some(c=>c.toLocaleLowerCase('pt')===clean.toLocaleLowerCase('pt')))throw new Error('Essa categoria já existe.');
 state.categories[type].push(clean);
}
