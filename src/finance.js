export const defaultCategories = {expense:['Alimentação','Transporte','Restaurantes','Casa','Saúde','Outros'],income:['Salário','Trabalho independente','Negócio','Dividendos','Juros','Outros']};
export function migrate(state){
 state.connections ??= []; state.incomes ??= []; state.holdings ??= []; state.wallets ??= [];
 state.categories ??= {};
 for(const type of ['expense','income']) state.categories[type] ??= [...defaultCategories[type]];
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
