import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AgentOnboarding } from './AgentOnboarding'

afterEach(cleanup)

const completeSetup = vi.fn()
const pushToast = vi.fn()

vi.mock('../../hooks/useAgentProfile', () => ({
  useAgentProfile: () => ({
    profile: null,
    isReady: true,
    showSetup: true,
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
  it('completes the first-run agent setup wizard', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <AgentOnboarding />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/configure agent profile/i, {}, { timeout: 2500 })).toBeInTheDocument()

    await user.type(screen.getByLabelText(/Agent name/i), 'Dana Voss')
    await user.type(screen.getByLabelText(/Callsign/i), 'MTF-11')
    await user.clear(screen.getByLabelText(/Task force unit/i))
    await user.type(screen.getByLabelText(/Task force unit/i), 'Mobile Task Force Nu-7')
    await user.clear(screen.getByLabelText(/Clearance level/i))
    await user.type(screen.getByLabelText(/Clearance level/i), '4')
    await user.click(screen.getByRole('button', { name: /activate agent profile/i }))

    expect(completeSetup).toHaveBeenCalledTimes(1)
    expect(pushToast).toHaveBeenCalled()
  })

  it('renders nothing on badge page so agent wizard does not block public badge view', () => {
    render(
      <MemoryRouter initialEntries={['/badge']}>
        <Routes>
          <Route path="/badge" element={<AgentOnboarding />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.queryByText(/configure agent profile/i)).not.toBeInTheDocument()
  })
})
