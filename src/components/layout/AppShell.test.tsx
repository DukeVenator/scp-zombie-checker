import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false],
    updateServiceWorker: vi.fn(),
  }),
}))

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    pushToast: vi.fn(),
    dismissToast: vi.fn(),
    toasts: [],
  }),
}))

vi.mock('../../hooks/useAgentProfile', () => ({
  useAgentProfile: () => ({
    profile: {
      agentName: 'Dana Voss',
      callsign: 'MTF-11',
      taskForceUnit: 'MTF Nu-7 (Hammer Down)',
      clearanceLevel: '4',
    },
    openSetup: vi.fn(),
    closeSetup: vi.fn(),
    completeSetup: vi.fn(),
    isReady: true,
    showSetup: false,
  }),
}))

describe('AppShell', () => {
  it('renders primary navigation and offline status', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    })

    render(
      <MemoryRouter>
        <Routes>
          <Route element={<AppShell />} path="/">
            <Route element={<div>Dashboard content</div>} index />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText(/SCP Zombie Checker/i)).toBeInTheDocument()
    expect(screen.getByText(/Offline ready/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument()
  })
})
