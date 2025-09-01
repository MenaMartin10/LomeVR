// utils simples y reutilizables 
export function toLocalISO(date = new Date()) {
  const z = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}

export function addDaysISO(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toLocalISO(d);
}