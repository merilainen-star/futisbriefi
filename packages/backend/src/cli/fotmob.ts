import { formatFixture, formatHelsinkiKickoff } from '@fm2026/core';
import { loadConfig } from '../config.js';
import { createFotMobClient, createOfflineFotMobClient } from '../fotmob/index.js';
import type { FotmobTeamLineup } from '../fotmob/types.js';

/**
 * Phase 1 smoke CLI: print one match's lineups + injuries from FotMob.
 *   npm -w @fm2026/backend run fotmob -- <matchId>
 * With no matchId, uses the offline sample so it always prints something.
 */
async function main(): Promise<void> {
  const matchId = process.argv[2];
  const config = loadConfig();
  const client = matchId ? createFotMobClient(config) : createOfflineFotMobClient();

  console.log(`FotMob client: ${client.name}${matchId ? '' : ' (offline sample)'}\n`);

  const d = await client.getMatchDetails(matchId ?? '0');

  console.log(formatFixture(d.homeTeamName, d.awayTeamName));
  console.log(`  KO:      ${d.koUtc ? formatHelsinkiKickoff(d.koUtc) : 'n/a'}`);
  console.log(
    `  Lineup:  ${d.lineupType ?? 'n/a'} (${d.confirmedXI ? 'confirmed/standard' : 'PREDICTED — verify ~1h before KO'})`,
  );

  printTeam(d.homeTeamName, d.home);
  printTeam(d.awayTeamName, d.away);
}

function printTeam(label: string, t: FotmobTeamLineup): void {
  console.log(`\n${label} — ${t.formation ?? '?'}${t.coach ? `  (coach: ${t.coach})` : ''}`);
  console.log('  XI:');
  for (const p of t.starters) {
    console.log(`    ${(p.shirtNumber ?? '–').toString().padStart(2)}  ${p.name}`);
  }
  if (t.unavailable.length) {
    console.log('  Unavailable:');
    for (const u of t.unavailable) {
      const reason = [u.type, u.expectedReturn && `→ ${u.expectedReturn}`]
        .filter(Boolean)
        .join(' ');
      console.log(`    ${u.name}${reason ? `  (${reason})` : ''}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
