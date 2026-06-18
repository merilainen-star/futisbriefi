import { useEffect, useState } from 'react';
import {
  OUTCOME_CODE,
  PICK_OUTCOME_FI,
  RECOMMENDATION_FI,
  type BriefingCard,
  type BriefingDoc,
  type CardTeamLineup,
  type Recommendation,
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
              <span>{scoreline(r.homeTeam, r.awayTeam, r.result.homeGoals, r.result.awayGoals)}</span>
              {r.pick && (
                <span className="muted">
                  veikkaus {r.pick.homeGoals}–{r.pick.awayGoals}
                </span>
              )}
              <span className={`tag outcome-${r.outcome}`}>{PICK_OUTCOME_FI[r.outcome]}</span>
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

function RecBadge({ rec }: { rec?: Recommendation }) {
  if (!rec) return <span className="muted">–</span>;
  return <span className={`badge rec-${rec.toLowerCase()}`}>{RECOMMENDATION_FI[rec]}</span>;
}

function DecisionTable({ cards }: { cards: BriefingCard[] }) {
  return (
    <section className="table-wrap">
      <h2>Päätöstaulukko</h2>
      <table className="decision">
        <thead>
          <tr>
            <th>Ottelu</th>
            <th>Klo</th>
            <th>1 / X / 2</th>
            <th>Veikkaus</th>
            <th>Suositus</th>
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
                {c.odds
                  ? `${pct(c.odds.impliedHome)} / ${pct(c.odds.impliedDraw)} / ${pct(c.odds.impliedAway)}`
                  : '–'}
              </td>
              <td className="nowrap">{c.pick ? `${c.pick.homeGoals}–${c.pick.awayGoals}` : '–'}</td>
              <td>
                <RecBadge rec={c.recommendation} />
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
        <RecBadge rec={card.recommendation} />
      </div>
      <p className="muted small">
        {card.group ? `${card.group} · ` : ''}
        {formatKickoff(card.koUtc)}
        {card.venue ? ` · ${card.venue}` : ''}
      </p>

      {card.odds && (
        <>
          <ProbBar card={card} />
          <p className="small muted">
            Kertoimet {card.odds.home} / {card.odds.draw} / {card.odds.away} ({card.odds.bookmaker})
            · marginaali {pct(card.odds.overround)}
          </p>
        </>
      )}

      {card.pick && (
        <p className="pick">
          Veikkaukseni: <strong>{card.pick.homeGoals}–{card.pick.awayGoals}</strong>
          {card.favorite && (
            <span className="muted">
              {' '}
              · markkinan suosikki {OUTCOME_CODE[card.favorite.outcome]} ({pct(card.favorite.prob)})
            </span>
          )}
        </p>
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
