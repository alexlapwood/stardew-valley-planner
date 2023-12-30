export function getDay(date: number) {
  return date % 28;
}

export function getSeason(date: number) {
  return Math.floor(date / 28) % 4;
}

export function getYear(date: number) {
  return Math.floor(date / (28 * 4));
}
