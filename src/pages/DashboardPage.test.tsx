import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'
import { createPatientRecord } from '../lib/storage'
import { defaultPatientInput } from '../types/patient'

const importRecords = vi.fn(async () => undefined)
const pushToast = vi.fn()

vi.mock('../hooks/usePatientStore', () => ({
  usePatientStore: () => {
    const input = defaultPatientInput()
    input.identity.name = 'Lena Cross'
    input.identity.hairColor = 'Red'
    input.identity.eyeColor = 'Blue'
    input.identity.skinPigmentation = 'Fair'
    const patient = createPatientRecord(input)

    return {
      patients: [patient],
      recentPatients: [patient],
      loading: false,
      importRecords,
    }
  },
}))

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({
    pushToast,
    dismissToast: vi.fn(),
    toasts: [],
  }),
}))

describe('DashboardPage', () => {
  beforeEach(() => {
    pushToast.mockClear()
  })

  it('renders patient cards with threat metrics', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    expect(screen.getAllByText(/Lena Cross/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Threat/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Risk/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Infected/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Needs SCP action/i)).toBeInTheDocument()
  })

  it('filters patient records from the registry', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    expect(screen.getAllByText(/Lena Cross/i).length).toBeGreaterThan(0)
    await user.type(screen.getAllByPlaceholderText(/search by name/i).at(-1) as HTMLInputElement, 'missing')
    expect(screen.getByText(/No matching patient records yet/i)).toBeInTheDocument()
  })
})
