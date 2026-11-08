import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <section className="page">
      <h1>Lancer Table</h1>
      <p className="lede">Campaign tools for our Lancer table.</p>
      <div className="cards">
        <Link to="/frames" className="card">
          <h2>Frames</h2>
          <p>Every core frame, its role and stat line.</p>
        </Link>
        <Link to="/questionnaire" className="card">
          <h2>Find your frame</h2>
          <p>A short questionnaire that suggests frames for how you like to play.</p>
        </Link>
        <Link to="/table" className="card">
          <h2>Table</h2>
          <p>The hex grid for turn-by-turn play.</p>
        </Link>
      </div>
    </section>
  )
}
