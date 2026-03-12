import { beforeEach, describe, expect, it } from 'vitest'
import {
  addRecentPatient,
  createPatientRecord,
  db,
  getRecentPatientIds,
  removeRecentPatient,
  savePatient,
  listPatients,
  clearPatients,
} from './storage'
import { defaultPatientInput } from '../types/patient'

describe('storage helpers', () => {
  beforeEach(async () => {
    window.localStorage.clear()
    await clearPatients()
  })

  it('creates and stores patient records', async () => {
    const input = defaultPatientInput()
    input.identity.name = 'Test Subject'
    input.identity.hairColor = 'Black'
    input.identity.eyeColor = 'Brown'
    input.identity.skinPigmentation = 'Light'

    const record = await savePatient(input)
    const records = await listPatients()

    expect(record.identity.name).toBe('Test Subject')
    expect(records).toHaveLength(1)
  })

  it('tracks recent patient ids', () => {
    const record = createPatientRecord({
      ...defaultPatientInput(),
      identity: {
        ...defaultPatientInput().identity,
        name: 'Recent Subject',
        hairColor: 'Black',
        eyeColor: 'Blue',
        skinPigmentation: 'Medium',
      },
    })

    addRecentPatient(record.id)
    expect(getRecentPatientIds()).toEqual([record.id])

    removeRecentPatient(record.id)
    expect(getRecentPatientIds()).toEqual([])
  })

  it('normalizes legacy records without reporting agent metadata', async () => {
    const input = defaultPatientInput()
    input.identity.name = 'Legacy Subject'
    input.identity.hairColor = 'Black'
    input.identity.eyeColor = 'Brown'
    input.identity.skinPigmentation = 'Light'

    const record = createPatientRecord(input)
    const legacyRecord = {
      ...record,
      reportingAgent: undefined,
      createdBy: undefined,
      updatedBy: undefined,
      history: record.history.map((entry) => ({
        ...entry,
        reportedBy: undefined,
      })),
    }

    await db.patients.put(legacyRecord as never)

    const records = await listPatients()
    expect(records[0]?.createdBy.callsign).toBeTruthy()
    expect(records[0]?.updatedBy.callsign).toBeTruthy()
    expect(records[0]?.history[0]?.reportedBy.callsign).toBeTruthy()
  })
})
