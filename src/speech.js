// Interpreta uma frase dita ou escrita: valor, moeda, loja e categoria.
// Exemplos: "estou no shopping, fiz uma compra na loja Zara e o valor deu 45 francos"
//           "gastei 12,50 euros no restaurante" · "300 escudos na padaria"

const CURRENCY_WORDS = [
 [/\b(francos?|chf|fr\.?)\b/i, 'CHF'],
 [/\b(euros?|eur)\b|€/i, 'EUR'],
 [/\b(escudos?|cve)\b/i, 'CVE'],
 [/\b(d[oó]lares|d[oó]lar|usd)\b|\$/i, 'USD'],
 [/\b(libras?|gbp)\b|£/i, 'GBP'],
 [/\b(reais|real|brl)\b/i, 'BRL'],
 [/\b(kwanzas?|aoa)\b/i, 'AOA'],
];

const CATEGORY_WORDS = [
 ['Alimentação', ['lidl','aldi','migros','coop','denner','spar','volg','manor food','continente','pingo doce','intermarch','minipreço','mercadona','supermercado','mercearia','padaria','talho','peixaria','frutaria','pão','comida','compras da casa']],
 ['Transporte', ['sbb','cff','comboio','trem','bilhete','passe','autocarro','metro','elétrico','uber','bolt','táxi','taxi','gasolina','gasóleo','combustível','bomba','estacionamento','parque','portagem','avião','voo','tacv','bestfly']],
 ['Restaurantes', ['restaurante','café','cafe','pastelaria','snack','mcdonald','burger','pizza','kebab','sushi','bar ','almoço','jantar','lanche','pequeno-almoço']],
 ['Saúde', ['farmácia','farmacia','apotheke','médico','medico','consulta','hospital','clínica','dentista','medicamento','óculos']],
 ['Casa', ['ikea','obi','jumbo','hornbach','renda','eletricidade','luz','água','internet','swisscom','sunrise','salt ','limpeza','detergente','móveis','ferramenta']],
 ['Compras', ['zara','h&m','primark','decathlon','mango','pull','bershka','shopping','centro comercial','roupa','sapatos','loja','media markt','fnac','worten','galaxus','amazon']],
];

const GENERIC_PLACES = /^(o |a |um |uma )?(shopping|centro comercial|cidade|rua|baixa|mercado|supermercado|loja)$/i;
const STOP = /\s+(e|de|por|com|que|para|onde|o valor|deu|custou|foram|foi|paguei|gastei)\b|[,.;!?]|\d/i;

function cleanMerchant(raw) {
 if (!raw) return '';
 let m = raw.split(STOP)[0].trim().replace(/^(o|a|os|as|do|da)\s+/i, '');
 if (!m || GENERIC_PLACES.test(m)) return '';
 return m.split(' ').slice(0, 4).map(w => /^[a-zà-ú]/.test(w) && w.length > 2 ? w[0].toLocaleUpperCase('pt-PT') + w.slice(1) : w).join(' ').slice(0, 60);
}

const UNITS = {zero:0,um:1,uma:1,dois:2,duas:2,'três':3,tres:3,quatro:4,cinco:5,seis:6,sete:7,oito:8,nove:9,dez:10,onze:11,doze:12,treze:13,catorze:14,quatorze:14,quinze:15,dezasseis:16,dezesseis:16,dezassete:17,dezessete:17,dezoito:18,dezanove:19,dezenove:19,vinte:20,trinta:30,quarenta:40,cinquenta:50,sessenta:60,setenta:70,oitenta:80,noventa:90,cem:100,cento:100,duzentos:200,duzentas:200,trezentos:300,quatrocentos:400,quinhentos:500,seiscentos:600,setecentos:700,oitocentos:800,novecentos:900};
const NUMBER_WORD = new RegExp(`\\b(?:${Object.keys(UNITS).join('|')}|mil)(?:\\s+(?:e\\s+)?(?:${Object.keys(UNITS).join('|')}|mil))*\\b`, 'gi');
// "vinte e cinco" -> 25 ; "mil e duzentos" -> 1200 ; "cento e vinte" -> 120
export function wordsToNumbers(text) {
 return String(text).replace(NUMBER_WORD, match => {
  let total = 0, current = 0;
  for (const word of match.toLocaleLowerCase('pt-PT').split(/\s+/)) {
   if (word === 'e') continue;
   if (word === 'mil') { total += (current || 1) * 1000; current = 0; }
   else current += UNITS[word] ?? 0;
  }
  const value = total + current;
  // "um"/"uma" sozinhos sao artigos ("um bilhete"), nao valores.
  return /^(um|uma)$/i.test(match.trim()) ? match : String(value);
 });
}

export function detectCurrency(text) {
 for (const [re, code] of CURRENCY_WORDS) if (re.test(text)) return code;
 return null;
}

export function detectAmount(text) {
 // "67 francos e 40" -> 67.40 ; "12,50" / "12.50" -> 12.5 ; "1'200" / "1 200" -> 1200
 const units = /(francos?|euros?|escudos?|d[oó]lares|libras?|reais|kwanzas?)/.source;
 const split = text.match(new RegExp(`(\\d+)\\s*${units}\\s+e\\s+(\\d{1,2})\\b`, 'i'));
 if (split) return Number(`${split[1]}.${split[3].padStart(2, '0')}`);
 const m = text.replace(/(\d)['’\s](?=\d{3}\b)/g, '$1').match(/(\d+(?:[.,]\d{1,2})?)/);
 return m ? Number(m[1].replace(',', '.')) : null;
}

export function matchCategory(text, available = []) {
 const t = ` ${text.toLocaleLowerCase('pt-PT')} `;
 const fallback = available.includes('Outros') || !available.length ? 'Outros' : available[0];
 for (const [category, words] of CATEGORY_WORDS) {
  const word = words.find(w => t.includes(w));
  if (word) return {category: available.length && !available.includes(category) ? fallback : category, word: word.trim()};
 }
 return {category: fallback, word: null};
}
export const detectCategory = (text, available = []) => matchCategory(text, available).category;
const GENERIC_WORDS = new Set(['loja','shopping','centro comercial','supermercado','comida','compras da casa','bilhete','passe','roupa','sapatos']);

export function parseSpoken(text, {categories = []} = {}) {
 const heard = String(text || '').trim();
 if (!heard) return null;
 const phrase = wordsToNumbers(heard);
 const amount = detectAmount(phrase);
 const currency = detectCurrency(phrase);
 // Prioridade: "loja X" > o ultimo "no/na/em X" que nao seja um lugar generico.
 let merchant = cleanMerchant(phrase.match(/\bloja\s+(?:da\s+|do\s+)?(.+)/i)?.[1]);
 if (!merchant) {
  const candidates = [...phrase.matchAll(/\b(?:no|na|nos|nas|em|ao|à)\s+(.+?)(?=\s+(?:no|na|em|e|de|por|com|que|o valor|deu|custou|paguei|gastei)\b|[,.;!?]|\d|$)/gi)].map(m => cleanMerchant(m[1])).filter(Boolean);
  merchant = candidates.at(-1) || '';
 }
 const {category, word} = matchCategory(`${merchant} ${phrase}`, categories);
 if (!merchant && word && !GENERIC_WORDS.has(word)) {
  // Usa a palavra como foi dita/escrita ("Ikea", "SBB"); so capitaliza se vier toda em minusculas.
  const asSaid = phrase.match(new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))?.[0] || word;
  merchant = asSaid === asSaid.toLocaleLowerCase('pt-PT') ? asSaid[0].toLocaleUpperCase('pt-PT') + asSaid.slice(1) : asSaid;
 }
 return {
  amount: amount > 0 ? amount : null,
  currency,
  merchant: merchant || 'Compra',
  category,
  complete: amount > 0 && Boolean(merchant),
  heard,
 };
}
