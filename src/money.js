// Moedas e conversao. Nenhuma taxa de cambio e inventada pelo app:
// ou vem do utilizador, ou e uma paridade fixa por lei (EUR/CVE).
export const currencies = [
 {code:'CHF', name:'Franco suíço', locale:'de-CH'},
 {code:'EUR', name:'Euro', locale:'pt-PT'},
 {code:'CVE', name:'Escudo cabo-verdiano', locale:'pt-CV'},
 {code:'USD', name:'Dólar americano', locale:'en-US'},
 {code:'GBP', name:'Libra esterlina', locale:'en-GB'},
 {code:'BRL', name:'Real brasileiro', locale:'pt-BR'},
 {code:'AOA', name:'Kwanza angolano', locale:'pt-AO'},
];
export const DEFAULT_CURRENCY = 'CHF';
export const isCurrency = code => currencies.some(c => c.code === code);

// Paridade fixa do escudo cabo-verdiano ao euro (acordo de 1998): 1 EUR = 110,265 CVE.
const FIXED = {'EUR>CVE': 110.265};

export function formatMoney(amount, code = DEFAULT_CURRENCY) {
 const c = currencies.find(c => c.code === code) || currencies[0];
 return new Intl.NumberFormat(c.locale, {style:'currency', currency:c.code}).format(Number(amount) || 0);
}

// Convencao de taxa em todo o app: 1 unidade da moeda base = `rate` unidades da outra moeda.
export function rateKey(base, other) { return `${base}>${other}`; }

export function knownRate(state, base, other) {
 if (base === other) return 1;
 const saved = state.rates?.[rateKey(base, other)];
 if (saved) return saved;
 const inverse = state.rates?.[rateKey(other, base)];
 if (inverse) return 1 / inverse;
 if (FIXED[rateKey(base, other)]) return FIXED[rateKey(base, other)];
 if (FIXED[rateKey(other, base)]) return 1 / FIXED[rateKey(other, base)];
 return null;
}
export const isFixedPair = (a, b) => Boolean(FIXED[rateKey(a, b)] || FIXED[rateKey(b, a)]);

export function rememberRate(state, base, other, rate) {
 if (base === other || !(rate > 0)) return;
 state.rates ??= {};
 state.rates[rateKey(base, other)] = rate;
}

// Valor introduzido noutra moeda -> valor na moeda base, guardando o original.
export function toBase(amount, currency, base, rate) {
 if (currency === base) return {amount: round(amount)};
 if (!(rate > 0)) throw new Error(`Indica a taxa: 1 ${base} = ? ${currency}.`);
 return {amount: round(amount / rate), original: {amount: round(amount), currency, rate}};
}

// Mudar a moeda base converte todos os valores guardados pela taxa indicada
// (1 moeda antiga = rate moeda nova). Registo guardado para auditoria.
export function convertState(state, newBase, rate) {
 if (!isCurrency(newBase)) throw new Error('Moeda não suportada.');
 const oldBase = state.currency;
 if (newBase === oldBase) return state;
 if (!(rate > 0)) throw new Error(`Indica a taxa: 1 ${oldBase} = ? ${newBase}.`);
 const conv = v => round((Number(v) || 0) * rate);
 state.balance = conv(state.balance);
 for (const key of ['target', 'saved', 'reserved']) state.goal[key] = conv(state.goal[key]);
 for (const list of ['expenses', 'bills', 'incomes']) for (const item of state[list] || []) item.amount = conv(item.amount);
 for (const h of state.holdings || []) { h.cost = conv(h.cost); h.price = conv(h.price); }
 if (state.contract) state.contract.rate = conv(state.contract.rate);
 rememberRate(state, oldBase, newBase, rate);
 state.currencyLog ??= [];
 state.currencyLog.push({from: oldBase, to: newBase, rate, at: new Date().toISOString()});
 state.currency = newBase;
 return state;
}

export const round = n => Math.round((Number(n) || 0) * 100) / 100;
