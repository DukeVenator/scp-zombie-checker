import {
  type ClassificationResult,
  type PatientInput,
  type PatientRecord,
  type PatientWarning,
} from '../types/patient'

type PatientLike = Pick<PatientInput, 'identity' | 'checklist'> | Pick<PatientRecord, 'identity' | 'checklist'>

const createWarning = (
  id: string,
  severity: PatientWarning['severity'],
  title: string,
  detail: string,
  action: string,
): PatientWarning => ({
  id,
  severity,
  title,
  detail,
  action,
})

export const classifyPatient = (patient: PatientLike): ClassificationResult => {
  const { checklist, identity } = patient
  const warnings: PatientWarning[] = []
  const actions = new Set<string>()
  let riskScore = 0

  if (!checklist.heartbeatDetected || checklist.heartbeatBpm === 0) {
    riskScore += 6
    warnings.push(
      createWarning(
        'heartbeat-missing',
        'critical',
        'POTENTIAL DEAD — No heartbeat',
        'No reliable heartbeat was detected. Subject is flagged as POTENTIAL ZOMBIE. Treat as hostile reanimation risk until secondary biometric confirmation overrides.',
        'Initiate immediate hard containment. Arm all personnel. Do not approach without lethal backup.',
      ),
    )
    actions.add('POTENTIAL ZOMBIE: Contain patient. Confirm vitals with secondary device under armed escort.')
  } else if (checklist.heartbeatBpm < 40 || checklist.heartbeatBpm > 140) {
    riskScore += 2
    warnings.push(
      createWarning(
        'heartbeat-abnormal',
        'warning',
        'Heartbeat outside normal range',
        `Recorded heartbeat of ${checklist.heartbeatBpm} BPM falls outside the expected range.`,
        'Escalate to medical observer and repeat pulse verification.',
      ),
    )
    actions.add('Repeat pulse verification and monitor the patient continuously.')
  }

  if (checklist.temperatureC < 35) {
    riskScore += 3
    warnings.push(
      createWarning(
        'temperature-hypothermic',
        'critical',
        'Hypothermic — dangerously low temperature',
        `Patient temperature is ${checklist.temperatureC.toFixed(1)} C. Consistent with reanimation or post-mortem state.`,
        'Initiate thermal biometric confirmation. Treat as potential zombie marker.',
      ),
    )
    actions.add('Confirm death-state thermal reading. Prepare containment if vitals remain absent.')
  } else if (checklist.temperatureC < 36.5) {
    riskScore += 1
    warnings.push(
      createWarning(
        'temperature-low',
        'warning',
        'Below normal temperature',
        `Patient temperature is ${checklist.temperatureC.toFixed(1)} C. May indicate metabolic failure.`,
        'Monitor for continued decline and repeat thermal check in 10 minutes.',
      ),
    )
    actions.add('Repeat thermal scan. Watch for circulatory shutdown indicators.')
  } else if (checklist.temperatureC >= 39.5) {
    riskScore += 2
    warnings.push(
      createWarning(
        'temperature-high',
        'warning',
        'High fever — biohazard concern',
        `Patient temperature is ${checklist.temperatureC.toFixed(1)} C. Possible active pathogenic infection.`,
        'Full PPE. Isolate immediately. Escalate for pathogen screening and cooling protocol.',
      ),
    )
    actions.add('Isolate for retesting. Full biohazard precautions.')
  } else if (checklist.temperatureC >= 38.5) {
    riskScore += 1
    warnings.push(
      createWarning(
        'temperature-fever',
        'warning',
        'Fever detected',
        `Patient temperature is ${checklist.temperatureC.toFixed(1)} C.`,
        'Isolate and prepare secondary pathogen screening.',
      ),
    )
    actions.add('Collect a secondary temperature reading and isolate for retesting.')
  }

  if (checklist.pupilState === 'Clouded' || checklist.pupilState === 'Non-reactive') {
    riskScore += 2
    warnings.push(
      createWarning(
        'pupils-abnormal',
        'warning',
        'Abnormal pupil response',
        `Pupil state is marked as ${checklist.pupilState.toLowerCase()}.`,
        'Apply ocular response check and maintain controlled lighting.',
      ),
    )
    actions.add('Maintain light control and log a follow-up pupil assessment.')
  }

  if (checklist.emfLevel === 'High') {
    riskScore += 2
    warnings.push(
      createWarning(
        'emf-high',
        'warning',
        'High EMF reading',
        'The EMF scan indicates an anomalously high reading.',
        'Re-test with a calibrated EMF device and move to a shielded area.',
      ),
    )
    actions.add('Repeat EMF check with a calibrated scanner.')
  }

  if (checklist.emfLevel === 'Extreme') {
    riskScore += 4
    warnings.push(
      createWarning(
        'emf-extreme',
        'critical',
        'Extreme EMF spike',
        'The EMF scan indicates an extreme anomalous signature.',
        'Escalate directly to SCP containment protocol.',
      ),
    )
    actions.add('Alert the containment lead and initiate SCP containment protocol.')
  }

  const activeSymptoms = Object.entries(checklist.symptoms).filter(([, active]) => active)
  if (activeSymptoms.length >= 2) {
    riskScore += activeSymptoms.length
    warnings.push(
      createWarning(
        'symptom-cluster',
        activeSymptoms.length >= 4 ? 'critical' : 'warning',
        'Escalating symptom cluster',
        `${activeSymptoms.length} advanced behavioral or physical symptoms were recorded.`,
        'Move to a high-observation status and secure support personnel.',
      ),
    )
    actions.add('Assign an armed observer and document symptom progression every 15 minutes.')
  }

  if (
    (!checklist.heartbeatDetected || checklist.heartbeatBpm === 0) &&
    (checklist.pupilState === 'Non-reactive' || checklist.pupilState === 'Clouded') &&
    (checklist.emfLevel === 'High' || checklist.emfLevel === 'Extreme')
  ) {
    riskScore += 5
    warnings.push(
      createWarning(
        'triad-confirmation',
        'critical',
        'High-confidence zombie profile',
        'Missing heartbeat, abnormal pupils, and elevated EMF appear together.',
        'Immediate containment and quarantine are required.',
      ),
    )
    actions.add('Lock down the patient area and notify the nearest SCP response team.')
  }

  if (identity.name.trim().length > 0) {
    actions.add(`Verify identity markers against ${identity.name}'s visual profile before transfer.`)
  }

  let status: ClassificationResult['status'] = 'Cleared'
  let summary = 'Low anomaly indicators. Continue standard observation.'

  if (riskScore >= 11) {
    status = 'Critical'
    summary = 'Critical anomaly signature detected. Immediate containment required.'
  } else if (riskScore >= 8) {
    status = 'Contained'
    summary = 'Probable SCP-linked infection profile. Patient should be contained.'
  } else if (riskScore >= 5) {
    status = 'Suspected'
    summary = 'Significant indicators detected. Escalate for focused observation.'
  } else if (riskScore >= 2) {
    status = 'Observation'
    summary = 'Moderate irregularities present. Keep the patient under observation.'
  }

  if (warnings.length === 0) {
    warnings.push(
      createWarning(
        'baseline-clear',
        'info',
        'No major anomaly indicators',
        'Current record does not show any high-risk SCP zombie markers.',
        'Maintain standard monitoring and record a follow-up if symptoms change.',
      ),
    )
    actions.add('Maintain standard monitoring and record a routine follow-up.')
  }

  return {
    status,
    riskScore,
    summary,
    warnings,
    actions: Array.from(actions),
  }
}

export const getStatusTone = (status: ClassificationResult['status']) => {
  switch (status) {
    case 'Critical':
      return 'critical'
    case 'Contained':
      return 'warning'
    case 'Suspected':
      return 'warning'
    case 'Observation':
      return 'info'
    default:
      return 'safe'
  }
}
