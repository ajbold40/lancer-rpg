import { useMemo, useState } from 'react'
import { books, licensePath, manufacturers, type Frame } from '../data/lancer'
import { frames } from '../config/campaign'
import { questions } from '../questionnaire/questions'
import { pickResults, rankFrames, reasons, sumWeights, type Match } from '../questionnaire/scoring'
import { catches } from '../questionnaire/catches'
import FrameArt from '../components/FrameArt'

type Answers = (number | undefined)[]

export default function Questionnaire() {
  const [step, setStep] = useState<number>(-1) // -1 intro, 0..n-1 questions, n results
  const [answers, setAnswers] = useState<Answers>(() => questions.map(() => undefined))

  const done = step >= questions.length

  const choose = (qi: number, oi: number) => {
    const next = [...answers]
    next[qi] = oi
    setAnswers(next)
    setStep(qi + 1)
  }

  const restart = () => {
    setAnswers(questions.map(() => undefined))
    setStep(-1)
  }

  if (step === -1) {
    return (
      <section className="page narrow">
        <h1>Find your frame</h1>
        <p className="lede">
          {questions.length} questions about how you like to play. You'll get three frames that fit,
          one wildcard from a different manufacturer, and what each license costs you.
        </p>
        <p className="lede">
          Every pilot starts in a GMS Everest. These results are the license you'll work toward, not
          what you'll fly on day one.
        </p>
        <button className="primary" onClick={() => setStep(0)}>
          Start
        </button>
      </section>
    )
  }

  if (done) return <Results answers={answers as number[]} onRestart={restart} />

  const q = questions[step]
  return (
    <section className="page narrow">
      <div className="progress" aria-hidden>
        <div style={{ width: `${(step / questions.length) * 100}%` }} />
      </div>
      <p className="eyebrow">
        Question {step + 1} of {questions.length}
      </p>
      <h2 className="prompt">{q.prompt}</h2>
      <div className="options">
        {q.options.map((o, oi) => (
          <button
            key={o.label}
            className={answers[step] === oi ? 'option on' : 'option'}
            onClick={() => choose(step, oi)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {step > 0 && (
        <button className="link" onClick={() => setStep(step - 1)}>
          ← Back
        </button>
      )}
    </section>
  )
}

function Results({ answers, onRestart }: { answers: number[]; onRestart: () => void }) {
  const { top, wildcard } = useMemo(() => {
    const weights = sumWeights(questions.map((q, i) => q.options[answers[i]].weights))
    return pickResults(rankFrames(frames, weights))
  }, [answers])

  const stringsIndex = questions.findIndex((q) => q.id === 'strings')
  const choseUnion =
    stringsIndex >= 0 && (questions[stringsIndex].options[answers[stringsIndex]].weights.GMS ?? 0) > 0
  const unionFrames = frames.filter((f) => f.source === 'GMS')

  return (
    <section className="page">
      <h1>Your frames</h1>
      <div className="results">
        {top.map((m, i) => (
          <ResultCard key={m.frame.id} match={m} rank={i + 1} />
        ))}
      </div>

      {wildcard && (
        <>
          <h2 className="section-title">Wildcard</h2>
          <p className="lede">Your best fit from a manufacturer that isn't in your top three.</p>
          <div className="results">
            <ResultCard match={wildcard} />
          </div>
        </>
      )}

      <h2 className="section-title">What these licenses cost</h2>
      <p className="lede">Every manufacturer wants something back. Know what you're signing up for.</p>
      <div className="catches">
        {[...new Set([...top, ...(wildcard ? [wildcard] : [])].map((m) => m.frame.source))].map((maker) => {
          const c = catches[maker]
          return (
            <div key={maker} className="catch">
              <h4>
                {manufacturers[maker]}: {c.headline}
              </h4>
              <p>{c.body}</p>
              {!c.verified && <p className="gm-note">Draft: GM to check against the books.</p>}
            </div>
          )
        })}
      </div>

      {choseUnion && unionFrames.length > 0 && (
        <div className="union">
          <h2 className="section-title">Staying Union-issue</h2>
          <p>
            You'd rather not owe anyone. That's a real choice: the GMS Everest is a jack of all trades,
            and every pilot already has it. Pilots who stay with GMS put their license ranks into other
            manufacturers' gear instead, or skip licenses in favor of talents and core bonuses.
          </p>
          <p className="muted">
            GMS frames in this campaign: {unionFrames.map((f) => f.name).join(', ')}
          </p>
        </div>
      )}

      <button className="primary" onClick={onRestart}>
        Take it again
      </button>
    </section>
  )
}

function ResultCard({ match, rank }: { match: Match; rank?: number }) {
  const f: Frame = match.frame
  const c = catches[f.source]
  const s = f.stats
  return (
    <article className="result">
      <FrameArt frame={f} />
      <header>
        {rank && <span className="rank">#{rank}</span>}
        <h3>{f.name}</h3>
        <p className="muted">
          {manufacturers[f.source]} · {f.mechtype.join(' / ')} · {books[f.book]}
        </p>
      </header>
      <dl className="stats">
        <div><dt>Size</dt><dd>{s.size}</dd></div>
        <div><dt>HP</dt><dd>{s.hp}</dd></div>
        <div><dt>Armor</dt><dd>{s.armor}</dd></div>
        <div><dt>Evasion</dt><dd>{s.evasion}</dd></div>
        <div><dt>E-Def</dt><dd>{s.edef}</dd></div>
        <div><dt>Speed</dt><dd>{s.speed}</dd></div>
        <div><dt>Heat</dt><dd>{s.heatcap}</dd></div>
        <div><dt>Sensors</dt><dd>{s.sensor_range}</dd></div>
      </dl>
      <h4>Why it fits</h4>
      <ul>
        {reasons(match).map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <h4>Getting it</h4>
      <p>{licensePath(f)}</p>
      <p className="catch-ref">The catch: {c.headline}</p>
    </article>
  )
}
