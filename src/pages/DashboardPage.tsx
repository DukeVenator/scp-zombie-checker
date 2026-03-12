import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Siren } from 'lucide-react'
import { useToast } from '../hooks/useToast'
import { PatientCard } from '../components/patient/PatientCard'
import {
  calculateInfectionProbability,
  getClassificationToastTone,
  getThreatLevel,
  isHighAlertClassification,
} from '../lib/assessment-ui'
import { demoPatients } from '../lib/demo-data'
import { usePatientStore } from '../hooks/usePatientStore'
import type { PatientRecord } from '../types/patient'

const DEBOUNCE_MS = 220
const MAX_SUGGESTIONS = 6

const buildHaystack = (p: PatientRecord) =>
  [
    p.identity.name,
    p.identity.hairColor,
    p.identity.eyeColor,
    p.identity.skinPigmentation,
    p.classification.status,
    p.containmentStatus,
    p.variant,
  ].join(' ').toLowerCase()

export const DashboardPage = () => {
  const { patients, recentPatients, loading, importRecords } = usePatientStore()
  const { pushToast } = useToast()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const previousPatientsRef = useRef<Map<string, string>>(new Map())
  const searchWrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce the query for suggestions
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  const filteredPatients = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return patients
    return patients.filter((p) => buildHaystack(p).includes(q))
  }, [patients, query])

  const suggestions = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    if (!q) return []
    return patients
      .filter((p) => buildHaystack(p).includes(q))
      .slice(0, MAX_SUGGESTIONS)
  }, [patients, debouncedQuery])

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setSuggestionsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectSuggestion = useCallback((id: string) => {
    setSuggestionsOpen(false)
    setQuery('')
    navigate(`/patients/${id}`)
  }, [navigate])

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!suggestionsOpen || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((prev) => (prev + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1))
    } else if (e.key === 'Enter' && activeIdx >= 0 && activeIdx < suggestions.length) {
      e.preventDefault()
      selectSuggestion(suggestions[activeIdx].id)
    } else if (e.key === 'Escape') {
      setSuggestionsOpen(false)
    }
  }, [activeIdx, selectSuggestion, suggestions, suggestionsOpen])

  const stats = useMemo(() => {
    let criticalCount = 0
    let containedCount = 0
    let escapedCount = 0
    let terminateCount = 0
    let highestInfection = 0
    let highestInfectionName = ''
    const statusBreakdown: Record<string, number> = {}
    const variantBreakdown: Record<string, number> = {}

    patients.forEach((p) => {
      const status = p.classification.status
      statusBreakdown[status] = (statusBreakdown[status] ?? 0) + 1
      if (['Critical', 'Contained', 'Suspected'].includes(status)) criticalCount++

      const cs = p.containmentStatus ?? 'Normal'
      if (cs === 'Contained' || cs === 'Threat' || cs === 'Known Threat') containedCount++
      if (cs === 'Escaped') escapedCount++

      const v = p.variant ?? 'Normal'
      if (v !== 'Normal') variantBreakdown[v] = (variantBreakdown[v] ?? 0) + 1

      const inf = calculateInfectionProbability(p.checklist)
      if (inf >= 81) terminateCount++
      if (inf > highestInfection) {
        highestInfection = inf
        highestInfectionName = p.identity.name
      }
    })

    return { criticalCount, containedCount, escapedCount, terminateCount, highestInfection, highestInfectionName, statusBreakdown, variantBreakdown }
  }, [patients])

  useEffect(() => {
    const previous = previousPatientsRef.current
    const next = new Map<string, string>()

    patients.forEach((patient) => {
      const snapshot = `${patient.updatedAt}:${patient.classification.status}:${patient.classification.riskScore}`
      next.set(patient.id, snapshot)

      if (previous.size === 0) return
      const prior = previous.get(patient.id)
      if (!prior || prior === snapshot) return

      pushToast({
        title: `Assessment updated: ${patient.identity.name}`,
        description: `${patient.classification.status} status recorded with risk ${patient.classification.riskScore}.`,
        tone: isHighAlertClassification(patient.classification)
          ? 'error'
          : getClassificationToastTone(patient.classification),
      })
    })

    previousPatientsRef.current = next
  }, [patients, pushToast])

  return (
    <div className="page-stack">
      <section className="hero panel">
        <div>
          <p className="eyebrow">SCP field dashboard</p>
          <h2>Zombie classification & containment</h2>
          <p className="muted">
            Local-first patient registry. All records stay on-device with offline support.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="primary-button" to="/new">
            <Plus size={16} />
            New patient
          </Link>
          <Link className="secondary-button" to="/transfers">
            Import / Export
          </Link>
          {patients.length === 0 && (
            <button
              className="ghost-button"
              onClick={async () => {
                await importRecords(demoPatients())
                pushToast({
                  title: 'Demo records loaded',
                  description: 'Sample SCP patient files were added for quick testing.',
                  tone: 'info',
                })
              }}
              type="button"
            >
              Load demo records
            </button>
          )}
        </div>
      </section>

      {stats.escapedCount > 0 && (
        <div className="dash-alert dash-alert--critical" role="alert">
          <Siren size={18} />
          <strong>{stats.escapedCount} ESCAPED</strong>
          <span>— containment breach active. All exits locked down.</span>
        </div>
      )}
      {stats.terminateCount > 0 && (
        <div className="dash-alert dash-alert--terminate" role="alert">
          <Siren size={18} />
          <strong>{stats.terminateCount} TERMINATE ON SIGHT</strong>
          <span>— subject{stats.terminateCount > 1 ? 's' : ''} beyond recovery threshold.</span>
        </div>
      )}

      <section className="metrics-grid">
        <article className="panel metric-card">
          <span className="metric-value">{patients.length}</span>
          <span className="muted">Total patients</span>
        </article>
        <article className="panel metric-card">
          <span className="metric-value metric-value--warn">{stats.criticalCount}</span>
          <span className="muted">Needs SCP action</span>
        </article>
        <article className="panel metric-card">
          <span className="metric-value metric-value--danger">{stats.containedCount}</span>
          <span className="muted">Contained / Threat</span>
        </article>
        <article className="panel metric-card">
          <span className={`metric-value ${stats.highestInfection >= 70 ? 'metric-value--danger' : stats.highestInfection >= 40 ? 'metric-value--warn' : ''}`}>
            {patients.length > 0 ? `${stats.highestInfection}%` : '—'}
          </span>
          <span className="muted">Peak infection</span>
          {stats.highestInfectionName && <span className="metric-sub">{stats.highestInfectionName}</span>}
        </article>
      </section>

      {patients.length > 0 && (
        <section className="breakdown-row">
          <article className="panel breakdown-card">
            <p className="eyebrow">Classification breakdown</p>
            <div className="breakdown-tags">
              {Object.entries(stats.statusBreakdown).map(([status, count]) => (
                <span key={status} className={`badge badge--${status.toLowerCase()}`}>
                  {status}: {count}
                </span>
              ))}
            </div>
          </article>
          {Object.keys(stats.variantBreakdown).length > 0 && (
            <article className="panel breakdown-card">
              <p className="eyebrow">Confirmed variants</p>
              <div className="breakdown-tags">
                {Object.entries(stats.variantBreakdown).map(([v, count]) => (
                  <span key={v} className={`badge badge--small ${v === 'Alpha' || v === 'Gate Breaker' ? 'badge--critical' : 'badge--warning'}`}>
                    {v}: {count}
                  </span>
                ))}
              </div>
            </article>
          )}
        </section>
      )}

      <section className="content-grid">
        <div className="page-stack">
          <div className="panel">
            <div className="section-heading">
              <div>
                <h3>Patient registry</h3>
                <p className="muted">Search by name, status, variant, or containment level.</p>
              </div>
            </div>

            <div className="search-wrapper" ref={searchWrapperRef}>
              <label className="search-input">
                <Search size={16} />
                <input
                  ref={inputRef}
                  autoComplete="off"
                  placeholder="Search by name, features, status, variant..."
                  role="combobox"
                  aria-expanded={suggestionsOpen && suggestions.length > 0}
                  aria-autocomplete="list"
                  aria-controls="search-suggestions"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setSuggestionsOpen(true)
                    setActiveIdx(-1)
                  }}
                  onFocus={() => { if (debouncedQuery.trim()) setSuggestionsOpen(true) }}
                  onKeyDown={onKeyDown}
                />
              </label>

              {suggestionsOpen && suggestions.length > 0 && (
                <ul className="search-suggestions" id="search-suggestions" role="listbox">
                  {suggestions.map((p, idx) => {
                    const inf = calculateInfectionProbability(p.checklist)
                    const infCls = inf >= 70 ? 'infection--critical' : inf >= 40 ? 'infection--warning' : 'infection--low'
                    const cs = p.containmentStatus ?? 'Normal'
                    const threat = getThreatLevel(p.classification)
                    return (
                      <li
                        key={p.id}
                        role="option"
                        aria-selected={idx === activeIdx}
                        className={`search-suggestion ${idx === activeIdx ? 'is-active' : ''}`}
                        onMouseDown={() => selectSuggestion(p.id)}
                        onMouseEnter={() => setActiveIdx(idx)}
                      >
                        <div className="search-suggestion__main">
                          <strong>{p.identity.name}</strong>
                          <span className="muted search-suggestion__id">#{p.id.slice(0, 6)}</span>
                        </div>
                        <div className="search-suggestion__badges">
                          <span className={`badge badge--small badge--${p.classification.status.toLowerCase()}`}>
                            {p.classification.status}
                          </span>
                          <span className={`badge badge--small ${infCls}`}>{inf}%</span>
                          <span className="badge badge--small">{threat}</span>
                          {cs !== 'Normal' && (
                            <span className={`badge badge--small ${cs === 'Escaped' || cs === 'Known Threat' ? 'badge--critical' : 'badge--warning'}`}>
                              {cs}
                            </span>
                          )}
                        </div>
                      </li>
                    )
                  })}
                  {filteredPatients.length > MAX_SUGGESTIONS && (
                    <li className="search-suggestion search-suggestion--more">
                      <span className="muted">
                        {filteredPatients.length - MAX_SUGGESTIONS} more result{filteredPatients.length - MAX_SUGGESTIONS > 1 ? 's' : ''} below
                      </span>
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

          {loading ? (
            <div className="panel">Loading records...</div>
          ) : filteredPatients.length > 0 ? (
            filteredPatients.map((patient) => <PatientCard key={patient.id} patient={patient} />)
          ) : (
            <div className="panel">
              <p className="muted">No matching patient records yet.</p>
            </div>
          )}
        </div>

        <aside className="page-stack">
          <section className="panel">
            <div className="section-heading">
              <div>
                <h3>Recent patient history</h3>
                <p className="muted">Last opened or updated files.</p>
              </div>
            </div>

            {recentPatients.length > 0 ? (
              <ul className="compact-list">
                {recentPatients.map((patient) => {
                  const inf = calculateInfectionProbability(patient.checklist)
                  const infCls = inf >= 70 ? 'infection--critical' : inf >= 40 ? 'infection--warning' : 'infection--low'
                  const cs = patient.containmentStatus ?? 'Normal'
                  return (
                    <li key={patient.id}>
                      <Link className="history-link" to={`/patients/${patient.id}`}>
                        <div className="history-link__main">
                          <span>{patient.identity.name}</span>
                          <div className="history-link__sub">
                            <span className={`badge badge--${patient.classification.status.toLowerCase()} badge--small`}>
                              {patient.classification.status}
                            </span>
                            <span className={`badge badge--small ${infCls}`}>{inf}%</span>
                            {cs !== 'Normal' && (
                              <span className={`badge badge--small ${cs === 'Escaped' || cs === 'Known Threat' ? 'badge--critical' : 'badge--warning'}`}>
                                {cs}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="muted">No recent records yet.</p>
            )}
          </section>

          <section className="panel">
            <h3>Backup reminder</h3>
            <p className="muted">
              Browser data can be cleared by the device. Use the export tools regularly to preserve patient files.
            </p>
          </section>
        </aside>
      </section>
    </div>
  )
}
