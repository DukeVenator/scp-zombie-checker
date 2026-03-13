import { describe, expect, it } from 'vitest'
import {
  badgeSeverity,
  decodeBadgePayload,
  encodeBadgePayload,
  getBadgeUrl,
  type BadgePayload,
} from './badge'

const minimalPayload: BadgePayload = {
  id: 'test-id-123',
  name: 'Test Subject',
  status: 'Cleared',
  infectionPct: 10,
  updatedAt: '2026-03-12T12:00:00.000Z',
  summary: 'Low risk.',
  containment: 'Normal',
  variant: 'Normal',
  threatLevel: 'Low',
}

describe('encodeBadgePayload', () => {
  it('encodes a minimal payload to base64url', () => {
    const encoded = encodeBadgePayload(minimalPayload)
    expect(encoded).toBeTruthy()
    expect(encoded).not.toContain('+')
    expect(encoded).not.toContain('/')
    expect(encoded).not.toContain('=')
  })

  it('includes version and all payload fields in encoded string', () => {
    const encoded = encodeBadgePayload(minimalPayload)
    const decoded = decodeBadgePayload(encoded)
    expect(decoded).toEqual(minimalPayload)
  })
})

describe('decodeBadgePayload', () => {
  it('returns null for empty or whitespace', () => {
    expect(decodeBadgePayload('')).toBeNull()
    expect(decodeBadgePayload('   ')).toBeNull()
  })

  it('returns null for invalid base64', () => {
    expect(decodeBadgePayload('not-valid!!!')).toBeNull()
  })

  it('returns null for wrong version', () => {
    const payload = { v: 2, ...minimalPayload }
    const blob = JSON.stringify(payload)
    const encoded = btoa(blob).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    expect(decodeBadgePayload(encoded)).toBeNull()
  })

  it('returns null when id or name missing', () => {
    const noId = { v: 1, name: 'A', status: 'Cleared', infectionPct: 0, updatedAt: '', summary: '' }
    const encNoId = btoa(JSON.stringify(noId)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    expect(decodeBadgePayload(encNoId)).toBeNull()
  })

  it('round-trips payload with optional fields', () => {
    const full: BadgePayload = {
      ...minimalPayload,
      containment: 'Escaped',
      variant: 'Alpha',
      threatLevel: 'Critical',
    }
    const encoded = encodeBadgePayload(full)
    const decoded = decodeBadgePayload(encoded)
    expect(decoded).toEqual(full)
  })

  it('round-trips payload with exportedBy', () => {
    const withExportedBy: BadgePayload = {
      ...minimalPayload,
      exportedBy: { callsign: 'MTF-11', agentName: 'Dana Voss' },
    }
    const encoded = encodeBadgePayload(withExportedBy)
    const decoded = decodeBadgePayload(encoded)
    expect(decoded?.exportedBy).toEqual({ callsign: 'MTF-11', agentName: 'Dana Voss' })
  })
})

describe('badgeSeverity', () => {
  it('returns terminated when status is Terminated', () => {
    expect(badgeSeverity({ ...minimalPayload, status: 'Terminated' })).toBe('terminated')
  })

  it('returns cleared for Cleared low-risk payload', () => {
    expect(badgeSeverity(minimalPayload)).toBe('cleared')
  })

  it('returns critical for Critical status', () => {
    expect(badgeSeverity({ ...minimalPayload, status: 'Critical' })).toBe('critical')
  })

  it('returns warning for Observation status', () => {
    expect(badgeSeverity({ ...minimalPayload, status: 'Observation' })).toBe('warning')
  })

  it('returns warning for Suspected status', () => {
    expect(badgeSeverity({ ...minimalPayload, status: 'Suspected' })).toBe('warning')
  })

  it('returns warning for infection 40-69% when status is Cleared', () => {
    expect(badgeSeverity({ ...minimalPayload, status: 'Cleared', infectionPct: 50 })).toBe('warning')
  })
})

describe('getBadgeUrl', () => {
  it('returns string containing #/badge?d= when window is defined', () => {
    const url = getBadgeUrl(minimalPayload)
    expect(url).toContain('#/badge?d=')
    expect(url).toMatch(/d=[A-Za-z0-9_-]+/)
  })
})
