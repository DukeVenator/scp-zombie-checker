import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AgentOnboarding } from './AgentOnboarding'

const completeSetup = vi.fn()
const pushToast = vi.fn()

vi.mock('../../hooks/useAgentProfile', () => ({
  useAgentProfile: () => ({
    profile: null,
    isReady: true,
    showSetup: true, // first test needs form; badge test uses /badge so component returns null
    completeSetup,
    openSetup: vi.fn(),
    closeSetup: vi.fn(),
  }),
}))

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    pushToast,
    dismissToast: vi.fn(),
    toasts: [],
  }),
}))

describe('AgentOnboarding', () => {
  it(
    'completes the first-run agent setup wizard',
    async () => {
      window.sessionStorage.setItem('scp-zombie-checker:startup-done', '1')
      const user = userEvent.setup()
      render(
      <MemoryRouter initialEntries={['/']}>
        <AgentOnboarding />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/configure agent profile/i, {}, { timeout: 2500 })).toBeInTheDocument()
    await screen.findByLabelText(/Agent name/i, {}, { timeout: 8000 })

    await user.type(screen.getByLabelText(/Agent name/i), 'Dana Voss')
    await user.type(screen.getByLabelText(/Callsign/i), 'MTF-11')
    await user.selectOptions(screen.getByLabelText(/Task force unit/i), 'MTF Nu-7 (Hammer Down)')
    await user.selectOptions(screen.getByLabelText(/Clearance level/i), '4')
    await user.click(screen.getByRole('button', { name: /activate agent profile/i }))

    await waitFor(() => expect(completeSetup).toHaveBeenCalledTimes(1), { timeout: 4000 })
    expect(pushToast).toHaveBeenCalled()
    },
    12000,
  )

  it('renders nothing on badge page so agent wizard does not block public badge view', () => {
    render(
      <MemoryRouter initialEntries={['/badge']}>
        <Routes>
          <Route path="/badge" element={<AgentOnboarding />} />
        </Routes>
      </MemoryRouter>,
    )
    // On /badge, AgentOnboarding returns null so the wizard heading must not appear
    expect(screen.queryByRole('heading', { name: /configure agent profile/i })).not.toBeInTheDocument()
  })
})
