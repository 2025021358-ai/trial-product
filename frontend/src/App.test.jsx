import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'

beforeEach(() => {
  localStorage.clear()
  global.fetch = vi.fn((url, opts = {}) => {
    const value = String(url)

    if (value.includes('/api/auth/login')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ access_token: 'token-123', username: 'user0001' })
      })
    }

    if (value.includes('/api/tools')) {
      if (!opts.headers?.Authorization) return Promise.resolve({ status: 401, ok: false, json: () => Promise.resolve({}) })
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ id: 'a', name: 'LLM Assistant', category: 'Productivity', best_for: 'Drafting' }])
      })
    }

    if (value.includes('/api/learning-path')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ week: 1, focus: 'AI Foundations', actions: ['Prompt basics'] }])
      })
    }

    if (value.includes('/api/integrate-tool')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ complexity: 'Low', recommended_plan: ['Step 1'] }) })
    }

    if (value.includes('/api/exit-readiness')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ score: 4.6, recommendation: 'Stay', next_steps: ['Do x'] }) })
    }

    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) })
  })
})

describe('App', () => {
  it('shows login first and loads dashboard after successful login', async () => {
    render(<App />)

    expect(screen.getByText('AI Career Compass Login')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(screen.getByText('AI Career Compass')).toBeInTheDocument())
    expect(screen.getByText(/Signed in as/i)).toBeInTheDocument()
    expect(screen.getAllByText('LLM Assistant').length).toBeGreaterThan(0)
  })
})
