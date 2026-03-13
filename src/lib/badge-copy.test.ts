import { describe, expect, it } from 'vitest'
import { getPrintFluff } from './badge-copy'

describe('getPrintFluff', () => {
  it('returns different classification lines per severity', () => {
    const cleared = getPrintFluff('cleared')
    const warning = getPrintFluff('warning')
    const critical = getPrintFluff('critical')

    expect(cleared.classificationLine).toBe('CONFIDENTIAL — ROUTINE')
    expect(warning.classificationLine).toBe('RESTRICTED — ELEVATED RISK')
    expect(critical.classificationLine).toBe('EYES ONLY — TERMINATE ON SIGHT AUTHORIZED')

    expect(cleared.classificationLine).not.toBe(warning.classificationLine)
    expect(warning.classificationLine).not.toBe(critical.classificationLine)
  })

  it('returns non-empty footer lines per severity', () => {
    const cleared = getPrintFluff('cleared')
    const warning = getPrintFluff('warning')
    const critical = getPrintFluff('critical')

    expect(cleared.footerLines).toHaveLength(2)
    expect(cleared.footerLines[0]).toMatch(/Distribution|Authorized/)
    expect(warning.footerLines.length).toBeGreaterThan(0)
    expect(warning.footerLines.join(' ')).toMatch(/Handle with care|Destroy/)
    expect(critical.footerLines.length).toBeGreaterThan(0)
    expect(critical.footerLines.join(' ')).toMatch(/Lethal force|Destroy/)
  })
})
