// ============================================================================
// Czech public holidays (fixed + Easter-based moveable feasts)
// ============================================================================

const CZECH_FIXED_HOLIDAYS = [
  "01-01", // Nový rok
  "05-01", // Svátek práce
  "05-08", // Den vítězství
  "07-05", // Den slovanských věrozvěstů Cyrila a Metoděje
  "07-06", // Den upálení mistra Jana Husa
  "09-28", // Den české státnosti
  "10-28", // Den vzniku samostatného československého státu
  "11-17", // Den boje za svobodu a demokracii
  "12-24", // Štědrý den
  "12-25", // 1. svátek vánoční
  "12-26", // 2. svátek vánoční
];

/**
 * Anonymous Gregorian Computus — returns Easter Sunday for a given year.
 * https://en.wikipedia.org/wiki/Date_of_Easter#Anonymous_Gregorian_algorithm
 */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function getCzechHolidays(year: number): Date[] {
  const fixed = CZECH_FIXED_HOLIDAYS.map(
    (md) => new Date(`${year}-${md}T00:00:00`),
  );

  const easter = easterSunday(year);
  const goodFriday = addDays(easter, -2); // Velký pátek
  const easterMonday = addDays(easter, 1); // Velikonoční pondělí

  return [...fixed, goodFriday, easterMonday].sort(
    (a, b) => a.getTime() - b.getTime(),
  );
}
