export interface Recipient {
  id: string
  name: string
  phone: string
  [key: string]: any
}

export interface BatchCall {
  id: string
  name: string
  recipients: Recipient[]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: string
  completedAt?: string
  successCount: number
  failureCount: number
  batchSize: number
  intervalMinutes: number
  totalBatches: number
}

export interface CallResult {
  success: boolean
  error?: string
  timestamp: string
}

export interface BatchConfiguration {
  batchSize: number
  intervalMinutes: number
}