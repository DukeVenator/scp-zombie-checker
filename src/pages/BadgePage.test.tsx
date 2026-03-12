import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BadgePage } from './BadgePage'
import { encodeBadgePayload } from '../lib/badge'

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
})

vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => <div data-testid="qr-code">QR</div>,
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../hooks/usePatientStore', () => ({
  usePatientStore: () => ({ patients: [] }),
}))

function renderBadgePage(initialSearch = '') {
  return render(
    <MemoryRouter initialEntries={[`/badge${initialSearch ? `?${initialSearch}` : ''}`]}>
      <Routes>
        <Route path="/badge" element={<BadgePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const basePayload = {
  id: 'unit-test-id',
  name: 'Unit Test Subject',
  status: 'Cleared' as const,
  infectionPct: 6,
  updatedAt: '2026-03-12T12:00:00.000Z',
  summary: 'Low anomaly.',
  containment: 'Normal' as const,
  variant: 'Normal' as const,
  threatLevel: 'Low' as const,
}

describe('BadgePage', () => {
  it('shows error when d param is missing', () => {
    renderBadgePage()
    expect(screen.getByRole('heading', { name: /invalid or expired check/i })).toBeInTheDocument()
    expect(screen.getByText(/link may be corrupted or no longer valid/i)).toBeInTheDocument()
  })

  it('shows error when d param is invalid', () => {
    renderBadgePage('d=not-valid')
    expect(screen.getByRole('heading', { name: /invalid or expired check/i })).toBeInTheDocument()
  })

  it('shows loading then document with severity for valid cleared payload', async () => {
    const d = encodeBadgePayload(basePayload)
    renderBadgePage(`d=${d}`)

    expect(screen.getByText('Loading document…')).toBeInTheDocument()

    await waitFor(
      () => {
        expect(screen.queryByText('Loading document…')).not.toBeInTheDocument()
      },
      { timeout: 1500 },
    )

    await waitFor(() => {
      expect(screen.getByTestId('badge-page')).toHaveAttribute('data-severity', 'cleared')
    })
    expect(screen.getByTestId('badge-page')).toHaveClass(/badge-page--severity-cleared/)

    expect(screen.getByRole('heading', { name: 'Unit Test Subject' })).toBeInTheDocument()
    expect(screen.getByText(/SCP FIELD INTAKE/i)).toBeInTheDocument()
    expect(screen.getByTestId('qr-code')).toBeInTheDocument()
  })

  it('applies warning severity for elevated payload', async () => {
    const payload = { ...basePayload, status: 'Suspected', infectionPct: 50, threatLevel: 'Elevated' }
    const d = encodeBadgePayload(payload)
    renderBadgePage(`d=${d}`)

    await waitFor(
      () => {
        expect(screen.getByTestId('badge-page')).toHaveAttribute('data-severity', 'warning')
      },
      { timeout: 2000 },
    )
    expect(screen.getByTestId('badge-page')).toHaveClass(/badge-page--severity-warning/)
  })

  it('applies critical severity for high-threat payload', async () => {
    const payload = {
      ...basePayload,
      status: 'Critical',
      infectionPct: 75,
      containment: 'Escaped',
      variant: 'Alpha',
      threatLevel: 'Critical',
    }
    const d = encodeBadgePayload(payload)
    renderBadgePage(`d=${d}`)

    await waitFor(
      () => {
        expect(screen.getByTestId('badge-page')).toHaveAttribute('data-severity', 'critical')
      },
      { timeout: 2000 },
    )
    expect(screen.getByTestId('badge-page')).toHaveClass(/badge-page--severity-critical/)
  })

  it('shows unlock overlay then doc with unlocking class', async () => {
    const d = encodeBadgePayload(basePayload)
    renderBadgePage(`d=${d}`)

    await waitFor(
      () => {
        expect(screen.getByTestId('badge-unlock-overlay')).toBeInTheDocument()
      },
      { timeout: 1500 },
    )

    await waitFor(
      () => {
        expect(screen.getByTestId('badge-unlock-overlay')).toHaveClass(/badge-unlock-overlay--cleared/)
      },
      { timeout: 1500 },
    )
    expect(screen.getByTestId('badge-doc')).toHaveClass(/badge-doc--unlocking-cleared/)
  })

  it('renders entry animation classes on stripe, header, body', async () => {
    const d = encodeBadgePayload(basePayload)
    renderBadgePage(`d=${d}`)

    await waitFor(
      () => {
        expect(screen.getByTestId('badge-doc-stripe')).toHaveClass('badge-doc__stripe--entry')
      },
      { timeout: 2000 },
    )
    expect(screen.getByTestId('badge-doc-header')).toHaveClass('badge-doc__header--entry')
    expect(screen.getByTestId('badge-doc-body')).toHaveClass('badge-doc__body--entry')
  })
})
