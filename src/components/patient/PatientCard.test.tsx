import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { createPatientRecord, TERMINATED_CLASSIFICATION } from '../../lib/storage'
import { defaultPatientInput } from '../../types/patient'
import { PatientCard } from './PatientCard'

describe('PatientCard', () => {
  it('renders patient name and ID', () => {
    const input = defaultPatientInput()
    input.identity.name = 'Test Subject'
    const record = createPatientRecord(input)

    render(
      <MemoryRouter>
        <PatientCard patient={record} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Test Subject')).toBeInTheDocument()
    expect(screen.getByText(/Patient ID/)).toBeInTheDocument()
  })

  it('does not show TERMINATE ON SIGHT for terminated patient even with high infection', () => {
    const input = defaultPatientInput()
    input.identity.name = 'Terminated Subject'
    input.checklist.heartbeatDetected = false
    input.checklist.heartbeatBpm = 0
    input.checklist.pupilState = 'Clouded'
    input.checklist.emfLevel = 'Extreme'
    input.checklist.symptoms = {
      aggression: true,
      decay: true,
      incoherentSpeech: true,
      violentResponse: true,
      aversionToLight: true,
      abnormalOdor: true,
    }
    const base = createPatientRecord(input)
    const terminated = createPatientRecord(input, {
      ...base,
      classification: TERMINATED_CLASSIFICATION,
      containmentStatus: 'Terminated',
    })

    render(
      <MemoryRouter>
        <PatientCard patient={terminated} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Terminated Subject')).toBeInTheDocument()
    expect(screen.queryByText('TERMINATE ON SIGHT')).not.toBeInTheDocument()
  })

  it('shows TERMINATE ON SIGHT for non-terminated patient with infection >= 81%', () => {
    const input = defaultPatientInput()
    input.identity.name = 'High Infection Subject'
    input.checklist.heartbeatDetected = false
    input.checklist.heartbeatBpm = 0
    input.checklist.pupilState = 'Clouded'
    input.checklist.temperatureC = 34
    input.checklist.emfLevel = 'Extreme'
    input.checklist.symptoms = {
      aggression: true,
      decay: true,
      incoherentSpeech: true,
      violentResponse: true,
      aversionToLight: true,
      abnormalOdor: true,
    }
    const record = createPatientRecord(input)

    render(
      <MemoryRouter>
        <PatientCard patient={record} />
      </MemoryRouter>,
    )

    expect(screen.getByText('TERMINATE ON SIGHT')).toBeInTheDocument()
  })
})
