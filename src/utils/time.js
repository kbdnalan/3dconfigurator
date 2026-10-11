export function formatTime(hours) {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getDayPhase(hours) {
  if (hours < 10) return 'Утро';
  if (hours < 17) return 'День';
  if (hours < 20) return 'Закат';
  return 'Вечер';
}
