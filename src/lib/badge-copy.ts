/**
 * Humorous copy for badge display only (standalone badge page + export modal).
 * Varying degrees of dark humor by infection %, containment, and cleared state.
 */

export function getInfectionHumor(pct: number): string | null {
  if (pct < 50) return null
  if (pct >= 90) return "We're not saying run. We're saying we won't ask why you did."
  if (pct >= 81) return "Congratulations! You've unlocked: TERMINATE ON SIGHT. (We're not happy about it either.)"
  if (pct >= 70) return "Your brain is basically on a countdown. We recommend not making long-term plans."
  if (pct >= 60) return "More than half zombie. Less than half 'person who gets to keep their parking spot.'"
  if (pct >= 50) return "You're in the 'maybe' zone. We'll keep the flamethrower warm just in case."
  return null
}

const SYMPTOM_DARK_JOKES = [
  "If you're reading this and you're the subject: that smell isn't the facility.",
  "Decay happens. So do we. (We mean the response team.)",
  "Remember: 'aggressive' is just 'hangry' with fewer rights.",
  "Light aversion: either you're a zombie or you had a really long night. One gets contained.",
  "That odor has been reported. So has your position.",
  "Incoherent speech is fine at parties. Here it gets you a cell.",
  "Violent response to stimuli? Same. (Ours is protocol.)",
]

/** Pick a deterministic "random" joke from subject id so same badge always shows same joke. */
export function getSymptomDarkJoke(seed?: string): string {
  const index = seed ? Math.abs(hashCode(seed)) % SYMPTOM_DARK_JOKES.length : 0
  return SYMPTOM_DARK_JOKES[index]!
}

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return h
}

export function getContainmentHumor(status: string): string {
  switch (status) {
    case 'Normal':
      return "You're not contained. You're just... observed. (We have a form for that.)"
    case 'Contained':
      return "You've achieved 'room with a view' — the view is our guns. Stay cozy."
    case 'Threat':
      return "We're not saying you're the reason we have a 'threat' budget. We're not not saying it."
    case 'Known Threat':
      return "Your file has its own filing cabinet. And its own security clearance."
    case 'Escaped':
      return "So you left. We have drones. And feelings. (Mostly the drones.)"
    default:
      return "Containment status: [REDACTED FOR COMEDY]"
  }
}

export function getClearedCongrats(): string {
  const lines = [
    "Congrats! We're not killing you today. Now move along.",
    "Cleared. You get to leave. We get to file this. Everyone wins (for now).",
    "Verdict: probably still human. Please exit before we change our minds.",
    "You passed! Do not collect 200 dollars. Do collect your belongings and leave.",
  ]
  return lines[Math.floor(Math.random() * lines.length)]!
}

export function getStatusHumor(status: string): string | null {
  if (status === 'Cleared') return null
  switch (status) {
    case 'Observation':
      return "We're watching. Not in a creepy way. (It's a little creepy.)"
    case 'Suspected':
      return "We suspect you. You might suspect us. It's mutual."
    case 'Contained':
      return "Contained: when 'time out' gets a budget and a security detail."
    case 'Critical':
      return "Critical. So is our coffee supply. One of these we can fix."
    default:
      return null
  }
}
