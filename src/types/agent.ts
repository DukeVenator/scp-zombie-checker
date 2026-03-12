import { z } from 'zod'

export const agentProfileSchema = z.object({
  agentName: z.string().trim().min(2, 'Agent name is required.').max(120),
  callsign: z.string().trim().min(2, 'Callsign is required.').max(40),
  taskForceUnit: z.string().trim().min(2, 'Task force unit is required.').max(80),
  clearanceLevel: z.string().trim().min(1, 'Clearance level is required.').max(20),
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
  taskForceUnit: 'Mobile Task Force',
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
