import { describe, expect, it } from 'vitest'
import { getObjectClass } from './assessment-ui'
import type { ClassificationResult } from '../types/patient'

const baseClassification: ClassificationResult = {
  status: 'Observation',
  riskScore: 3,
  summary: 'Subject under observation.',
  actions: [],
  warnings: [],
}

describe('getObjectClass', () => {
  it('returns Safe for low risk and normal containment', () => {
    expect(getObjectClass({ ...baseClassification, status: 'Observation', riskScore: 2 })).toBe('Safe')
    expect(getObjectClass({ ...baseClassification, status: 'Cleared', riskScore: 0 })).toBe('Safe')
    expect(getObjectClass({ ...baseClassification, status: 'Observation', riskScore: 4 }, 'Normal')).toBe('Safe')
  })

  it('returns Euclid for Contained status', () => {
    expect(getObjectClass({ ...baseClassification, status: 'Contained', riskScore: 3 })).toBe('Euclid')
  })

  it('returns Euclid for Threat or Known Threat containment', () => {
    expect(getObjectClass(baseClassification, 'Threat')).toBe('Euclid')
    expect(getObjectClass(baseClassification, 'Known Threat')).toBe('Euclid')
  })

  it('returns Euclid for risk score >= 5 and < 8', () => {
    expect(getObjectClass({ ...baseClassification, riskScore: 5 })).toBe('Euclid')
    expect(getObjectClass({ ...baseClassification, riskScore: 7 })).toBe('Euclid')
  })

  it('returns Keter for Escaped containment', () => {
    expect(getObjectClass(baseClassification, 'Escaped')).toBe('Keter')
  })

  it('returns Keter for Critical status', () => {
    expect(getObjectClass({ ...baseClassification, status: 'Critical', riskScore: 5 })).toBe('Keter')
  })

  it('returns Keter for risk score >= 8', () => {
    expect(getObjectClass({ ...baseClassification, riskScore: 8 })).toBe('Keter')
    expect(getObjectClass({ ...baseClassification, riskScore: 11 })).toBe('Keter')
  })

  it('treats null/undefined containment as normal', () => {
    expect(getObjectClass({ ...baseClassification, riskScore: 2 }, null)).toBe('Safe')
    expect(getObjectClass({ ...baseClassification, riskScore: 2 }, undefined)).toBe('Safe')
  })
})
