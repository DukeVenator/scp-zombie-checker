import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PatientDetailPage } from './PatientDetailPage'
import { createPatientRecord } from '../lib/storage'
import { defaultPatientInput } from '../types/patient'

const pushToast = vi.fn()
const removePatient = vi.fn()
const upsertPatient = vi.fn()
const setContainmentStatus = vi.fn()
const setVariant = vi.fn()

function buildPatient(name = 'Print Test Subject') {
  const input = defaultPatientInput()
  input.identity.name = name
  input.identity.age = 32
  input.identity.sex = 'Female'
  return createPatientRecord(input, undefined, 'created')
}

const testPatient = buildPatient()

vi.mock('../hooks/usePatientStore', () => ({
  usePatientStore: () => ({
    patients: [testPatient],
    removePatient,
    upsertPatient,
    setContainmentStatus,
    setVariant,
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

vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => <div>QR</div>,
}))

const renderPatientDetail = (id: string) => {
  render(
    <MemoryRouter initialEntries={[`/patients/${id}`]}>
      <Routes>
        <Route path="/patients/:id" element={<PatientDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PatientDetailPage', () => {
  beforeEach(() => {
    pushToast.mockClear()
    removePatient.mockClear()
  })

  describe('print card (SCP dossier)', () => {
    it('renders print card in DOM with dossier structure', () => {
      renderPatientDetail(testPatient.id)

      const border = screen.getByTestId('scp-print-card-border')

      expect(within(border).getByText('Secure. Contain. Protect.')).toBeInTheDocument()
      expect(within(border).getByText('Item #')).toBeInTheDocument()
      expect(within(border).getByText('Special Containment Procedures:')).toBeInTheDocument()
      expect(within(border).getByText('Description:')).toBeInTheDocument()
      expect(within(border).getByText(/Symptoms of infection with SCP-/)).toBeInTheDocument()
      expect(within(border).getByText('CONFIDENTIAL!')).toBeInTheDocument()
      expect(
        within(border).getByText(/This document may not be shared with or used by personnel below the designated clearance level/),
      ).toBeInTheDocument()
    })

    it('print card shows Item # derived from patient id', () => {
      renderPatientDetail(testPatient.id)

      const expected = `SCP-${testPatient.id.slice(0, 8).toUpperCase()}`
      expect(screen.getByTestId('scp-print-item-number')).toHaveTextContent(expected)
    })

    it('print card shows Object Class (Safe / Euclid / Keter)', () => {
      renderPatientDetail(testPatient.id)

      const objectClassEl = screen.getByTestId('scp-print-object-class')
      expect(objectClassEl.textContent?.trim()).toMatch(/^(Safe|Euclid|Keter)$/)
    })

    it('print card shows Clearance Level', () => {
      renderPatientDetail(testPatient.id)

      expect(screen.getByTestId('scp-print-clearance')).toHaveTextContent('2')
    })

    it('print card shows subject name and classification summary in body', () => {
      renderPatientDetail(testPatient.id)

      const card = screen.getByTestId('scp-print-card')
      expect(within(card).getByText(/Print Test Subject/)).toBeInTheDocument()
      expect(within(card).getByText(testPatient.classification.summary)).toBeInTheDocument()
    })
  })

  describe('Print button', () => {
    it('calls window.print when Print button is clicked', async () => {
      const user = userEvent.setup()
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})

      renderPatientDetail(testPatient.id)

      const printBtn = screen.getByRole('button', { name: /print/i })
      expect(printBtn).toBeInTheDocument()
      await user.click(printBtn)

      expect(printSpy).toHaveBeenCalledTimes(1)
      printSpy.mockRestore()
    })
  })
})
