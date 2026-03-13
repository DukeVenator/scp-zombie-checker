import type { ToastTone } from './toast-store-context'
import type { ClassificationResult, ContainmentStatus, ZombieChecklist, ZombieVariant } from '../types/patient'

export const getClassificationToastTone = (classification: ClassificationResult): ToastTone => {
  switch (classification.status) {
    case 'Critical':
      return 'error'
    case 'Contained':
    case 'Suspected':
      return 'warning'
    case 'Observation':
      return 'info'
    case 'Terminated':
      return 'success'
    default:
      return 'success'
  }
}

export const isHighAlertClassification = (classification: ClassificationResult) =>
  classification.status !== 'Terminated' &&
  (classification.status === 'Contained' || classification.status === 'Critical' || classification.riskScore >= 8)

export const getThreatLevel = (classification: ClassificationResult) => {
  if (classification.riskScore >= 11) {
    return 'Terminal'
  }

  if (classification.riskScore >= 8) {
    return 'Severe'
  }

  if (classification.riskScore >= 5) {
    return 'Elevated'
  }

  if (classification.riskScore >= 2) {
    return 'Guarded'
  }

  return 'Low'
}

/** SCP Object Class for print document: Safe / Euclid / Keter */
export const getObjectClass = (
  classification: ClassificationResult,
  containmentStatus?: ContainmentStatus | null
): string => {
  if (classification.status === 'Terminated' || containmentStatus === 'Terminated') {
    return 'Safe'
  }
  if (containmentStatus === 'Escaped' || classification.status === 'Critical' || classification.riskScore >= 8) {
    return 'Keter'
  }
  if (
    containmentStatus === 'Threat' ||
    containmentStatus === 'Known Threat' ||
    classification.status === 'Contained' ||
    classification.riskScore >= 5
  ) {
    return 'Euclid'
  }
  return 'Safe'
}

export type AssessmentDirective = {
  id: string
  title: string
  detail: string
}

export const buildAssessmentDirectives = (checklist: ZombieChecklist): AssessmentDirective[] => {
  const directives: AssessmentDirective[] = []

  if (!checklist.heartbeatDetected || checklist.heartbeatBpm === 0) {
    directives.push({
      id: 'confirm-vitals',
      title: 'Lockdown and confirm death-state',
      detail: 'Treat the subject as hostile until disproven. Freeze movement, bring a second biometric unit, and prepare immediate hard containment if the absent pulse holds.',
    })
  } else if (checklist.heartbeatBpm < 40 || checklist.heartbeatBpm > 140) {
    directives.push({
      id: 'repeat-heartbeat',
      title: 'Escalate abnormal vitals',
      detail: 'Do not clear the subject. Re-run pulse verification under armed watch and hold transport until the reading is confirmed stable.',
    })
  }

  if (checklist.pupilState === 'Clouded' || checklist.pupilState === 'Non-reactive') {
    directives.push({
      id: 'pupil-check',
      title: 'Ocular anomaly containment',
      detail: 'Assume neurological compromise. Control lighting, keep weapons ready, and document ocular response before any movement order is given.',
    })
  }

  if (checklist.temperatureC < 35) {
    directives.push({
      id: 'temperature-hypo',
      title: 'Hypothermic death-state confirmation',
      detail: 'Core temperature is critically low. Confirm death-state with secondary thermal unit. This reading is consistent with post-mortem reanimation.',
    })
  } else if (checklist.temperatureC >= 39.5) {
    directives.push({
      id: 'temperature',
      title: 'Biological threat response',
      detail: 'Isolate immediately, seal PPE, and prepare pathogen screening as if exposure has already occurred. No unnecessary contact.',
    })
  } else if (checklist.temperatureC >= 38.5) {
    directives.push({
      id: 'temperature-fever',
      title: 'Fever isolation protocol',
      detail: 'Elevated temperature indicates active infection risk. Isolate the subject and prepare secondary screening.',
    })
  }

  if (checklist.emfLevel === 'High' || checklist.emfLevel === 'Extreme') {
    directives.push({
      id: 'emf',
      title: 'Anomalous signature suppression',
      detail: 'Move the subject to a shielded zone under escort and repeat the EMF scan. Do not release the subject back into open circulation.',
    })
  }

  if (checklist.symptoms.aggression || checklist.symptoms.violentResponse) {
    directives.push({
      id: 'restraint',
      title: 'Hostile restraint posture',
      detail: 'Assume attack intent. Maintain distance, stage restraints now, and keep two armed personnel within immediate response range.',
    })
  }

  if (checklist.symptoms.decay || checklist.symptoms.abnormalOdor) {
    directives.push({
      id: 'biohazard',
      title: 'Biohazard quarantine procedure',
      detail: 'Seal the scene, bag all contaminated material, and run full biohazard chain-of-custody. Treat fluid exposure as a containment breach.',
    })
  }

  if (checklist.symptoms.incoherentSpeech || checklist.symptoms.aversionToLight) {
    directives.push({
      id: 'interview',
      title: 'Restricted interrogation only',
      detail: 'Keep verbal contact short, scripted, and recorded. Do not allow the subject to control pace, proximity, or environment.',
    })
  }

  const activeSymptoms = Object.values(checklist.symptoms).filter(Boolean).length
  if (activeSymptoms >= 3) {
    directives.push({
      id: 'cluster',
      title: 'Containment team mobilization',
      detail: 'Multiple zombie markers are active. Call containment support now and shorten reassessment to no more than every 15 minutes.',
    })
  }

  return directives
}

export const calculateInfectionProbability = (checklist: ZombieChecklist): number => {
  let score = 0
  /* Base scale; symptoms are weighted heavily (4 pts each) so any symptom raises risk % more */
  const MAX = 35

  if (!checklist.heartbeatDetected || checklist.heartbeatBpm === 0) score += 6
  else if (checklist.heartbeatBpm < 40 || checklist.heartbeatBpm > 140) score += 2

  if (checklist.temperatureC < 35) score += 3
  else if (checklist.temperatureC >= 39.5) score += 2
  else if (checklist.temperatureC < 36.5 || checklist.temperatureC > 37.5) score += 1

  if (checklist.pupilState === 'Non-reactive') score += 3
  else if (checklist.pupilState === 'Clouded') score += 2

  if (checklist.emfLevel === 'Extreme') score += 4
  else if (checklist.emfLevel === 'High') score += 2

  const activeSymptoms = Object.values(checklist.symptoms).filter(Boolean).length
  score += activeSymptoms * 4

  if (
    (!checklist.heartbeatDetected || checklist.heartbeatBpm === 0) &&
    (checklist.pupilState === 'Non-reactive' || checklist.pupilState === 'Clouded') &&
    (checklist.emfLevel === 'High' || checklist.emfLevel === 'Extreme')
  ) {
    score += 5
  }

  return Math.min(100, Math.round((score / MAX) * 100))
}

export type TempRange = {
  id: string
  label: string
  subtitle: string
  value: number
  severity: 'danger' | 'warning' | 'normal'
}

export const temperatureRanges: TempRange[] = [
  { id: 'hypothermic', label: 'Hypothermic', subtitle: '< 35°C', value: 33.0, severity: 'danger' },
  { id: 'below-normal', label: 'Below Normal', subtitle: '35 – 36.4°C', value: 35.5, severity: 'warning' },
  { id: 'normal', label: 'Normal', subtitle: '36.5 – 37.5°C', value: 36.8, severity: 'normal' },
  { id: 'elevated', label: 'Elevated', subtitle: '37.6 – 38.4°C', value: 38.0, severity: 'warning' },
  { id: 'fever', label: 'Fever', subtitle: '38.5 – 39.4°C', value: 39.0, severity: 'warning' },
  { id: 'high-fever', label: 'High Fever', subtitle: '≥ 39.5°C', value: 40.0, severity: 'danger' },
]

export const tempRangeWarnings: Record<string, { title: string; detail: string }> = {
  hypothermic: {
    title: 'HYPOTHERMIC — CRITICAL BODY TEMPERATURE',
    detail: 'Core temperature is dangerously low. This is consistent with reanimation or post-mortem state. Initiate thermal biometric confirmation immediately.',
  },
  'below-normal': {
    title: 'BELOW NORMAL TEMPERATURE',
    detail: 'Core temperature is below expected range. Monitor for continued drop. May indicate early-stage metabolic failure or circulatory shutdown.',
  },
  elevated: {
    title: 'ELEVATED TEMPERATURE',
    detail: 'Above-normal temperature detected. Possible pathogenic infection or active immune response to anomalous exposure.',
  },
  fever: {
    title: 'FEVER DETECTED',
    detail: 'Significant fever recorded. Possible active infection or SCP-linked pathogenic response. Isolate and prepare pathogen screening.',
  },
  'high-fever': {
    title: 'HIGH FEVER — BIOHAZARD ALERT',
    detail: 'Extreme temperature reading. Treat as active biological threat. Full PPE required. Isolate immediately and initiate cooling protocol.',
  },
}

export const emfWarnings: Record<string, { title: string; detail: string }> = {
  High: {
    title: 'HIGH EMF — ANOMALOUS SIGNATURE',
    detail: 'Elevated electromagnetic field detected around the subject. This is a known SCP marker. Move to a shielded area and re-test with a calibrated scanner.',
  },
  Extreme: {
    title: 'EXTREME EMF — CONTAINMENT REQUIRED',
    detail: 'Extreme anomalous electromagnetic signature detected. Escalate directly to SCP containment protocol. Do not release the subject. Armed escort mandatory.',
  },
}

export const getTempRangeForValue = (tempC: number): TempRange | undefined =>
  temperatureRanges.find((r) => {
    if (r.id === 'hypothermic') return tempC < 35
    if (r.id === 'below-normal') return tempC >= 35 && tempC < 36.5
    if (r.id === 'normal') return tempC >= 36.5 && tempC <= 37.5
    if (r.id === 'elevated') return tempC > 37.5 && tempC < 38.5
    if (r.id === 'fever') return tempC >= 38.5 && tempC < 39.5
    if (r.id === 'high-fever') return tempC >= 39.5
    return false
  })

export const symptomWarnings: Record<string, { title: string; detail: string }> = {
  aggression: {
    title: 'AGGRESSION DETECTED',
    detail: 'Subject shows hostile behavior. Maintain armed distance. Do not turn your back on the subject.',
  },
  decay: {
    title: 'VISIBLE DECAY',
    detail: 'Tissue decomposition observed. Biohazard protocols engaged. Seal PPE and avoid all fluid contact.',
  },
  incoherentSpeech: {
    title: 'INCOHERENT SPEECH',
    detail: 'Neurological compromise likely. Restrict verbal engagement. Record all vocalizations for analysis.',
  },
  violentResponse: {
    title: 'VIOLENT RESPONSE',
    detail: 'Subject responds with violence to stimuli. Stage restraints immediately. Two armed personnel minimum.',
  },
  aversionToLight: {
    title: 'LIGHT AVERSION',
    detail: 'Photophobic response detected. This is a known zombie marker. Control environment lighting.',
  },
  abnormalOdor: {
    title: 'ABNORMAL ODOR',
    detail: 'Necrotic or anomalous scent detected. Possible active decomposition. Full biohazard lockdown.',
  },
}

export type ContainmentOption = {
  id: ContainmentStatus
  label: string
  subtitle: string
  severity: 'normal' | 'warning' | 'danger'
}

export const containmentOptions: ContainmentOption[] = [
  { id: 'Normal', label: 'Normal', subtitle: 'Standard observation. No containment needed.', severity: 'normal' },
  { id: 'Contained', label: 'Contained', subtitle: 'Subject is secured in an SCP holding area.', severity: 'warning' },
  { id: 'Threat', label: 'Threat', subtitle: 'Active threat designation. Armed personnel required.', severity: 'danger' },
  { id: 'Known Threat', label: 'Known Threat', subtitle: 'Previously confirmed hostile. Maximum security posture.', severity: 'danger' },
  { id: 'Escaped', label: 'Escaped', subtitle: 'Subject has broken containment. Pursue and recapture immediately.', severity: 'danger' },
  { id: 'Terminated', label: 'Terminated', subtitle: 'Subject terminated. No longer a threat.', severity: 'normal' },
]

export type VariantOption = {
  id: ZombieVariant
  label: string
  subtitle: string
  severity: 'normal' | 'warning' | 'danger'
}

export const variantOptions: VariantOption[] = [
  { id: 'Normal', label: 'Normal', subtitle: 'Standard subject. No variant markers.', severity: 'normal' },
  { id: 'Walker', label: 'Walker', subtitle: 'Slow reanimated type. Low mobility, high persistence.', severity: 'warning' },
  { id: 'Runner', label: 'Runner', subtitle: 'Fast reanimated type. Enhanced motor function. Dangerous in open ground.', severity: 'warning' },
  { id: 'Alpha', label: 'Alpha (EXTREME THREAT)', subtitle: 'Pack leader variant. Enhanced cognition and aggression. Do NOT engage alone.', severity: 'danger' },
  { id: 'Gate Breaker', label: 'Gate Breaker', subtitle: 'Siege variant. Capable of breaching containment barriers. Reinforce all structures.', severity: 'danger' },
]

export const containmentProcedures: Record<string, { title: string; detail: string; steps: string[] }> = {
  Contained: {
    title: 'SUBJECT IN CONTAINMENT',
    detail: 'This subject is secured in an SCP holding area. Maintain current protocols.',
    steps: [
      'Verify containment seals every 4 hours.',
      'Log all personnel entering the containment zone.',
      'Do not alter sedation levels without authorization.',
      'Report any behavioral changes immediately.',
    ],
  },
  Threat: {
    title: 'ACTIVE THREAT — ARMED RESPONSE REQUIRED',
    detail: 'This subject has been designated an active threat. Lethal-force authorization may be in effect.',
    steps: [
      'Maintain armed distance at all times.',
      'Two armed personnel minimum for any interaction.',
      'Do not approach without lethal-force clearance.',
      'Prepare tranquilizer and restraint kits within reach.',
      'Alert command if behavior escalates.',
    ],
  },
  'Known Threat': {
    title: 'KNOWN THREAT — MAXIMUM SECURITY',
    detail: 'Subject has confirmed hostile history. Full containment team required.',
    steps: [
      'Full tactical gear mandatory for all personnel.',
      'Shoot-on-sight authorization may apply — verify with command.',
      'No solo interactions under any circumstances.',
      'Maintain 24/7 surveillance with redundant feeds.',
      'Pre-stage extraction team at all exits.',
    ],
  },
  Escaped: {
    title: 'CONTAINMENT BREACH — IMMEDIATE ACTION',
    detail: 'Subject has broken containment. All nearby installations are on high alert.',
    steps: [
      'Lock down all exits in the facility immediately.',
      'Deploy pursuit teams with live tracking.',
      'Alert all nearby SCP installations.',
      'Evacuate non-essential personnel from the sector.',
      'Establish a 2 km perimeter and sweep inward.',
      'Notify field command and request aerial support.',
    ],
  },
}

export const containmentWarnings: Record<string, { title: string; detail: string }> = {
  Threat: {
    title: 'THREAT DESIGNATION ACTIVE',
    detail: 'This subject is now classified as an active threat. All personnel must maintain armed distance. Do not approach without lethal-force authorization.',
  },
  'Known Threat': {
    title: 'KNOWN THREAT — MAXIMUM ALERT',
    detail: 'Subject has a confirmed hostile history. Full containment team required for any interaction. Shoot-on-sight authorization may apply.',
  },
  Escaped: {
    title: 'CONTAINMENT BREACH — SUBJECT ESCAPED',
    detail: 'Subject has broken containment. All exits must be locked down immediately. Pursuit teams deploy now. Alert all nearby SCP installations.',
  },
}

export const variantWarnings: Record<string, { title: string; detail: string }> = {
  Alpha: {
    title: 'ALPHA VARIANT — EXTREME THREAT',
    detail: 'This subject is classified as an Alpha. Enhanced cognition, aggression, and leadership capability. Full tactical response team required. Do NOT engage alone under any circumstances.',
  },
  'Gate Breaker': {
    title: 'GATE BREAKER VARIANT — STRUCTURAL THREAT',
    detail: 'Subject is capable of breaching reinforced containment. All barriers must be doubled. Engineering teams on standby. Evacuate non-essential personnel from adjacent sectors.',
  },
  Runner: {
    title: 'RUNNER VARIANT — HIGH MOBILITY',
    detail: 'Subject exhibits enhanced motor function. Standard perimeter distances are insufficient. Deploy vehicle-mounted teams and expand containment radius.',
  },
}
