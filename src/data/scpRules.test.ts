import { describe, expect, it } from 'vitest'
import { classifyPatient } from './scpRules'
import { calculateInfectionProbability } from '../lib/assessment-ui'
import { defaultPatientInput } from '../types/patient'

describe('classifyPatient', () => {
  it('marks a healthy baseline patient as cleared', () => {
    const result = classifyPatient(defaultPatientInput())
    expect(result.status).toBe('Cleared')
    expect(result.riskScore).toBe(0)
    expect(result.warnings[0]?.severity).toBe('info')
  })

  it('marks the high-confidence zombie triad as critical', () => {
    const input = defaultPatientInput()
    input.checklist.heartbeatDetected = false
    input.checklist.heartbeatBpm = 0
    input.checklist.pupilState = 'Non-reactive'
    input.checklist.emfLevel = 'Extreme'
    input.checklist.symptoms.aggression = true
    input.checklist.symptoms.decay = true

    const result = classifyPatient(input)
    expect(result.status).toBe('Critical')
    expect(result.riskScore).toBeGreaterThanOrEqual(11)
    expect(result.actions.join(' ')).toMatch(/containment/i)
  })

  it('generates temperature warnings for hypothermic readings', () => {
    const input = defaultPatientInput()
    input.checklist.temperatureC = 33.0
    const result = classifyPatient(input)
    expect(result.warnings.some((w) => w.id === 'temperature-hypothermic')).toBe(true)
    expect(result.riskScore).toBeGreaterThanOrEqual(3)
  })

  it('generates temperature warnings for high fever', () => {
    const input = defaultPatientInput()
    input.checklist.temperatureC = 40.0
    const result = classifyPatient(input)
    expect(result.warnings.some((w) => w.id === 'temperature-high')).toBe(true)
  })

  it('marks status as Suspected (potential threat) when infection probability is above 40%', () => {
    const input = defaultPatientInput()
    input.checklist.symptoms.aggression = true
    input.checklist.symptoms.decay = true
    input.checklist.symptoms.violentResponse = true
    input.checklist.symptoms.incoherentSpeech = true
    expect(calculateInfectionProbability(input.checklist)).toBeGreaterThan(40)
    const result = classifyPatient(input)
    expect(result.status).toBe('Suspected')
    expect(result.summary).toMatch(/potential threat|40%/)
  })
})

describe('calculateInfectionProbability', () => {
  it('returns 0% for a healthy baseline', () => {
    const input = defaultPatientInput()
    expect(calculateInfectionProbability(input.checklist)).toBe(0)
  })

  it('weights symptoms heavily: one symptom gives at least 10%', () => {
    const input = defaultPatientInput()
    input.checklist.symptoms.aggression = true
    const pct = calculateInfectionProbability(input.checklist)
    expect(pct).toBeGreaterThanOrEqual(10)
  })

  it('weights symptoms heavily: four symptoms give above 40%', () => {
    const input = defaultPatientInput()
    input.checklist.symptoms.aggression = true
    input.checklist.symptoms.decay = true
    input.checklist.symptoms.violentResponse = true
    input.checklist.symptoms.incoherentSpeech = true
    const pct = calculateInfectionProbability(input.checklist)
    expect(pct).toBeGreaterThan(40)
  })

  it('returns high percentage for full zombie profile', () => {
    const input = defaultPatientInput()
    input.checklist.heartbeatDetected = false
    input.checklist.heartbeatBpm = 0
    input.checklist.pupilState = 'Non-reactive'
    input.checklist.emfLevel = 'Extreme'
    input.checklist.symptoms.aggression = true
    input.checklist.symptoms.decay = true
    input.checklist.symptoms.violentResponse = true
    input.checklist.temperatureC = 33.0
    const pct = calculateInfectionProbability(input.checklist)
    expect(pct).toBeGreaterThanOrEqual(80)
    expect(pct).toBeLessThanOrEqual(100)
  })
})
