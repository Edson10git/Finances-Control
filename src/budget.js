export function budget(state) {
 const spent = state.expenses.reduce((sum, item) => sum + item.amount, 0);
 const reserved = state.bills.filter(b => !b.paid).reduce((sum, item) => sum + item.amount, 0);
 const available = state.balance - spent - reserved - state.goal.reserved;
 const raw = (new Date(state.payday + 'T00:00:00') - new Date(state.today + 'T00:00:00')) / 86400000;
 // Sem data de pagamento valida nao ha divisao por dias: o aviso no ecra pede a data.
 const days = Number.isFinite(raw) ? Math.max(1, Math.ceil(raw)) : 1;
 const overdue = !state.payday || state.payday <= state.today;
 return {spent, reserved, available, days, daily: Math.max(0, available / days), overdue};
}
export function parseExpense(text) {
 const match = text.match(/(\d+(?:[.,]\d{1,2})?)/);
 if (!match) return null;
 const amount = Number(match[1].replace(',', '.'));
 const merchant = text.match(/(?:no|na|em)\s+(.+?)(?:[.!?]|$)/i)?.[1] || 'Compra';
 return amount > 0 ? {amount, merchant} : null;
}
