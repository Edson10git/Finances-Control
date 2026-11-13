// Interpreta o texto de um contrato de trabalho (Suica em alemao, Portugal e
// Cabo Verde em portugues). Devolve so o que encontrou: nunca inventa um valor.
// O que encontrar e sempre proposto ao utilizador, nunca guardado sozinho.

// "28.50" "28,50" "1'234.50" "1.234,50"
const toNumber = raw => {
 let clean = String(raw).replace(/[’' ]/g, '');
 if (/^\d{1,3}(?:\.\d{3})+$/.test(clean)) clean = clean.replace(/\./g, '');            // 200.000
 else if (/^\d{1,3}(?:,\d{3})+$/.test(clean)) clean = clean.replace(/,/g, '');          // 200,000
 else if (/,\d{1,2}$/.test(clean)) clean = clean.replace(/\./g, '').replace(',', '.');  // 1.200.000,00
 else clean = clean.replace(/,/g, '');                                                  // 1,234.50 e 28.50
 return Number(clean);
};
// Numero com qualquer separador de milhares (suico, portugues, ingles) ou sem nenhum.
const NUM = String.raw`\d{1,3}(?:[’' ]\d{3})+(?:[.,]\d{1,2})?|\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:[.,]\d{1,2})?`;

const near = (text, labels, pattern, limit = 60) => {
 for (const label of labels) {
  const anchor = new RegExp(label, 'i').exec(text);
  if (!anchor) continue;
  const window = text.slice(anchor.index, anchor.index + anchor[0].length + limit);
  const hit = new RegExp(pattern, 'i').exec(window);
  if (hit) return hit[1];
 }
 return null;
};

export function findRate(text) {
 const direct = new RegExp(String.raw`(${NUM})\s*(?:CHF|EUR|€)?\s*(?:\/|por |pro |par )\s*(?:h\b|hora|stunde|heure)`, 'i').exec(text)
  || new RegExp(String.raw`(?:CHF|EUR|€)\s*(${NUM})\s*(?:\/|por |pro )\s*(?:h\b|hora|stunde)`, 'i').exec(text);
 const value = direct ? direct[1] : near(text, ['stundenlohn', 'grundlohn', 'basislohn', 'taxa\\s+hor[áa]ria', 'sal[áa]rio\\s*(?:\\/|por)?\\s*hora', 'valor\\s*(?:\\/|por)?\\s*hora', 'taux\\s+horaire'], String.raw`(${NUM})`);
 const rate = value === null ? null : toNumber(value);
 return Number.isFinite(rate) && rate > 0 && rate < 1000 ? rate : null;
}

export function findHours(text) {
 const value = near(text, ['wochenstunden', 'arbeitszeit', 'stunden\\s*pro\\s*woche', 'horas\\s*(?:por|\\/)\\s*semana', 'horas\\s*semanais', 'carga\\s*hor[áa]ria', 'horas\\s*previstas', 'pensum'], String.raw`(${NUM})`)
  ?? new RegExp(String.raw`(${NUM})\s*(?:stunden|horas|heures|h)\s*(?:pro|por|\/)\s*(?:woche|semana|semaine)`, 'i').exec(text)?.[1];
 const hours = value === undefined || value === null ? null : toNumber(value);
 return Number.isFinite(hours) && hours > 0 && hours <= 300 ? hours : null;
}

export function findEmployer(text) {
 const company = /([A-ZÀ-Ý][\wÀ-ÿ&.\-]*(?:[ ][A-ZÀ-Ýa-zà-ÿ0-9&.\-]+){0,4}[ ](?:AG|GmbH|SA|S\.A\.|Lda|LDA|L[dD]a\.|SARL|Sàrl|Ltd|SRL|S\.?A\.?R\.?L))\b/.exec(text);
 if (company) return company[1].trim().slice(0, 80);
 const labelled = near(text, ['empregador', 'entidade\\s+patronal', 'arbeitgeber(?:in)?', 'employeur', 'ag[êe]ncia', 'empresa'], String.raw`[:\s]\s*([A-ZÀ-Ý][^\n,;]{2,60})`, 80);
 return labelled ? labelled.trim().slice(0, 80) : null;
}

// Aceita 31.12.2026, 31/12/2026 e 2026-12-31. Devolve sempre ISO.
export function findDate(text, labels = ['zahltag', 'auszahlung', 'lohnzahlung', 'data\\s+de\\s+pagamento', 'pagamento\\s+previsto', 'vencimento', 'paiement']) {
 const iso = raw => {
  const dmy = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(raw);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  return ymd ? raw : null;
 };
 const pattern = String.raw`(\d{1,2}[./-]\d{1,2}[./-]\d{4}|\d{4}-\d{2}-\d{2})`;
 const labelled = near(text, labels, pattern, 50);
 const any = new RegExp(pattern).exec(text)?.[1];
 for (const candidate of [labelled, any]) {
  const value = candidate ? iso(candidate) : null;
  if (value && Number(value.slice(5, 7)) >= 1 && Number(value.slice(5, 7)) <= 12) return value;
 }
 return null;
}

export function parseContract(text) {
 const clean = String(text || '').replace(/ /g, ' ');
 const result = {agency: findEmployer(clean), rate: findRate(clean), hours: findHours(clean), payday: findDate(clean)};
 result.found = Object.entries(result).filter(([, v]) => v !== null && v !== undefined).map(([k]) => k);
 return result;
}

// Para uma escritura, um crédito ou uma fatura: o maior valor do documento e uma data.
// E uma proposta para o utilizador confirmar, nao uma leitura de confianca.
export function parseValueDocument(text) {
 const clean = String(text || '').replace(/ /g, ' ');
 const amounts = [...clean.matchAll(new RegExp(String.raw`(?:CHF|EUR|€|\$|ECV|CVE|R\$)\s*(${NUM})|(${NUM})\s*(?:CHF|EUR|€|escudos?|contos?)`, 'gi'))]
  .map(m => toNumber(m[1] ?? m[2]))
  .filter(n => Number.isFinite(n) && n > 0);
 return {amount: amounts.length ? Math.max(...amounts) : null, date: findDate(clean, ['data', 'datum', 'celebrado', 'assinado'])};
}
