export interface LeaderboardEntry {
  name: string;
  score: number;
  nights_won: number;
  achieved_at: string;
  seed: number;
}

export interface LeaderboardPayload {
  entries: LeaderboardEntry[];
}

export const LEADERBOARD_MAX_ENTRIES = 10;

// Allows 3-12 ASCII [A-Za-z0-9_] plus Vietnamese accented letters.
const NAME_REGEX = /^[A-Za-z0-9_\u00C0-\u024F\u1E00-\u1EFF]{3,12}$/;

/** Validates player name (3-12 chars: A-Z, a-z, 0-9, _, or Vietnamese letters). */
export function isValidLeaderboardName(name: string): boolean {
  return typeof name === "string" && NAME_REGEX.test(name.trim());
}

/** Formats a Date as ISO 8601 with explicit local timezone offset (e.g. +07:00). */
export function formatIsoWithTimezone(date = new Date()): string {
  const pad = (n: number): string => String(Math.floor(Math.abs(n))).padStart(2, "0");
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const hh = pad(offsetMin / 60);
  const mm = pad(offsetMin % 60);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${hh}:${mm}`;
}

/** Sorts leaderboard entries by score desc, then achieved_at asc, and caps to top 10. */
export function sortAndTrimLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries]
    .filter(
      (e) =>
        isValidLeaderboardName(e.name) &&
        typeof e.score === "number" &&
        Number.isFinite(e.score) &&
        typeof e.nights_won === "number" &&
        Number.isInteger(e.nights_won) &&
        e.nights_won >= 0 &&
        e.nights_won <= 3 &&
        typeof e.achieved_at === "string" &&
        typeof e.seed === "number" &&
        Number.isFinite(e.seed)
    )
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ta = Date.parse(a.achieved_at);
      const tb = Date.parse(b.achieved_at);
      if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) {
        return ta - tb;
      }
      return a.achieved_at.localeCompare(b.achieved_at);
    })
    .slice(0, LEADERBOARD_MAX_ENTRIES);
}

/** Validates and inserts a new entry into the leaderboard, returning sorted top 10. */
export function addLeaderboardEntry(
  existing: LeaderboardEntry[],
  candidate: Omit<LeaderboardEntry, "achieved_at"> & { achieved_at?: string }
): LeaderboardEntry[] {
  const trimmedName = candidate.name.trim();
  if (!isValidLeaderboardName(trimmedName)) {
    throw new Error("Tên phải từ 3–12 ký tự (chữ cái, số, dấu gạch dưới _).");
  }
  const entry: LeaderboardEntry = {
    name: trimmedName,
    score: Math.max(0, Math.round(candidate.score)),
    nights_won: Math.max(0, Math.min(3, Math.floor(candidate.nights_won))),
    achieved_at: candidate.achieved_at ?? formatIsoWithTimezone(),
    seed: Math.trunc(candidate.seed),
  };
  return sortAndTrimLeaderboard([...existing, entry]);
}
