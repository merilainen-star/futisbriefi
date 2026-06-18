import { formatFixture, formatHelsinkiKickoff, impliedProbabilities } from '@fm2026/core';
import { loadConfig } from '../config.js';
import { createOddsProvider } from '../odds/index.js';

/** Phase 1 smoke CLI: fetch 1X2 odds and print normalized implied probabilities. */
async function main(): Promise<void> {
  const config = loadConfig();
  const provider = createOddsProvider(config);
  console.log(`Odds source: ${provider.name}\n`);

  const markets = await provider.fetchOdds();
  if (markets.length === 0) {
    console.log('(no odds returned)');
    return;
  }

  for (const m of markets) {
    const p = impliedProbabilities({ home: m.home, draw: m.draw, away: m.away });
    const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
    console.log(`${formatFixture(m.homeTeam, m.awayTeam)}`);
    console.log(`  KO:    ${formatHelsinkiKickoff(m.commenceUtc)}  (${m.bookmaker})`);
    console.log(`  1X2:   ${m.home}  /  ${m.draw}  /  ${m.away}`);
    console.log(
      `  Norm.: ${pct(p.home)}  /  ${pct(p.draw)}  /  ${pct(p.away)}` +
        `   (margin ${pct(p.overround)})`,
    );
    console.log('');
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
