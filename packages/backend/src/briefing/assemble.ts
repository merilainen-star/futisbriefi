import {
  impliedProbabilities,
  marketFavorite,
  OUTCOME_CODE,
  OUTCOME_FI,
  type BriefingCard,
  type CardOdds,
  type Match,
} from '@fm2026/core';
import type { MarketOdds } from '../odds/provider.js';
import type { FotmobMatchDetails, FotmobTeamLineup } from '../fotmob/types.js';

const pct = (x: number): string => `${(x * 100).toFixed(1)} %`;

function toCardOdds(market: MarketOdds): CardOdds {
  const p = impliedProbabilities({ home: market.home, draw: market.draw, away: market.away });
  return {
    home: market.home,
    draw: market.draw,
    away: market.away,
    impliedHome: p.home,
    impliedDraw: p.draw,
    impliedAway: p.away,
    overround: p.overround,
    bookmaker: market.bookmaker,
    source: market.source,
  };
}

function teamLineup(t: FotmobTeamLineup) {
  return {
    teamName: t.teamName,
    formation: t.formation,
    coach: t.coach,
    starters: t.starters.map((p) => ({ name: p.name, shirtNumber: p.shirtNumber })),
    unavailable: t.unavailable.map((u) => ({
      name: u.name,
      type: u.type,
      expectedReturn: u.expectedReturn,
    })),
  };
}

/**
 * Build one Finnish briefing card from a match plus whatever data we have:
 * a direct market + team-news analysis (no pick comparison). Pure: no I/O.
 */
export function assembleCard(
  match: Match,
  market: MarketOdds | undefined,
  details: FotmobMatchDetails | undefined,
): BriefingCard {
  const notes: string[] = [];
  const card: BriefingCard = {
    matchId: match.id,
    group: match.group,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    koUtc: match.koUtc,
    venue: match.venue,
    notes,
  };

  if (market) {
    card.odds = toCardOdds(market);
    const fav = marketFavorite({
      home: card.odds.impliedHome,
      draw: card.odds.impliedDraw,
      away: card.odds.impliedAway,
      overround: card.odds.overround,
    });
    card.marketFavorite = fav;
    notes.push(
      `Markkina (${market.bookmaker}): 1 ${market.home} / X ${market.draw} / 2 ${market.away} ` +
        `→ normalisoidut ${pct(card.odds.impliedHome)} / ${pct(card.odds.impliedDraw)} / ` +
        `${pct(card.odds.impliedAway)} (marginaali ${pct(card.odds.overround)}).`,
    );
    notes.push(
      `Markkinan suosikki: ${OUTCOME_CODE[fav.outcome]} (${OUTCOME_FI[fav.outcome]}) ${pct(fav.prob)}.`,
    );
  } else {
    notes.push('Kertoimia ei saatavilla.');
  }

  if (details) {
    card.lineup = {
      confirmedXI: details.confirmedXI,
      lineupType: details.lineupType,
      home: teamLineup(details.home),
      away: teamLineup(details.away),
    };
    if (!details.confirmedXI) {
      notes.push('Kokoonpano on ENNUSTE — varmista vahvistettu XI n. 1 h ennen ottelua.');
    }
    const inj = [...details.home.unavailable, ...details.away.unavailable];
    if (inj.length) {
      notes.push(`Poissa (${inj.length}): ${inj.map((u) => u.name).join(', ')}.`);
    }
  } else if (match.fotmobId) {
    notes.push('FotMob-kokoonpanoa ei saatu haettua.');
  } else {
    notes.push('Kokoonpano-/loukkaantumistietoja ei vielä saatavilla.');
  }

  return card;
}
