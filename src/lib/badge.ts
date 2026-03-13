import type { PatientRecord } from '../types/patient'
import { calculateInfectionProbability } from './assessment-ui'

const HIGH_THREAT_CONTAINMENT = ['Escaped', 'Known Threat']
const HIGH_THREAT_VARIANT = ['Alpha', 'Gate Breaker']

/** Badge severity: same logic as BadgePage. Used for print fluff and testing page. */
export function badgeSeverity(payload: BadgePayload): 'critical' | 'warning' | 'cleared' | 'terminated' {
  if (payload.status === 'Terminated') {
    return 'terminated'
  }
  if (
    payload.status === 'Critical' ||
    payload.infectionPct >= 70 ||
    (payload.containment && HIGH_THREAT_CONTAINMENT.includes(payload.containment)) ||
    (payload.variant && HIGH_THREAT_VARIANT.includes(payload.variant)) ||
    payload.threatLevel === 'Critical'
  ) {
    return 'critical'
  }
  if (
    ['Suspected', 'Contained', 'Observation'].includes(payload.status) ||
    (payload.infectionPct >= 40 && payload.infectionPct < 70)
  ) {
    return 'warning'
  }
  return 'cleared'
}

export interface BadgePayload {
  id: string
  name: string
  status: string
  infectionPct: number
  updatedAt: string
  summary: string
  containment?: string
  variant?: string
  threatLevel?: string
  /** Agent who last exported/accessed this badge (set when copying link or opening export) */
  exportedBy?: { callsign: string; agentName: string }
}

const BADGE_VERSION = 1

function base64UrlEncode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function base64UrlDecode(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4
  const paddedStr = pad ? padded + '===='.slice(0, 4 - pad) : padded
  try {
    return decodeURIComponent(escape(atob(paddedStr)))
  } catch {
    return ''
  }
}

export function badgePayloadFromRecord(record: PatientRecord): BadgePayload {
  const infectionPct = calculateInfectionProbability(record.checklist)
  const threatLevel =
    record.classification.riskScore >= 70
      ? 'Critical'
      : record.classification.riskScore >= 40
        ? 'Elevated'
        : 'Low'
  return {
    id: record.id,
    name: record.identity.name,
    status: record.classification.status,
    infectionPct,
    updatedAt: record.updatedAt,
    summary: record.classification.summary,
    containment: record.containmentStatus,
    variant: record.variant,
    threatLevel,
  }
}

export function encodeBadgePayload(payload: BadgePayload): string {
  const blob = JSON.stringify({ v: BADGE_VERSION, ...payload })
  return base64UrlEncode(blob)
}

export function decodeBadgePayload(encoded: string): BadgePayload | null {
  if (!encoded?.trim()) return null
  try {
    const raw = base64UrlDecode(encoded.trim())
    const parsed = JSON.parse(raw) as {
      v?: number
      id: string
      name: string
      status: string
      infectionPct: number
      updatedAt: string
      summary: string
      containment?: string
      variant?: string
      threatLevel?: string
      exportedBy?: { callsign: string; agentName: string }
    }
    if (parsed.v !== BADGE_VERSION || !parsed.id || !parsed.name) return null
    return {
      id: parsed.id,
      name: parsed.name,
      status: parsed.status,
      infectionPct: Number(parsed.infectionPct) || 0,
      updatedAt: parsed.updatedAt || '',
      summary: parsed.summary || '',
      containment: parsed.containment,
      variant: parsed.variant,
      threatLevel: parsed.threatLevel,
      exportedBy: parsed.exportedBy,
    }
  } catch {
    return null
  }
}

/** Build full URL to the badge page (same origin + path + hash). */
export function getBadgeUrl(payload: BadgePayload): string {
  if (typeof window === 'undefined') return ''
  const path = window.location.pathname || '/'
  const base = window.location.origin + path
  return `${base}${base.endsWith('/') ? '' : '/'}#/badge?d=${encodeBadgePayload(payload)}`
}
