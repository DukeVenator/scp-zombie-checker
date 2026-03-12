import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SymptomUpdateWizard } from './SymptomUpdateWizard'
import { createPatientRecord } from '../../lib/storage'
import { defaultPatientInput, type PatientInput } from '../../types/patient'

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

describe('SymptomUpdateWizard', () => {
  it('steps through update wizard and saves the revision', async () => {
    const user = userEvent.setup()
    const source = defaultPatientInput()
    source.identity.name = 'Jonah Vale'
    source.identity.hairColor = 'Brown'
    source.identity.eyeColor = 'Hazel'
    source.identity.skinPigmentation = 'Medium'
    const patient = createPatientRecord(source)
    const onSave = vi.fn<(input: PatientInput, existingId: string) => Promise<void>>(async () => undefined)

    render(<SymptomUpdateWizard onSave={onSave} patient={patient} />)

    expect(screen.getByText(/question 1/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Jonah Vale' })).toBeInTheDocument()

    // Step 1: Pupils
    await clickOption(user, /^Clouded$/)

    // Step 2: Temperature — pick Normal range (no warning)
    await clickOption(user, /Normal/)

    // Step 3: Heartbeat detected
    await clickOption(user, /^YES$/)

    // Step 4: Heartbeat BPM
    await clickContinue(user)

    // Step 5: EMF — Extreme triggers warning
    await clickOption(user, /Extreme/)
    await ackWarning(user)

    // Step 6: Symptoms — toggle decay, acknowledge warning
    await user.click(screen.getByLabelText(/decay/i))
    await ackWarning(user)
    await clickContinue(user)

    // Step 7: Notes (skip)
    await clickSkip(user)

    // Step 8: Review & Save
    await user.click(screen.getByRole('button', { name: /save symptom update/i }))

    expect(onSave).toHaveBeenCalledTimes(1)
    const saved = onSave.mock.calls[0]?.[0] as PatientInput
    expect(saved.checklist.emfLevel).toBe('Extreme')
    expect(saved.checklist.symptoms.decay).toBe(true)
    expect(saved.checklist.pupilState).toBe('Clouded')
  })

  it('skips BPM when heartbeat is NO and shows potential zombie', async () => {
    const user = userEvent.setup()
    const source = defaultPatientInput()
    source.identity.name = 'Dead Test'
    const patient = createPatientRecord(source)
    const onSave = vi.fn<(input: PatientInput, existingId: string) => Promise<void>>(async () => undefined)

    render(<SymptomUpdateWizard onSave={onSave} patient={patient} />)

    // Step 1: Pupils
    await clickOption(user, /^Normal$/)

    // Step 2: Temperature — pick Normal range
    await clickOption(user, /Normal/)

    // Step 3: Heartbeat — NO
    await clickOption(user, /^NO$/)

    // Urgent warning
    expect(screen.getByText(/NO PULSE DETECTED/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /acknowledged/i }))

    // Should skip BPM and land on EMF
    expect(screen.getByRole('heading', { name: /emf reading/i })).toBeInTheDocument()
  })

  it('shows temperature warning for abnormal range', async () => {
    const user = userEvent.setup()
    const source = defaultPatientInput()
    source.identity.name = 'Temp Test'
    const patient = createPatientRecord(source)

    render(<SymptomUpdateWizard onSave={vi.fn()} patient={patient} />)

    // Step 1: Pupils
    await clickOption(user, /^Normal$/)

    // Step 2: Temperature — pick Hypothermic (triggers warning)
    await clickOption(user, /Hypothermic/)

    expect(screen.getByText(/HYPOTHERMIC/i)).toBeInTheDocument()
    await ackWarning(user)

    // Should advance to heartbeat step
    expect(screen.getByRole('heading', { name: /heartbeat detected/i })).toBeInTheDocument()
  })

  it('sticky header shows classification, infection %, and toggles dropdown', async () => {
    const user = userEvent.setup()
    const source = defaultPatientInput()
    source.identity.name = 'Header Test'
    const patient = createPatientRecord(source)

    render(<SymptomUpdateWizard onSave={vi.fn()} patient={patient} />)

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
})
