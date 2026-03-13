/**
 * Humorous copy for badge display only (standalone badge page + export modal).
 * Varying degrees of dark humor by infection %, containment, and cleared state.
 * Critical/high severity uses hostile termination copy only.
 * Optional seed gives deterministic pick per badge.
 */

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return h
}

function pick(lines: string[], seed?: string): string {
  if (seed != null) return lines[Math.abs(hashCode(seed)) % lines.length]!
  return lines[Math.floor(Math.random() * lines.length)]!
}

/* --- Infection humor (warning/cleared: funny; critical: hostile) --- */

const INFECTION_90_PLUS = [
  "We're not saying run. We're saying we won't ask why you did.",
  "At this percentage we stop using words like 'patient' and start using 'target'.",
  "Your brain has essentially sent its resignation. We've accepted it.",
  "The good news: you're in our top tier. The bad news: it's the 'do not revive' tier.",
  "We've seen less decay on week-old cafeteria meat. No offense.",
  "If consciousness were a ship, yours has left the harbor. And sunk.",
  "Congratulations on achieving 'statistically a zombie.' We're not throwing a party.",
]

const INFECTION_81_89 = [
  "Congratulations! You've unlocked: TERMINATE ON SIGHT. (We're not happy about it either.)",
  "You've graduated from 'maybe fine' to 'definitely not fine.' No diploma.",
  "This is the percentage where we stop making eye contact and start making plans.",
  "Your file just got moved to the 'read in a hazmat suit' folder.",
  "We're not saying you're the reason we have a 'rapid response' budget. We're just not not saying it.",
  "At 81% we recommend not making any long-term commitments. Or short-term. Or any.",
]

const INFECTION_70_80 = [
  "Your brain is basically on a countdown. We recommend not making long-term plans.",
  "More 'undead' than 'unwell' at this point. We have a pamphlet.",
  "This is the 'we're not mad, we're disappointed' zone. Also a bit mad.",
  "You've entered the danger zone. No Kenny Loggins, just containment protocols.",
  "At 70% we stop asking 'how are you?' and start asking 'where are the exits?'",
  "Your neurons are filing for divorce. We're not mediating.",
]

const INFECTION_60_69 = [
  "More than half zombie. Less than half 'person who gets to keep their parking spot.'",
  "You're in the 'we'll call you' zone. We won't. We'll contain you.",
  "The needle's past 'concerning' and into 'we have a form for this.'",
  "At 60% we recommend updating your will. And not breathing on anyone.",
  "You've crossed the 'probably fine' line. You're in 'probably not' territory.",
]

const INFECTION_50_59 = [
  "You're in the 'maybe' zone. We'll keep the flamethrower warm just in case.",
  "Fifty-fifty: half of you is still you. The other half is... scheduling a follow-up.",
  "We're not saying you're a risk. We're saying we've already assigned you a risk number.",
  "At 50% we switch from 'get well soon' cards to 'get contained soon' cards.",
  "Congratulations, you're officially in the gray area. It's not a fun area.",
  "The coin has been flipped. We're not telling you which side you're on. (You're tails.)",
]

const CRITICAL_INFECTION_90 = [
  "Subject designated for termination. Do not approach. Lethal force authorized.",
  "Containment class: maximum. You are not cleared. You will not be cleared.",
  "At this level you are considered host. Lethal neutralization authorized.",
]

const CRITICAL_INFECTION_70 = [
  "Containment breach imminent. You are not cleared. You are being terminated.",
  "Infection threshold exceeded. This document authorizes lethal response.",
  "You are designated K-class. Do not approach. Termination in progress.",
]

const CRITICAL_INFECTION_50 = [
  "Infection level exceeds threshold. This document authorizes your termination.",
  "You have exceeded acceptable parameters. Compliance is no longer an option.",
]

export function getInfectionHumor(
  pct: number,
  severity?: 'critical' | 'warning' | 'cleared' | 'terminated',
  seed?: string,
): string | null {
  if (pct < 50) return null
  if (severity === 'critical') {
    if (pct >= 90) return pick(CRITICAL_INFECTION_90, seed)
    if (pct >= 70) return pick(CRITICAL_INFECTION_70, seed)
    if (pct >= 50) return pick(CRITICAL_INFECTION_50, seed)
    return null
  }
  if (pct >= 90) return pick(INFECTION_90_PLUS, seed)
  if (pct >= 81) return pick(INFECTION_81_89, seed)
  if (pct >= 70) return pick(INFECTION_70_80, seed)
  if (pct >= 60) return pick(INFECTION_60_69, seed)
  if (pct >= 50) return pick(INFECTION_50_59, seed)
  return null
}

/* --- Symptom dark jokes --- */

const SYMPTOM_DARK_JOKES = [
  "If you're reading this and you're the subject: that smell isn't the facility.",
  "Decay happens. So do we. (We mean the response team.)",
  "Remember: 'aggressive' is just 'hangry' with fewer rights.",
  "Light aversion: either you're a zombie or you had a really long night. One gets contained.",
  "That odor has been reported. So has your position.",
  "Incoherent speech is fine at parties. Here it gets you a cell.",
  "Violent response to stimuli? Same. (Ours is protocol.)",
  "If you're craving brains, we have a pamphlet. And a tranq dart.",
  "Moaning is not an approved form of communication. We have a form for that.",
  "Your gait has been noted. So has your eligibility for containment.",
  "That skin tone isn't in our 'probably fine' range. We have charts.",
  "We've classified your behavior as 'aggressive.' You've been classified as 'contained.'",
  "Loss of motor control? We have a room for that. Several, actually.",
  "If you're reading this and you're the subject: please stop. You're supposed to be contained.",
  "That hunger isn't normal. Neither is our response to it. Fair's fair.",
  "We've seen that look before. It's in the manual. Page 47: 'Terminate.'",
  "Your reflexes have been logged. So has your new address. (It's a cell.)",
  "Unresponsive to verbal commands? We have non-verbal commands. They're very persuasive.",
  "That growl has been added to your file. So has your containment order.",
  "We don't judge. We assess. And then we contain. It's a process.",
  "Your vital signs have been noted. So have our 'response' options.",
  "Confusion is normal. What you're experiencing is not. We have a cell for not-normal.",
  "If you're wondering why everyone's backing away: see your infection percentage.",
  "That shuffle isn't a dance. We've checked. Multiple times.",
  "We've upgraded your status from 'patient' to 'subject.' It's not a promotion.",
]

export function getSymptomDarkJoke(seed?: string): string {
  return pick(SYMPTOM_DARK_JOKES, seed)
}

/* --- Containment humor --- */

const NORMAL_CONTAINMENT = [
  "You're not contained. You're just... observed. (We have a form for that.)",
  "Normal containment means we're watching. From several angles. With cameras.",
  "You're in the 'we'll call you' tier. We might. We probably won't.",
  "Observation status: we see you. We see everything. (We have a form for that.)",
]

const CONTAINED_FUNNY = [
  "You've achieved 'room with a view' — the view is our guns. Stay cozy.",
  "Contained: when 'time out' gets a budget and a security detail.",
  "Your new room has walls. And guards. And a very strict checkout policy.",
  "We've given you a dedicated space. And a dedicated team to make sure you stay in it.",
  "Containment isn't punishment. It's just... permanent observation. With locks.",
  "You've been upgraded to 'secured guest.' Don't let the title fool you.",
  "Your room comes with complimentary monitoring. 24/7. Forever.",
]

const THREAT_FUNNY = [
  "We're not saying you're the reason we have a 'threat' budget. We're not not saying it.",
  "Threat level: yes. We have a whole department for 'yes.'",
  "You've been classified as 'the reason we can't have nice things.'",
  "Our threat assessment team has a folder. It has your name on it. It's not thin.",
  "We don't use the T-word lightly. We're using it. Heavily.",
]

const KNOWN_THREAT_FUNNY = [
  "Your file has its own filing cabinet. And its own security clearance.",
  "Known threat means we've met. We remember. We're not happy about it.",
  "You've graduated from 'threat' to 'known threat.' There's no ceremony. There is a cell.",
  "We have a list. You're on it. It's not the good list.",
  "Your designation comes with benefits. None of them are good.",
]

const ESCAPED_FUNNY = [
  "So you left. We have drones. And feelings. (Mostly the drones.)",
  "Escape noted. So is your new status: 'find on sight.'",
  "You left. We're not over it. We have a team. They're also not over it.",
  "Your vacation has been logged. So has your warrant. Welcome back (eventually).",
  "We have a saying: 'You can check out any time you like, but you can never leave.' We meant the facility.",
]

const CRITICAL_KNOWN_THREAT = [
  "Designation: known threat. You are not leaving this facility. Termination is authorized.",
  "Known threat status: you are not cleared. You will not be cleared. Lethal force authorized.",
]

const CRITICAL_ESCAPED = [
  "Escape attempt logged. You are now designated terminate on sight. Do not return.",
  "You left. Do not come back. If you do, we have instructions. They're not friendly.",
]

const CRITICAL_CONTAINED = [
  "You are contained. Your termination is pending. Do not expect clemency.",
  "Contained pending termination. You will not be released. Compliance is not optional.",
]

const CRITICAL_CONTAINMENT_DEFAULT = [
  "Containment protocol active. You are not cleared. Compliance is not optional.",
  "You are not cleared. Do not approach personnel. Do not resist.",
]

export function getContainmentHumor(
  status: string,
  severity?: 'critical' | 'warning' | 'cleared' | 'terminated',
  seed?: string,
): string | null {
  if (status === 'Normal' && (severity === 'warning' || severity === 'critical')) {
    return null
  }
  if (severity === 'critical') {
    switch (status) {
      case 'Known Threat':
        return pick(CRITICAL_KNOWN_THREAT, seed)
      case 'Escaped':
        return pick(CRITICAL_ESCAPED, seed)
      case 'Threat':
      case 'Contained':
        return pick(CRITICAL_CONTAINED, seed)
      default:
        return pick(CRITICAL_CONTAINMENT_DEFAULT, seed)
    }
  }
  if (status === 'Normal') {
    return pick(NORMAL_CONTAINMENT, seed)
  }
  switch (status) {
    case 'Contained':
      return pick(CONTAINED_FUNNY, seed)
    case 'Threat':
      return pick(THREAT_FUNNY, seed)
    case 'Known Threat':
      return pick(KNOWN_THREAT_FUNNY, seed)
    case 'Escaped':
      return pick(ESCAPED_FUNNY, seed)
    default:
      return "Containment status: [REDACTED FOR COMEDY]"
  }
}

/* --- Critical termination (hostile) --- */

const CRITICAL_TERMINATION_LINES = [
  "You are not cleared. You are being terminated. Do not resist.",
  "Subject designated for termination. Lethal force authorized. This is your only notice.",
  "Containment protocol: you are not leaving. We are terminating you.",
  "Your status is critical. We are terminating you. Compliance is not an option.",
  "This document authorizes your termination. You are not cleared. Do not approach.",
  "You have exceeded acceptable parameters. Lethal neutralization is authorized.",
  "Do not approach personnel. Do not resist. You are being terminated.",
  "Termination protocol active. This is not a drill. You are not cleared.",
  "Your designation: K-class. Our response: authorized. Do not resist.",
  "This badge authorizes your termination. You are not leaving this facility alive.",
]

export function getCriticalTerminationCopy(seed?: string): string {
  return pick(CRITICAL_TERMINATION_LINES, seed)
}

/* --- Cleared congrats --- */

const CLEARED_CONGRATS = [
  "Congrats! We're not killing you today. Now move along.",
  "Cleared. You get to leave. We get to file this. Everyone wins (for now).",
  "Verdict: probably still human. Please exit before we change our minds.",
  "You passed! Do not collect 200 dollars. Do collect your belongings and leave.",
  "We're not saying we're surprised. We're just saying don't push it.",
  "Cleared. You may now resume your life. We'll be watching. (We're always watching.)",
  "Congratulations! You're in the 'probably not a zombie' club. Membership is free. Leave now.",
  "You've been cleared. Please exit the facility before we run more tests. So many tests.",
  "Verdict: human enough. We have a certificate. It says 'leave.'",
  "You passed our extremely low bar. Don't celebrate too hard. We're still watching.",
  "Cleared. We're not killing you. Today. Please don't make us regret it.",
  "You're free to go. We're free to change our minds. Don't give us a reason.",
  "Status: probably fine. Recommendation: leave before 'probably' becomes 'maybe not.'",
  "We've decided you can go. This decision is subject to change. Frequently.",
  "Cleared! No confetti. No ceremony. Just leave. Slowly.",
  "You've been deemed 'not our problem anymore.' Please keep it that way.",
  "Verdict: still human. Marginally. Now exit before we double-check.",
  "Congratulations on not being terminated. We don't say that to everyone. (We say it to almost everyone who's cleared.)",
  "You're cleared. We're relieved. Everyone wins. Now go.",
]

export function getClearedCongrats(seed?: string): string {
  return pick(CLEARED_CONGRATS, seed)
}

/* --- Status humor --- */

const OBSERVATION_FUNNY = [
  "We're watching. Not in a creepy way. (It's a little creepy.)",
  "Observation status: we see you. We see everything. We have notes.",
  "You're in the 'we're keeping an eye on you' program. We have many eyes.",
  "Observation means we care. So much. From a distance. With cameras.",
  "We're not saying we don't trust you. We're saying we have a file. It's detailed.",
]

const SUSPECTED_FUNNY = [
  "We suspect you. You might suspect us. It's mutual.",
  "Suspected: we have questions. You have a badge. We have more questions.",
  "You're in the 'we're watching closely' tier. Very closely.",
  "We don't like to accuse. We do like to observe. Heavily.",
  "Suspected status: we're not saying you did anything. We're not not saying it.",
]

const CONTAINED_STATUS_FUNNY = [
  "Contained: when 'time out' gets a budget and a security detail.",
  "You've been given a room. And a schedule. And no say in either.",
  "Contained means we've made decisions for you. You'll find out what they are. In your room.",
  "We've secured you for your safety. And ours. Mostly ours.",
]

const CRITICAL_STATUS_FUNNY = [
  "Critical. So is our coffee supply. One of these we can fix.",
  "Your status is critical. So is our response. So is our budget. So is this situation.",
  "We've upgraded you to 'critical.' It's not an upgrade. It's a classification.",
  "Critical status: we've moved you to the 'we need to talk' list. It's a long list.",
]

const CRITICAL_TERMINATION_STATUS = [
  "Your status is critical. We are terminating you. This is not negotiable.",
  "Critical designation: you are not cleared. Termination authorized.",
]

const CRITICAL_CONTAINED_STATUS = [
  "Contained pending termination. You will not be released.",
  "You are contained. You will remain contained. Permanently.",
]

const CRITICAL_SUSPECTED_STATUS = [
  "Elevated to termination protocol. You are not cleared. Do not approach personnel.",
  "Your status has been upgraded. So has our response. Neither is good for you.",
]

const TERMINATED_STATUS_LINES = [
  'Subject terminated. No longer a threat.',
  'Case closed. No further action required.',
  'Threat neutralized. File archived.',
  'Task force reports: we are done here. Literally.',
  'Containment protocol complete. We ran out of things to contain.',
  'Subject has been filed under "resolved." Do not reopen.',
  'The SCP definition of a good day: one less thing on the board.',
  'Termination paperwork signed in triplicate. We kept a copy.',
  'Field team says thanks for not making us fill out the escape report.',
  'No longer a threat. We checked. Twice. Then had coffee.',
  'Archived. If you need this subject again, submit Form 7-X.',
  'Case closed. The only thing escalating now is our satisfaction.',
  'Threat level: zero. Same as our tolerance for follow-ups.',
  'Subject status: terminated. Our status: relieved.',
  'Containment successful. By which we mean permanently successful.',
  'File closed. Do not resuscitate. Do not reassess. Do not call us.',
  'Mission accomplished. The boring kind. We prefer the boring kind.',
  'Subject is no longer in the building. Or anywhere. Problem solved.',
  'Termination complete. Please direct all further inquiries to the shredder.',
  'We have achieved the only outcome that doesn’t require more paperwork.',
]

export function getStatusHumor(
  status: string,
  severity?: 'critical' | 'warning' | 'cleared' | 'terminated',
  seed?: string,
): string | null {
  if (status === 'Terminated') return pick(TERMINATED_STATUS_LINES, seed)
  if (status === 'Cleared') return null
  if (severity === 'critical') {
    switch (status) {
      case 'Critical':
        return pick(CRITICAL_TERMINATION_STATUS, seed)
      case 'Contained':
        return pick(CRITICAL_CONTAINED_STATUS, seed)
      case 'Suspected':
      case 'Observation':
        return pick(CRITICAL_SUSPECTED_STATUS, seed)
      default:
        return "Subject marked for termination. Comply with all instructions."
    }
  }
  switch (status) {
    case 'Observation':
      return pick(OBSERVATION_FUNNY, seed)
    case 'Suspected':
      return pick(SUSPECTED_FUNNY, seed)
    case 'Contained':
      return pick(CONTAINED_STATUS_FUNNY, seed)
    case 'Critical':
      return pick(CRITICAL_STATUS_FUNNY, seed)
    default:
      return null
  }
}

/* --- Print fluff (dossier + badge print) by severity --- */

export type PrintSeverity = 'critical' | 'warning' | 'cleared' | 'terminated'

const PRINT_FLUFF: Record<PrintSeverity, { classificationLine: string; footerLines: string[] }> = {
  cleared: {
    classificationLine: 'CONFIDENTIAL — ROUTINE',
    footerLines: ['Distribution: Authorized field personnel only.', 'Do not duplicate.'],
  },
  warning: {
    classificationLine: 'RESTRICTED — ELEVATED RISK',
    footerLines: ['Handle with care. Do not duplicate. Destroy when superseded.'],
  },
  critical: {
    classificationLine: 'EYES ONLY — TERMINATE ON SIGHT AUTHORIZED',
    footerLines: ['Lethal force authorized. Do not duplicate. Destroy when superseded.'],
  },
  terminated: {
    classificationLine: 'SUBJECT TERMINATED — NO LONGER A THREAT',
    footerLines: ['Case closed. No further action required.', 'Do not duplicate.'],
  },
}

export function getPrintFluff(severity: PrintSeverity): { classificationLine: string; footerLines: string[] } {
  return PRINT_FLUFF[severity]
}
