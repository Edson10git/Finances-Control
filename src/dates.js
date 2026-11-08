// Datas reais do dispositivo. Nenhuma data fica escrita no código.
export const todayISO = (now = new Date()) => now.toLocaleDateString('sv-SE');

export function longDateLabel(now = new Date()) {
 return new Intl.DateTimeFormat('pt-PT', {weekday:'long', day:'numeric', month:'long'})
  .format(now).toLocaleUpperCase('pt-PT');
}

export const isPast = (iso, today = todayISO()) => Boolean(iso) && iso < today;

const daysInMonth = (year, month) => new Date(year, month, 0).getDate();
const compose = (year, month, day) =>
 `${year}-${String(month).padStart(2,'0')}-${String(Math.min(day, daysInMonth(year, month))).padStart(2,'0')}`;

// Sugestão de próxima data mensal. Nunca é aplicada sozinha: o utilizador confirma.
export function nextMonthly(iso, today = todayISO()) {
 const [year, month, day] = iso.split('-').map(Number);
 if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return iso;
 let y = year, m = month, guard = 0;
 while (compose(y, m, day) < today && guard++ < 120) { m += 1; if (m > 12) { m = 1; y += 1; } }
 return compose(y, m, day);
}
