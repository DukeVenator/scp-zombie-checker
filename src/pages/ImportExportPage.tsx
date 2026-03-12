import { Suspense, lazy, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowRightLeft, Download, QrCode, Upload } from 'lucide-react'
import { buildExportPayload, downloadJson, exportFileName, safeParseImportPayload } from '../lib/export'
import { buildQrPayload, parseQrPayload } from '../lib/qr'
import { useAgentProfile } from '../hooks/useAgentProfile'
import { useToast } from '../hooks/useToast'
import { createImportedClone, createPatientRecord, findImportConflict, mergeImportedRecord } from '../lib/storage'
import { defaultReportingAgent, profileToReportingAgent } from '../types/agent'
import type { PatientInput, PatientRecord } from '../types/patient'
import { usePatientStore } from '../hooks/usePatientStore'

const Scanner = lazy(() => import('@yudiel/react-qr-scanner').then((module) => ({ default: module.Scanner })))

type ImportSource = 'json' | 'qr'

type ImportSession = {
  source: ImportSource
  staged: PatientRecord[]
  queue: PatientRecord[]
  incoming: PatientRecord
  existing: PatientRecord
  renameValue: string
}

export const ImportExportPage = () => {
  const { patients, importRecords, clearAllPatients } = usePatientStore()
  const { profile } = useAgentProfile()
  const { pushToast } = useToast()
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [qrImportValue, setQrImportValue] = useState('')
  const [scanEnabled, setScanEnabled] = useState(false)
  const [importSession, setImportSession] = useState<ImportSession | null>(null)

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) ?? patients[0],
    [patients, selectedPatientId],
  )

  const qrValue = useMemo(() => {
    if (!selectedPatient) {
      return ''
    }

    try {
      return buildQrPayload(selectedPatient)
    } catch (error) {
      return error instanceof Error ? error.message : ''
    }
  }, [selectedPatient])

  const finalizeImports = async (source: ImportSource, records: PatientRecord[]) => {
    await importRecords(records)
    pushToast({
      title: source === 'qr' ? 'QR import complete' : 'Import complete',
      description: `Imported ${records.length} patient record${records.length === 1 ? '' : 's'}.`,
      tone: 'success',
    })
  }

  const startImportFlow = async (records: PatientRecord[], source: ImportSource) => {
    const staged: PatientRecord[] = []
    const shadowRecords = [...patients]

    for (const record of records) {
      const conflict = findImportConflict([...shadowRecords, ...staged], record)
      if (conflict) {
        setImportSession({
          source,
          staged,
          queue: records.slice(records.indexOf(record) + 1),
          incoming: record,
          existing: conflict,
          renameValue: `${record.identity.name} Copy`,
        })
        return
      }

      staged.push(record)
    }

    await finalizeImports(source, staged)
  }

  const continueImportFlow = async (nextStaged: PatientRecord[], remainingQueue: PatientRecord[], source: ImportSource) => {
    const shadowRecords = [...patients, ...nextStaged]

    for (const record of remainingQueue) {
      const conflict = findImportConflict(shadowRecords, record)
      if (conflict) {
        setImportSession({
          source,
          staged: nextStaged,
          queue: remainingQueue.slice(remainingQueue.indexOf(record) + 1),
          incoming: record,
          existing: conflict,
          renameValue: `${record.identity.name} Copy`,
        })
        return
      }

      nextStaged.push(record)
      shadowRecords.push(record)
    }

    setImportSession(null)
    await finalizeImports(source, nextStaged)
  }

  const importQrPayload = async (payload: string) => {
    const parsed = parseQrPayload(payload)
    const input: PatientInput = {
      identity: {
        name: parsed.name,
        age: parsed.age,
        sex: parsed.sex,
        hairColor: parsed.hairColor,
        eyeColor: parsed.eyeColor,
        skinPigmentation: parsed.skinPigmentation,
        incidentLocation: 'Imported via QR',
        notes: 'Imported from a compact QR transfer payload.',
      },
      checklist: parsed.checklist,
      reportingAgent: profile ? profileToReportingAgent(profile) : defaultReportingAgent(),
      photo: {
        dataUrl: '',
        contentType: '',
        capturedAt: '',
      },
    }

    await startImportFlow([createPatientRecord(input, undefined, 'imported')], 'qr')
  }

  return (
    <div className="page-stack">
      <section className="content-grid">
        <div className="page-stack">
          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">JSON transfer</p>
                <h2>Export or import patient files</h2>
              </div>
            </div>

            <div className="button-cluster">
              <button
                className="primary-button"
                onClick={() => downloadJson(buildExportPayload(patients), exportFileName('all'))}
                type="button"
              >
                <Download size={16} />
                Export all patients
              </button>

              <label className="secondary-button">
                <Upload size={16} />
                Import JSON
                <input
                  accept="application/json"
                  aria-label="Import patient JSON"
                  hidden
                  type="file"
                  onChange={async (event) => {
                    const file = event.target.files?.[0]
                    if (!file) {
                      return
                    }

                    const text = await file.text()
                    const parsed = safeParseImportPayload(text)
                    if (!parsed.success) {
                      pushToast({
                        title: 'Import failed',
                        description: parsed.error,
                        tone: 'error',
                      })
                      return
                    }

                    await startImportFlow(parsed.data.records, 'json')
                  }}
                />
              </label>

              <button
                className="ghost-button danger-button"
                onClick={async () => {
                  await clearAllPatients()
                  pushToast({
                    title: 'Local records cleared',
                    description: 'All browser-stored patient records were removed from this device.',
                    tone: 'warning',
                  })
                }}
                type="button"
              >
                Clear local records
              </button>
            </div>
          </article>

          {importSession && (
            <article className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Import conflict wizard</p>
                  <h3>Existing patient detected</h3>
                  <p className="muted">
                    Decide whether to update the matching local record or import this patient under a new name.
                  </p>
                </div>
                <ArrowRightLeft size={18} />
              </div>

              <div className="detail-grid">
                <section className="panel panel--inner">
                  <h4>Existing patient</h4>
                  <dl className="review-list">
                    <div>
                      <dt>Name</dt>
                      <dd>{importSession.existing.identity.name}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{importSession.existing.classification.status}</dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>{new Date(importSession.existing.updatedAt).toLocaleString()}</dd>
                    </div>
                  </dl>
                </section>

                <section className="panel panel--inner">
                  <h4>Incoming patient</h4>
                  <dl className="review-list">
                    <div>
                      <dt>Name</dt>
                      <dd>{importSession.incoming.identity.name}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{importSession.incoming.classification.status}</dd>
                    </div>
                    <div>
                      <dt>Imported from</dt>
                      <dd>{importSession.source === 'qr' ? 'QR payload' : 'JSON file'}</dd>
                    </div>
                  </dl>
                </section>
              </div>

              <div className="form-grid">
                <button
                  className="primary-button"
                  onClick={() =>
                    void continueImportFlow(
                      [...importSession.staged, mergeImportedRecord(importSession.existing, importSession.incoming)],
                      importSession.queue,
                      importSession.source,
                    )
                  }
                  type="button"
                >
                  Update existing patient
                </button>

                <label className="form-grid__wide">
                  Import under a new name
                  <input
                    value={importSession.renameValue}
                    onChange={(event) =>
                      setImportSession((current) =>
                        current
                          ? {
                              ...current,
                              renameValue: event.target.value,
                            }
                          : current,
                      )
                    }
                  />
                </label>
                <div className="button-cluster">
                  <button
                    className="secondary-button"
                    onClick={() => {
                      if (!importSession.renameValue.trim()) {
                        pushToast({
                          title: 'Name required',
                          description: 'Enter a new patient name before importing a duplicate as a new record.',
                          tone: 'warning',
                        })
                        return
                      }

                      void continueImportFlow(
                        [...importSession.staged, createImportedClone(importSession.incoming, importSession.renameValue)],
                        importSession.queue,
                        importSession.source,
                      )
                    }}
                    type="button"
                  >
                    Import as new patient
                  </button>

                  <button
                    className="ghost-button"
                    onClick={() => {
                      setImportSession(null)
                      pushToast({
                        title: 'Import cancelled',
                        description: 'The staged import was cancelled before any conflicting patient was written.',
                        tone: 'info',
                      })
                    }}
                    type="button"
                  >
                    Cancel import
                  </button>
                </div>
              </div>
            </article>
          )}

          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">QR transfer</p>
                <h3>Export a single patient</h3>
              </div>
            </div>

            {patients.length > 0 ? (
              <>
                <label>
                  Patient
                  <select value={selectedPatient?.id ?? ''} onChange={(event) => setSelectedPatientId(event.target.value)}>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.identity.name} ({patient.classification.status})
                      </option>
                    ))}
                  </select>
                </label>

                {qrValue && !qrValue.startsWith('This patient record is too large') ? (
                  <div className="qr-block">
                    <QRCodeSVG includeMargin size={220} value={qrValue} />
                    <p className="muted">
                      QR export is intentionally compact and does not include patient photos.
                    </p>
                  </div>
                ) : (
                  <p className="muted">{qrValue || 'Select a patient to generate a QR transfer payload.'}</p>
                )}
              </>
            ) : (
              <p className="muted">Create or import patients before using QR transfer.</p>
            )}
          </article>
        </div>

        <aside className="page-stack">
          <article className="panel">
            <div className="section-heading">
              <div>
                <h3>Import patient from QR</h3>
                <p className="muted">Use the camera when available or paste the QR payload manually.</p>
              </div>
              <QrCode size={18} />
            </div>

            <div className="button-cluster">
              <button className="secondary-button" onClick={() => setScanEnabled((current) => !current)} type="button">
                {scanEnabled ? 'Stop scanner' : 'Start camera scanner'}
              </button>
            </div>

            {scanEnabled && (
              <div className="scanner-shell">
                <Suspense fallback={<div className="panel panel--inner">Starting camera scanner...</div>}>
                  <Scanner
                    onError={(error) =>
                      pushToast({
                        title: 'QR scan failed',
                        description: error instanceof Error ? error.message : 'Unable to scan QR code.',
                        tone: 'error',
                      })
                    }
                    onScan={(codes) => {
                      const value = codes[0]?.rawValue
                      if (value) {
                        setQrImportValue(value)
                        setScanEnabled(false)
                        void importQrPayload(value)
                      }
                    }}
                  />
                </Suspense>
              </div>
            )}

            <label>
              Manual QR payload
              <textarea
                rows={8}
                value={qrImportValue}
                onChange={(event) => setQrImportValue(event.target.value)}
              />
            </label>

            <button className="primary-button" onClick={() => void importQrPayload(qrImportValue)} type="button">
              Import QR payload
            </button>
          </article>

          <article className="panel">
            <h3>Operational notes</h3>
            <ul className="action-list">
              <li>JSON export is the reliable path for full backups and attached photos.</li>
              <li>QR transfer is optimized for compact field handoff of a single patient summary.</li>
              <li>Import conflicts now open a wizard so you can update an existing patient or import under a new name.</li>
            </ul>
          </article>
        </aside>
      </section>
    </div>
  )
}
