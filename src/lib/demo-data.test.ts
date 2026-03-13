import { describe, expect, it } from 'vitest'
import { badgePayloadFromRecord, badgeSeverity } from './badge'
import { demoPatients } from './demo-data'

describe('demoPatients', () => {
  it('returns exactly five records', () => {
    const records = demoPatients()
    expect(records).toHaveLength(5)
  })

  it('includes one Cleared, one Observation, one Suspected, one Critical, one Terminated by status', () => {
    const records = demoPatients()
    const statuses = records.map((r) => r.classification.status)
    expect(statuses).toContain('Cleared')
    expect(statuses).toContain('Observation')
    expect(statuses).toContain('Suspected')
    expect(statuses).toContain('Critical')
    expect(statuses).toContain('Terminated')
  })

  it('has one of each badge severity (cleared, warning, critical, terminated)', () => {
    const records = demoPatients()
    const severities = records.map((r) => badgeSeverity(badgePayloadFromRecord(r)))
    expect(severities).toContain('cleared')
    expect(severities).toContain('warning')
    expect(severities).toContain('critical')
    expect(severities).toContain('terminated')
  })

  it('Cleared record has name Ava Mercer', () => {
    const records = demoPatients()
    const cleared = records.find((r) => r.classification.status === 'Cleared')
    expect(cleared).toBeDefined()
    expect(cleared!.identity.name).toBe('Ava Mercer')
  })

  it('Observation (caution) record has name Morgan Reid', () => {
    const records = demoPatients()
    const obs = records.find((r) => r.classification.status === 'Observation')
    expect(obs).toBeDefined()
    expect(obs!.identity.name).toBe('Morgan Reid')
  })

  it('Terminated record has status Terminated and containmentStatus Terminated', () => {
    const records = demoPatients()
    const term = records.find((r) => r.classification.status === 'Terminated')
    expect(term).toBeDefined()
    expect(term!.containmentStatus).toBe('Terminated')
    expect(term!.classification.summary).toMatch(/terminated|no longer a threat/i)
  })

  it('all records have valid id, identity, checklist, classification', () => {
    const records = demoPatients()
    for (const r of records) {
      expect(r.id).toBeTruthy()
      expect(r.identity.name).toBeTruthy()
      expect(r.checklist).toBeDefined()
      expect(r.classification.status).toBeTruthy()
      expect(r.classification.riskScore).toBeGreaterThanOrEqual(0)
    }
  })
})
