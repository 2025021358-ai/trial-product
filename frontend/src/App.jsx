import { useEffect, useMemo, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'

function ScoreBadge({ score }) {
  const tone = score >= 4.5 ? 'good' : score >= 2.5 ? 'neutral' : 'risk'
  return <span className={`badge ${tone}`}>Readiness score: {score}</span>
}

export default function App() {
  const [tools, setTools] = useState([])
  const [learningPath, setLearningPath] = useState([])
  const [integrationResult, setIntegrationResult] = useState(null)
  const [exitResult, setExitResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [integrationForm, setIntegrationForm] = useState({
    tool_name: 'LLM Assistant',
    use_case: 'Automate engineering design review summaries with citation checks.',
    team_size: 8,
    risk_tolerance: 'medium'
  })

  const [exitForm, setExitForm] = useState({
    burnout_level: 4,
    growth_score: 8,
    mission_alignment: 7
  })

  useEffect(() => {
    const load = async () => {
      try {
        const [toolsRes, learningRes] = await Promise.all([
          fetch(`${API_BASE}/api/tools`),
          fetch(`${API_BASE}/api/learning-path`)
        ])
        if (!toolsRes.ok || !learningRes.ok) throw new Error('Unable to load dashboard data')
        const [toolsData, learningData] = await Promise.all([toolsRes.json(), learningRes.json()])
        setTools(toolsData)
        setLearningPath(learningData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const selectedTool = useMemo(
    () => tools.find((tool) => tool.name === integrationForm.tool_name),
    [integrationForm.tool_name, tools]
  )

  const submitIntegration = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const response = await fetch(`${API_BASE}/api/integrate-tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...integrationForm, team_size: Number(integrationForm.team_size) })
      })
      if (!response.ok) throw new Error('Integration strategy failed. Check inputs and retry.')
      setIntegrationResult(await response.json())
    } catch (err) {
      setError(err.message)
    }
  }

  const submitExitReadiness = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const response = await fetch(`${API_BASE}/api/exit-readiness`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(
          Object.entries(exitForm).map(([key, value]) => [key, Number(value)])
        ))
      })
      if (!response.ok) throw new Error('Could not evaluate readiness right now.')
      setExitResult(await response.json())
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="layout">
      <header className="hero">
        <p className="eyebrow">Senior-grade product strategy</p>
        <h1>AI Career Compass</h1>
        <p>Discover AI tools, integrate them safely, learn fast, and decide when to stay or leave your role.</p>
      </header>

      {error && <section className="error">{error}</section>}

      {loading ? (
        <section className="panel">Loading AI roadmap...</section>
      ) : (
        <>
          <section className="panel grid-3">
            {tools.map((tool) => (
              <article key={tool.id} className="card">
                <div className="tag">{tool.category}</div>
                <h3>{tool.name}</h3>
                <p>{tool.best_for}</p>
              </article>
            ))}
          </section>

          <section className="panel split">
            <div>
              <h2>Integrate AI toolchain</h2>
              <form onSubmit={submitIntegration} className="form">
                <label>
                  Tool
                  <select
                    value={integrationForm.tool_name}
                    onChange={(event) => setIntegrationForm({ ...integrationForm, tool_name: event.target.value })}
                  >
                    {tools.map((tool) => <option key={tool.id} value={tool.name}>{tool.name}</option>)}
                  </select>
                </label>

                <label>
                  Use case
                  <textarea
                    value={integrationForm.use_case}
                    onChange={(event) => setIntegrationForm({ ...integrationForm, use_case: event.target.value })}
                  />
                </label>

                <div className="row">
                  <label>
                    Team size
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={integrationForm.team_size}
                      onChange={(event) => setIntegrationForm({ ...integrationForm, team_size: event.target.value })}
                    />
                  </label>

                  <label>
                    Risk tolerance
                    <select
                      value={integrationForm.risk_tolerance}
                      onChange={(event) => setIntegrationForm({ ...integrationForm, risk_tolerance: event.target.value })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                </div>

                <button type="submit">Generate integration plan</button>
              </form>
            </div>

            <div className="insight">
              <h3>Selected tool fit</h3>
              <p>{selectedTool?.best_for}</p>
              {integrationResult && (
                <>
                  <p><strong>Complexity:</strong> {integrationResult.complexity}</p>
                  <ul>
                    {integrationResult.recommended_plan.map((step) => <li key={step}>{step}</li>)}
                  </ul>
                </>
              )}
            </div>
          </section>

          <section className="panel split">
            <div>
              <h2>4-week AI learning path</h2>
              <ol className="timeline">
                {learningPath.map((stage) => (
                  <li key={stage.week}>
                    <h4>Week {stage.week}: {stage.focus}</h4>
                    <p>{stage.actions.join(' • ')}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h2>When to leave (or stay)</h2>
              <form onSubmit={submitExitReadiness} className="form">
                {Object.entries(exitForm).map(([key, value]) => (
                  <label key={key}>
                    {key.replaceAll('_', ' ')} (1-10)
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={value}
                      onChange={(event) => setExitForm({ ...exitForm, [key]: event.target.value })}
                    />
                    <span>{value}</span>
                  </label>
                ))}
                <button type="submit">Evaluate decision</button>
              </form>

              {exitResult && (
                <div className="insight">
                  <ScoreBadge score={exitResult.score} />
                  <p>{exitResult.recommendation}</p>
                  <ul>
                    {exitResult.next_steps.map((step) => <li key={step}>{step}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  )
}
