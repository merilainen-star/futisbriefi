/** Stable, readable match id: "<utc-date>-<homeslug>-<awayslug>" (home-first). */
export function slugTeam(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '');
}

export function makeMatchId(koUtc: string, homeTeam: string, awayTeam: string): string {
  const date = koUtc.slice(0, 10); // YYYY-MM-DD (UTC) — internal id only
  return `${date}-${slugTeam(homeTeam)}-${slugTeam(awayTeam)}`;
}
