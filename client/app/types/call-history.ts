export interface CallRecord {
  recipient_id: string
  conversation_id: string | null
  batch_id: string | null
  agent_id: string | null
  event_timestamp: number // Unix timestamp
  evaluation_criteria_results: any | null
  data_collection_results: {
    nameVerified?: {
      value: string
      rationale: string
      json_schema: any
      data_collection_id: string
    }
    icVerified?: {
      value: string
      rationale: string
      json_schema: any
      data_collection_id: string
    }
    callOutcome?: {
      value: string
      rationale: string
      json_schema: any
      data_collection_id: string
    }
    [key: string]: any
  } | null
  transcript: any | null
  call_success: string | null
  call_duration: number | null
  twilio_id: string | null
  dynamic_variables: {
    FullName?: string
    [key: string]: any
  } | null
  call_status: string | null
}

export interface CallFilters {
  status: string
  dateRange: string
  agentId: string
  nameVerified?: string
  icVerified?: string
  callOutcome?: string
  twilioStatus?: string
}

export interface CallHistoryResponse {
  calls: CallRecord[]
  totalCount: number
}

export interface CallHistoryParams {
  page: number
  limit: number
  search?: string
  filters?: CallFilters
}

export interface CallDetails extends CallRecord {
  recording_url?: string
  full_transcript?: string
}

export type NameVerificationStatus = 'Match' | 'Partial Match' | 'No Match' | 'None'
export type ICVerificationStatus = 'Match' | 'No Match' | 'None'
export type CallOutcomeStatus = 'success' | 'incomplete' | 'unsuccessful' | 'busy' | 'line issue' | 'user silent' | 'voicemail' | 'wrong number' | 'failed' | 'unknown' | 'None'

// Common Twilio call statuses
export type TwilioCallStatus = 
  | 'completed'
  | 'busy'
  | 'canceled'
  | 'failed'
  | 'no-answer'
  | 'queued'
  | 'ringing'
  | 'in-progress'