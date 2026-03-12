import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ImportExportPage } from './ImportExportPage'
import { buildExportPayload } from '../lib/export'
import { buildQrPayload } from '../lib/qr'
import { createPatientRecord } from '../lib/storage'
import { defaultPatientInput } from '../types/patient'

vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => <div>QR</div>,
}))

vi.mock('@yudiel/react-qr-scanner', () => ({
  Scanner: () => <div>Scanner</div>,
}))

const importRecords = vi.fn(async () => undefined)
const clearAllPatients = vi.fn(async () => undefined)
const pushToast = vi.fn()

const buildPatient = (name = 'Tara Nox') => {
  const input = defaultPatientInput()
  input.identity.name = name
  input.identity.hairColor = 'Black'
  input.identity.eyeColor = 'Amber'
  input.identity.skinPigmentation = 'Olive'
  return createPatientRecord(input)
}

const existingPatient = buildPatient()

vi.mock('../hooks/usePatientStore', () => ({
  usePatientStore: () => ({
    patients: [existingPatient],
    importRecords,
    clearAllPatients,
  }),
}))

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({
    pushToast,
    dismissToast: vi.fn(),
    toasts: [],
  }),
}))

vi.mock('../hooks/useAgentProfile', () => ({
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

describe('ImportExportPage', () => {
  beforeEach(() => {
    importRecords.mockClear()
    clearAllPatients.mockClear()
    pushToast.mockClear()
  })

  it('imports a non-conflicting patient from a pasted QR payload', async () => {
    const user = userEvent.setup()
    const patient = buildPatient('Unique Payload')

    render(
      <MemoryRouter>
        <ImportExportPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/Manual QR payload/i), {
      target: { value: buildQrPayload(patient) },
    })
    await user.click(screen.getByRole('button', { name: /import qr payload/i }))

    expect(importRecords).toHaveBeenCalledTimes(1)
    expect(pushToast).toHaveBeenCalled()
  })

  it('opens the import wizard for an existing JSON patient and allows updating', async () => {
    const user = userEvent.setup()
    const payload = buildExportPayload([existingPatient])

    render(
      <MemoryRouter>
        <ImportExportPage />
      </MemoryRouter>,
    )

    const file = new File([JSON.stringify(payload)], 'patients.json', { type: 'application/json' })
    await user.upload(screen.getAllByLabelText(/import patient json/i).at(-1) as HTMLInputElement, file)

    expect(screen.getByText(/existing patient detected/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /update existing patient/i }))

    expect(importRecords).toHaveBeenCalledTimes(1)
    const updatedRecords = (((importRecords as unknown as { mock: { calls: unknown[][] } }).mock.calls.at(-1) ?? [])[0] ??
      []) as ReturnType<
      typeof buildExportPayload
    >['records']
    expect(updatedRecords[0]?.id).toBe(existingPatient.id)
  })

  it('allows importing a duplicate patient under a new name', async () => {
    const user = userEvent.setup()
    const payload = buildExportPayload([existingPatient])

    render(
      <MemoryRouter>
        <ImportExportPage />
      </MemoryRouter>,
    )

    const file = new File([JSON.stringify(payload)], 'patients.json', { type: 'application/json' })
    await user.upload(screen.getAllByLabelText(/import patient json/i).at(-1) as HTMLInputElement, file)

    await user.clear(screen.getByLabelText(/import under a new name/i))
    await user.type(screen.getByLabelText(/import under a new name/i), 'Tara Nox Copy')
    await user.click(screen.getByRole('button', { name: /import as new patient/i }))

    expect(importRecords).toHaveBeenCalledTimes(1)
    const importedRecords = (((importRecords as unknown as { mock: { calls: unknown[][] } }).mock.calls.at(-1) ?? [])[0] ??
      []) as ReturnType<
      typeof buildExportPayload
    >['records']
    const importedRecord = importedRecords[0]
    expect(importedRecord?.identity.name).toBe('Tara Nox Copy')
    expect(importedRecord?.id).not.toBe(existingPatient.id)
  })
})
