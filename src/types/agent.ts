import { z } from 'zod'

export const TASK_FORCE_UNIT_OPTIONS = [
  { value: 'MTF Alpha-1 (Red Right Hand)', label: 'MTF Alpha-1 "Red Right Hand"' },
  { value: 'MTF Alpha-4 (Pony Express)', label: 'MTF Alpha-4 "Pony Express"' },
  { value: 'MTF Beta-1 (Cauterizers)', label: 'MTF Beta-1 "Cauterizers"' },
  { value: 'MTF Beta-7 (Maz Hatters)', label: 'MTF Beta-7 "Maz Hatters"' },
  { value: 'MTF Epsilon-11 (Nine-Tailed Fox)', label: 'MTF Epsilon-11 "Nine-Tailed Fox"' },
  { value: 'MTF Nu-7 (Hammer Down)', label: 'MTF Nu-7 "Hammer Down"' },
  { value: 'MTF Zeta-9 (Mole Rats)', label: 'MTF Zeta-9 "Mole Rats"' },
  { value: 'MTF Zeta-1 (Reclaimers)', label: 'MTF Zeta-1 "Reclaimers"' },
] as const

export const TASK_FORCE_UNIT_VALUES = TASK_FORCE_UNIT_OPTIONS.map((o) => o.value)
export type TaskForceUnitValue = (typeof TASK_FORCE_UNIT_VALUES)[number]

export const CLEARANCE_LEVEL_OPTIONS = ['1', '2', '3', '4', '5', '6'] as const
export type ClearanceLevelValue = (typeof CLEARANCE_LEVEL_OPTIONS)[number]

const taskForceUnitSchema = z.enum(
  TASK_FORCE_UNIT_VALUES as unknown as [string, ...string[]],
  { message: 'Task force unit must be selected from the list.' },
)
const clearanceLevelSchema = z.enum(CLEARANCE_LEVEL_OPTIONS as unknown as [string, ...string[]], {
  message: 'Clearance level must be 1–6.',
})

export const agentProfileSchema = z.object({
  agentName: z.string().trim().min(2, 'Agent name is required.').max(120),
  callsign: z.string().trim().min(2, 'Callsign is required.').max(40),
  taskForceUnit: taskForceUnitSchema,
  clearanceLevel: clearanceLevelSchema,
})

export type AgentProfile = z.infer<typeof agentProfileSchema>

export const reportingAgentSchema = z.object({
  agentName: z.string().trim().min(2).max(120),
  callsign: z.string().trim().min(2).max(40),
  taskForceUnit: z.string().trim().min(2).max(80),
})

export type ReportingAgent = z.infer<typeof reportingAgentSchema>

export const defaultAgentProfile = (): AgentProfile => ({
  agentName: '',
  callsign: '',
  taskForceUnit: 'MTF Nu-7 (Hammer Down)',
  clearanceLevel: '3',
})

export const defaultReportingAgent = (): ReportingAgent => ({
  agentName: 'Unassigned Agent',
  callsign: 'N/A',
  taskForceUnit: 'SCP Task Force',
})

export const profileToReportingAgent = (profile: AgentProfile): ReportingAgent => ({
  agentName: profile.agentName,
  callsign: profile.callsign,
  taskForceUnit: profile.taskForceUnit,
})
