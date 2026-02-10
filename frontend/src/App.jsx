import { useEffect, useMemo, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'
const TOKEN_KEY = 'ai_compass_token'
const USER_KEY = 'ai_compass_user'

function ScoreBadge({ score }) {
  const tone = score >= 4.5 ? 'good' : score >= 2.5 ? 'neutral' : 'risk'
  return <span className={`badge ${tone}`}>Readiness score: {score}</span>
}

function LoginPage({ onLogin, error, loading }) {
  const [credentials, setCredentials] = useState({ username: 'user0001', password: 'Password@123' })

  const submit = async (event) => {
    event.preventDefault()
    onLogin(credentials)
  }

  return (
    <main className="auth-layout">
      <section className="auth-card">
        <p className="eyebrow">Secure access</p>
        <h1>AI Career Compass Login</h1>
        <p className="helper">Use seeded demo users (`user0001` → `user1000`) and default password `Password@123`.</p>
        {error && <section className="error">{error}</section>}
        <form onSubmit={submit} className="form">
          <label>
            Username
            <input
              value={credentials.username}
              onChange={(event) => setCredentials({ ...credentials, username: event.target.value })}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={credentials.password}
              onChange={(event) => setCredentials({ ...credentials, password: event.target.value })}
              required
            />
          </label>
          <button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
        </form>
      </section>
    </main>
  )
}

export default function App() {
  const [tools, setTools] = useState([])
  const [learningPath, setLearningPath] = useState([])
  const [integrationResult, setIntegrationResult] = useState(null)
  const [exitResult, setExitResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loggingIn, setLoggingIn] = useState(false)
  const [error, setError] = useState('')

  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) ?? '')
  const [username, setUsername] = useState(localStorage.getItem(USER_KEY) ?? '')

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

  const fetchWithAuth = async (endpoint, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
    const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers })
    if (response.status === 401) {
      setToken('')
      setUsername('')
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      throw new Error('Session expired. Please sign in again.')
    }
    return response
  }

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [toolsRes, learningRes] = await Promise.all([
          fetchWithAuth('/api/tools', { method: 'GET' }),
          fetchWithAuth('/api/learning-path', { method: 'GET' })
        ])
        if (!toolsRes.ok || !learningRes.ok) throw new Error('Unable to load dashboard data')
        const [toolsData, learningData] = await Promise.all([toolsRes.json(), learningRes.json()])
        setTools(toolsData)
        setLearningPath(learningData)
        if (toolsData.length > 0 && !toolsData.find((tool) => tool.name === integrationForm.tool_name)) {
          setIntegrationForm((prev) => ({ ...prev, tool_name: toolsData[0].name }))
        }
      } catch (err) {
        const message = err instanceof TypeError
          ? 'Backend is unreachable. Start FastAPI on port 8000 and refresh.'
          : err.message
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [token])

  const selectedTool = useMemo(
    () => tools.find((tool) => tool.name === integrationForm.tool_name),
    [integrationForm.tool_name, tools]
  )

  const handleLogin = async (credentials) => {
    setError('')
    setLoggingIn(true)
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      })
      if (!response.ok) throw new Error('Login failed. Check username/password.')
      const payload = await response.json()
      setToken(payload.access_token)
      setUsername(payload.username)
      localStorage.setItem(TOKEN_KEY, payload.access_token)
      localStorage.setItem(USER_KEY, payload.username)
    } catch (err) {
      const message = err instanceof TypeError
        ? 'Cannot connect to backend. Start FastAPI on port 8000.'
        : err.message
      setError(message)
    } finally {
      setLoggingIn(false)
    }
  }

  const logout = () => {
    setToken('')
    setUsername('')
    setTools([])
    setLearningPath([])
    setIntegrationResult(null)
    setExitResult(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  const submitIntegration = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const response = await fetchWithAuth('/api/integrate-tool', {
        method: 'POST',
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
      const response = await fetchWithAuth('/api/exit-readiness', {
        method: 'POST',
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

  if (!token) {
    return <LoginPage onLogin={handleLogin} error={error} loading={loggingIn} />
  }

  return (
    <main className="layout">
      <header className="hero">
        <p className="eyebrow">Senior-grade product strategy</p>
        <div className="hero-row">
          <div>
            <h1>AI Career Compass</h1>
            <p>Discover AI tools, integrate them safely, learn fast, and decide when to stay or leave your role.</p>
          </div>
          <div className="account-box">
            <span>Signed in as <strong>{username}</strong></span>
            <button type="button" onClick={logout}>Logout</button>
          </div>
        </div>
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
              <p>{selectedTool?.best_for ?? 'Select a tool to view fit details.'}</p>
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
