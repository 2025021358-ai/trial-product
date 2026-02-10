import { render, screen, waitFor } from '@testing-library/react'
import App from './App'

global.fetch = vi.fn((url, opts) => {
  if (String(url).includes('/api/tools')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 'a', name: 'LLM Assistant', category: 'Productivity', best_for: 'Drafting' }]) })
  }
  if (String(url).includes('/api/learning-path')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve([{ week: 1, focus: 'AI Foundations', actions: ['Prompt basics'] }]) })
  }
  if (String(url).includes('/api/integrate-tool') && opts?.method === 'POST') {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ complexity: 'Low', recommended_plan: ['Step 1'] }) })
  }
  if (String(url).includes('/api/exit-readiness') && opts?.method === 'POST') {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ score: 4.6, recommendation: 'Stay', next_steps: ['Do x'] }) })
  }
  return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
})

describe('App', () => {
  it('renders hero and loads tools', async () => {
    render(<App />)
    expect(screen.getByText('AI Career Compass')).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByText('LLM Assistant').length).toBeGreaterThan(0))
  })
})
