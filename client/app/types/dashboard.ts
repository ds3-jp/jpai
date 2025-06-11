export interface DashboardStats {
  totalPhoneNumbers: number
  connectionRate: number
  totalConnectedNumbers: number
  totalCallDuration: number
  averageCallDuration: number
}

export interface DashboardFilters {
  dateRange: string
  agentId: string
  batchId: string
}

export interface EvaluationCriteriaResult {
  result: 'success' | 'failure' | 'unknown'
  count: number
  fill: string
}

export interface CallOutcomeResult {
  outcome: string
  count: number
  fill: string
}

export interface NameVerificationResult {
  status: 'Match' | 'No Match' | 'Partial Match' | 'None'
  count: number
}

export interface ICVerificationResult {
  status: 'Match' | 'No Match' | 'None'
  count: number
}

export interface DashboardChartData {
  evaluationResults: EvaluationCriteriaResult[]
  callOutcomes: CallOutcomeResult[]
  nameVerification: NameVerificationResult[]
  icVerification: ICVerificationResult[]
}

export interface DashboardData {
  stats: DashboardStats
  chartData: DashboardChartData
}

export interface DashboardParams {
  filters?: DashboardFilters
}

export interface CallDataRecord {
  recipient_id: string
  conversation_id: string | null
  batch_id: string | null
  agent_id: string | null
  event_timestamp: number | null
  evaluation_criteria_results: any | null
  data_collection_results: any | null
  transcript: any | null
  call_success: string | null
  call_duration: number | null
  twilio_id: string | null
  dynamic_variables: any | null
  call_status: string | null
}