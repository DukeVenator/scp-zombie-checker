import { MemoryRouter } from 'react-router-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NewPatientWizard } from './NewPatientWizard'
import { createPatientRecord } from '../../lib/storage'

const pushToast = vi.fn()

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    pushToast,
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

const clickContinue = async (user: ReturnType<typeof userEvent.setup>) => {
  const btns = screen.getAllByRole('button', { name: /continue/i })
  await user.click(btns[btns.length - 1] as HTMLButtonElement)
}

const clickSkip = async (user: ReturnType<typeof userEvent.setup>) => {
  const btns = screen.getAllByRole('button', { name: /skip/i })
  await user.click(btns[btns.length - 1] as HTMLButtonElement)
}

const clickOption = async (user: ReturnType<typeof userEvent.setup>, name: string | RegExp) => {
  const btns = screen.getAllByRole('button', { name })
  await user.click(btns[btns.length - 1] as HTMLButtonElement)
}

const ackWarning = async (user: ReturnType<typeof userEvent.setup>) => {
  const btn = await screen.findByRole('button', { name: /acknowledged/i })
  await user.click(btn)
}

describe('NewPatientWizard', () => {
  beforeEach(() => {
    pushToast.mockClear()
  })

  it(
    'walks through each step and saves a patient',
    async () => {
      const user = userEvent.setup()
      const onSave = vi.fn(async (input) => createPatientRecord(input))

      const { container } = render(
        <MemoryRouter>
          <NewPatientWizard onSave={onSave} patients={[]} />
        </MemoryRouter>,
      )

      expect(screen.getByText(/question 1/i)).toBeInTheDocument()

      const nameInput = within(container).getByLabelText(/subject name/i)
      await user.type(nameInput, 'Mira Kane')
      await clickContinue(user)

      const ageInput = screen.getByLabelText(/^age$/i)
      await user.clear(ageInput)
      await user.type(ageInput, '32')
      await clickContinue(user)

      await clickOption(user, /^Female$/)

      await clickSkip(user) // hair
      await clickSkip(user) // eye
      await clickSkip(user) // skin
      await clickSkip(user) // photo

      await clickOption(user, /^Clouded$/) // pupils

      // Temperature — pick Normal (no warning)
      await clickOption(user, /Normal/)

      await clickOption(user, /^YES$/) // heartbeat yes

      await clickContinue(user) // BPM

      // EMF — pick High (triggers warning)
      await clickOption(user, /^High/)
      await ackWarning(user)

      // Symptoms — toggling aggression triggers a warning
      await user.click(screen.getByLabelText(/aggression/i))
      await ackWarning(user)
      await clickContinue(user)

      await clickSkip(user) // notes

      await user.click(screen.getByRole('button', { name: /save patient/i }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0]?.[0].identity.name).toBe('Mira Kane')
    },
    12000,
  )

  it('shows urgent warning when heartbeat is NO and skips BPM', async () => {
    const user = userEvent.setup()

    const { container } = render(
      <MemoryRouter>
        <NewPatientWizard onSave={vi.fn()} patients={[]} />
      </MemoryRouter>,
    )

    await user.type(within(container).getByLabelText(/subject name/i), 'Test')
    await clickContinue(user)
    await clickContinue(user) // age
    await clickOption(user, /^Unknown$/) // sex
    await clickSkip(user) // hair
    await clickSkip(user) // eye
    await clickSkip(user) // skin
    await clickSkip(user) // photo
    await clickOption(user, /^Normal$/) // pupils

    // Temperature — pick Normal range
    await clickOption(user, /Normal/)

    await clickOption(user, /^NO$/)

    expect(screen.getByText(/NO PULSE DETECTED/i)).toBeInTheDocument()
    expect(screen.getAllByText(/extreme caution/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/POTENTIAL ZOMBIE/i).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: /acknowledged/i }))

    expect(screen.getByRole('heading', { name: /emf reading/i })).toBeInTheDocument()
  })

  it('sticky header shows status, infection %, and toggles dropdown', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <NewPatientWizard onSave={vi.fn()} patients={[]} />
      </MemoryRouter>,
    )

    const header = screen.getByRole('button', { name: /cleared/i })
    expect(header).toBeInTheDocument()
    expect(header.classList.contains('sticky-header')).toBe(true)
    expect(screen.getAllByText(/infection/i).length).toBeGreaterThan(0)

    expect(screen.queryByText(/live scp threat board/i)).not.toBeInTheDocument()

    await user.click(header)
    expect(screen.getByText(/live scp threat board/i)).toBeInTheDocument()
    expect(screen.getByText(/zombie infection probability/i)).toBeInTheDocument()

    await user.click(header)
    expect(screen.queryByText(/live scp threat board/i)).not.toBeInTheDocument()
  })

  it('shows temperature warning for abnormal range', async () => {
    const user = userEvent.setup()

    const { container } = render(
      <MemoryRouter>
        <NewPatientWizard onSave={vi.fn()} patients={[]} />
      </MemoryRouter>,
    )

    await user.type(within(container).getByLabelText(/subject name/i), 'Temp Test')
    await clickContinue(user)
    await clickContinue(user) // age
    await clickOption(user, /^Unknown$/)
    await clickSkip(user) // hair
    await clickSkip(user) // eye
    await clickSkip(user) // skin
    await clickSkip(user) // photo
    await clickOption(user, /^Normal$/) // pupils

    // Pick High Fever — should trigger warning
    await clickOption(user, /High Fever/)

    expect(screen.getByText(/HIGH FEVER/i)).toBeInTheDocument()
    await ackWarning(user)

    // Should advance to heartbeat step
    expect(screen.getByRole('heading', { name: /heartbeat detected/i })).toBeInTheDocument()
  })

  it('shows EMF warning for Extreme', async () => {
    const user = userEvent.setup()

    const { container } = render(
      <MemoryRouter>
        <NewPatientWizard onSave={vi.fn()} patients={[]} />
      </MemoryRouter>,
    )

    await user.type(within(container).getByLabelText(/subject name/i), 'EMF Test')
    await clickContinue(user)
    await clickContinue(user) // age
    await clickOption(user, /^Unknown$/)
    await clickSkip(user) // hair
    await clickSkip(user) // eye
    await clickSkip(user) // skin
    await clickSkip(user) // photo
    await clickOption(user, /^Normal$/) // pupils
    await clickOption(user, /Normal/) // temp — Normal range
    await clickOption(user, /^YES$/) // heartbeat
    await clickContinue(user) // BPM

    // Pick Extreme EMF
    await clickOption(user, /Extreme/)

    expect(screen.getByText(/CONTAINMENT REQUIRED/i)).toBeInTheDocument()
    await ackWarning(user)

    expect(screen.getByRole('heading', { name: /observed symptoms/i })).toBeInTheDocument()
  })

  it('shows symptom warning when a symptom is toggled on', async () => {
    const user = userEvent.setup()

    const { container } = render(
      <MemoryRouter>
        <NewPatientWizard onSave={vi.fn()} patients={[]} />
      </MemoryRouter>,
    )

    await user.type(within(container).getByLabelText(/subject name/i), 'Warn Test')
    await clickContinue(user)
    await clickContinue(user) // age
    await clickOption(user, /^Unknown$/)
    await clickSkip(user) // hair
    await clickSkip(user) // eye
    await clickSkip(user) // skin
    await clickSkip(user) // photo
    await clickOption(user, /^Normal$/) // pupils
    await clickOption(user, /Normal/) // temp — Normal range
    await clickOption(user, /^YES$/) // heartbeat
    await clickContinue(user) // BPM
    await clickOption(user, /^Low$/) // EMF

    expect(screen.getByRole('heading', { name: /observed symptoms/i })).toBeInTheDocument()

    await user.click(screen.getByLabelText(/aggression/i))

    expect(screen.getByText(/AGGRESSION DETECTED/i)).toBeInTheDocument()

    await ackWarning(user)

    expect(screen.getByLabelText(/aggression/i)).toBeInTheDocument()
  })
})
