import { useEffect, useState } from 'react';
import {
  OUTCOME_CODE,
  OUTCOME_FI,
  type BriefingCard,
  type BriefingDoc,
  type CardTeamLineup,
} from './briefing.ts';
import { formatKickoff, pct, scoreline } from './format.ts';

export function App() {
  const [doc, setDoc] = useState<BriefingDoc | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/briefing.json', { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(`briefing.json → ${r.status}`);
        return r.json();
      })
      .then(setDoc)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <main className="wrap"><p className="error">Virhe: {error}</p></main>;
  if (!doc) return <main className="wrap"><p className="muted">Ladataan briefiä…</p></main>;

  return (
    <main className="wrap">
      <header className="head">
        <h1>Futisbriefi</h1>
        <p className="muted">
          MM 2026 · {doc.date} · ikkuna klo 18:00 (Helsinki) · {doc.cards.length} ottelua
        </p>
      </header>

      <DecisionTable cards={doc.cards} />

      {doc.recap.length > 0 && (
        <section className="recap">
          <h2>Edellisen ikkunan tulokset</h2>
          {doc.recap.map((r) => (
            <div key={r.matchId} className="recap-row">
              <span>
                {scoreline(r.homeTeam, r.awayTeam, r.result.homeGoals, r.result.awayGoals)}
              </span>
            </div>
          ))}
        </section>
      )}

      <section className="cards">
        {doc.cards.map((c) => (
          <MatchCard key={c.matchId} card={c} />
        ))}
      </section>

      <footer className="muted foot">
        Luotu {new Date(doc.generatedAtUtc).toLocaleString('fi-FI')} · analyysityökalu, ei
        vedonlyöntiä
      </footer>
    </main>
  );
}

function DecisionTable({ cards }: { cards: BriefingCard[] }) {
  return (
    <section className="table-wrap">
      <h2>Analyysitaulukko</h2>
      <table className="decision">
        <thead>
          <tr>
            <th>Ottelu</th>
            <th>Klo</th>
            <th>Ennuste</th>
            <th>1 / X / 2</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((c) => (
            <tr key={c.matchId}>
              <td>
                <a href={`#${c.matchId}`}>
                  {c.homeTeam}–{c.awayTeam}
                </a>
              </td>
              <td className="nowrap">{formatKickoff(c.koUtc)}</td>
              <td className="nowrap">
                {c.prediction ? (
                  <strong className="pred-score">
                    {c.prediction.homeGoals}–{c.prediction.awayGoals}
                  </strong>
                ) : (
                  '–'
                )}
              </td>
              <td className="nowrap">
                {c.odds
                  ? `${pct(c.odds.impliedHome)} / ${pct(c.odds.impliedDraw)} / ${pct(c.odds.impliedAway)}`
                  : '–'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ProbBar({ card }: { card: BriefingCard }) {
  if (!card.odds) return null;
  const segs = [
    { key: 'home', label: '1', v: card.odds.impliedHome },
    { key: 'draw', label: 'X', v: card.odds.impliedDraw },
    { key: 'away', label: '2', v: card.odds.impliedAway },
  ];
  return (
    <div className="probbar" role="img" aria-label="Normalisoidut todennäköisyydet">
      {segs.map((s) => (
        <div key={s.key} className={`seg seg-${s.key}`} style={{ width: `${s.v * 100}%` }}>
          {s.v > 0.12 ? `${s.label} ${Math.round(s.v * 100)}%` : ''}
        </div>
      ))}
    </div>
  );
}

function MatchCard({ card }: { card: BriefingCard }) {
  return (
    <article id={card.matchId} className="card">
      <div className="card-head">
        <h3>
          {card.homeTeam}–{card.awayTeam}
        </h3>
        {card.marketFavorite && (
          <span className="badge fav">
            Suosikki {OUTCOME_CODE[card.marketFavorite.outcome]} ({pct(card.marketFavorite.prob)})
          </span>
        )}
      </div>
      <p className="muted small">
        {card.group ? `${card.group} · ` : ''}
        {formatKickoff(card.koUtc)}
        {card.venue ? ` · ${card.venue}` : ''}
      </p>

      {card.prediction && (
        <div className="prediction">
          <div className="pred-main">
            <span className="pred-label">Tarkka ennuste</span>
            <span className="pred-big">
              {card.prediction.homeGoals}–{card.prediction.awayGoals}
            </span>
            <span className="muted small">{pct(card.prediction.prob)}</span>
          </div>
          <div className="pred-alts">
            {card.prediction.top.slice(1, 4).map((s) => (
              <span key={`${s.homeGoals}-${s.awayGoals}`} className="pred-alt">
                {s.homeGoals}–{s.awayGoals}
                <span className="muted"> {pct(s.prob)}</span>
              </span>
            ))}
            <span className="muted small">
              odotetut maalit {card.prediction.expectedHome.toFixed(2)}–
              {card.prediction.expectedAway.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {card.odds && (
        <>
          <ProbBar card={card} />
          <p className="small muted">
            Kertoimet {card.odds.home} / {card.odds.draw} / {card.odds.away} ({card.odds.bookmaker})
            · marginaali {pct(card.odds.overround)}
            {card.marketFavorite ? ` · suosikki ${OUTCOME_FI[card.marketFavorite.outcome]}` : ''}
          </p>
        </>
      )}

      {card.lineup && (
        <div className="lineups">
          {!card.lineup.confirmedXI && (
            <p className="warn small">⚠ Kokoonpano on ENNUSTE — varmista n. 1 h ennen ottelua.</p>
          )}
          <div className="lineup-cols">
            <TeamLineup t={card.lineup.home} />
            <TeamLineup t={card.lineup.away} />
          </div>
        </div>
      )}

      {card.notes.length > 0 && (
        <ul className="notes">
          {card.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

function TeamLineup({ t }: { t: CardTeamLineup }) {
  return (
    <div className="team">
      <h4>
        {t.teamName} <span className="muted small">{t.formation ?? ''}</span>
      </h4>
      <ol className="xi">
        {t.starters.map((p) => (
          <li key={p.name}>
            <span className="shirt">{p.shirtNumber ?? '–'}</span> {p.name}
          </li>
        ))}
      </ol>
      {t.unavailable.length > 0 && (
        <details className="unavail">
          <summary>Poissa ({t.unavailable.length})</summary>
          <ul>
            {t.unavailable.map((u) => (
              <li key={u.name}>
                {u.name}
                {u.expectedReturn ? <span className="muted"> · {u.expectedReturn}</span> : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
