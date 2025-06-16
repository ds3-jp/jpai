import { createClient } from '@supabase/supabase-js'
import { 
  DashboardData, 
  DashboardParams, 
  DashboardStats, 
  DashboardChartData,
  CallDataRecord,
  EvaluationCriteriaResult,
  CallOutcomeResult,
  NameVerificationResult,
  ICVerificationResult,
  CallsPerDayResult
} from '@/app/types/dashboard'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export class DashboardService {
  static async getDashboardData(params?: DashboardParams): Promise<DashboardData> {
    try {
      // Get all call data with filters
      const callData = await this.getCallData(params)
      
      // Calculate stats
      const stats = this.calculateStats(callData)
      
      // Prepare chart data
      const chartData = this.prepareChartData(callData)
      
      return {
        stats,
        chartData
      }
    } catch (error) {
      console.error('Error in getDashboardData:', error)
      throw error
    }
  }

  private static async getCallData(params?: DashboardParams): Promise<CallDataRecord[]> {
    try {
      let query = supabase
        .from('call_data')
        .select('*')

      // Apply filters if provided
      if (params?.filters) {
        const { dateRange, agentId, batchId } = params.filters

        // Date range filter
        if (dateRange && dateRange !== 'all') {
          const now = new Date()
          let startDate: Date

          switch (dateRange) {
            case 'today':
              startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
              break
            case 'week':
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
              break
            case 'month':
              startDate = new Date(now.getFullYear(), now.getMonth(), 1)
              break
            case 'quarter':
              startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
              break
            default:
              startDate = new Date(0)
          }

          // Convert to Unix timestamp
          const startUnixTimestamp = Math.floor(startDate.getTime() / 1000)
          query = query.gte('event_timestamp', startUnixTimestamp)
        }

        // Agent filter
        if (agentId && agentId !== 'all') {
          query = query.eq('agent_id', agentId)
        }

        // Batch filter
        if (batchId && batchId !== 'all') {
          query = query.eq('batch_id', batchId)
        }
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch call data: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error in getCallData:', error)
      throw error
    }
  }

  private static calculateStats(callData: CallDataRecord[]): DashboardStats {
    const totalPhoneNumbers = callData.length
    
    // Calculate connection rate (completed / (no-answer + failed + busy + cancelled + completed))
    const completedCalls = callData.filter(call => call.call_status === 'completed').length
    const totalAttempts = callData.filter(call => 
      ['completed', 'no-answer', 'failed', 'busy', 'cancelled'].includes(call.call_status || '')
    ).length
    const connectionRate = totalAttempts > 0 ? (completedCalls / totalAttempts) * 100 : 0
    
    const totalConnectedNumbers = completedCalls
    
    // Calculate total call duration (sum of all call durations)
    const totalCallDuration = callData.reduce((sum, call) => {
      return sum + (call.call_duration || 0)
    }, 0)
    
    // Calculate average call duration (total duration / completed calls)
    const averageCallDuration = completedCalls > 0 ? totalCallDuration / completedCalls : 0

    return {
      totalPhoneNumbers,
      connectionRate: Math.round(connectionRate * 100) / 100, // Round to 2 decimal places
      totalConnectedNumbers,
      totalCallDuration,
      averageCallDuration: Math.round(averageCallDuration * 100) / 100 // Round to 2 decimal places
    }
  }

  private static prepareChartData(callData: CallDataRecord[]): DashboardChartData {
    // Evaluation criteria results
    const evaluationResults = this.getEvaluationResults(callData)
    
    // Call outcomes
    const callOutcomes = this.getCallOutcomes(callData)
    
    // Name verification results
    const nameVerification = this.getNameVerificationResults(callData)
    
    // IC verification results
    const icVerification = this.getICVerificationResults(callData)

    // Calls per day results
    const callsPerDay = this.getCallsPerDayResults(callData)

    return {
      evaluationResults,
      callOutcomes,
      nameVerification,
      icVerification,
      callsPerDay
    }
  }

  private static getEvaluationResults(callData: CallDataRecord[]): EvaluationCriteriaResult[] {
    const results = new Map<string, number>()
    
    callData.forEach(call => {
      if (call.evaluation_criteria_results?.evalcriteria?.result) {
        const result = call.evaluation_criteria_results.evalcriteria.result
        results.set(result, (results.get(result) || 0) + 1)
      }
    })

    return Array.from(results.entries()).map(([result, count]) => ({
      result: result as 'success' | 'unknown' | 'failure',
      count,
      fill: `var(--color-${result})`
    }))
  }

  private static getCallOutcomes(callData: CallDataRecord[]): CallOutcomeResult[] {
    const outcomes = new Map<string, number>()
    
    callData.forEach(call => {
      if (call.data_collection_results?.callOutcome?.value) {
        const outcome = call.data_collection_results.callOutcome.value
        outcomes.set(outcome, (outcomes.get(outcome) || 0) + 1)
      }
    })

    return Array.from(outcomes.entries()).map(([outcome, count], index) => ({
      outcome,
      count,
      fill: `var(--color-outcome-${index + 1})`
    }))
  }

  private static getNameVerificationResults(callData: CallDataRecord[]): NameVerificationResult[] {
    const results = new Map<string, number>()
    
    callData.forEach(call => {
      const status = call.data_collection_results?.nameVerified?.value || 'None'
      results.set(status, (results.get(status) || 0) + 1)
    })

    return Array.from(results.entries()).map(([status, count]) => ({
      status: status as 'Match' | 'No Match' | 'Partial Match' | 'None',
      count
    }))
  }

  private static getICVerificationResults(callData: CallDataRecord[]): ICVerificationResult[] {
    const results = new Map<string, number>()
    
    callData.forEach(call => {
      const status = call.data_collection_results?.icVerified?.value || 'None'
      results.set(status, (results.get(status) || 0) + 1)
    })

    return Array.from(results.entries()).map(([status, count]) => ({
      status: status as 'Match' | 'No Match' | 'None',
      count
    }))
  }

  // New method to get calls per day data
  private static getCallsPerDayResults(callData: CallDataRecord[]): CallsPerDayResult[] {
    const dailyCalls = new Map<string, { total: number, connected: number }>()
    
    callData.forEach(call => {
      if (call.event_timestamp) {
        // Convert Unix timestamp to date string
        const date = new Date(call.event_timestamp * 1000)
        const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD format
        
        const existing = dailyCalls.get(dateStr) || { total: 0, connected: 0 }
        existing.total += 1
        
        // Count connected calls (completed status)
        if (call.call_status === 'completed') {
          existing.connected += 1
        }
        
        dailyCalls.set(dateStr, existing)
      }
    })

    // Convert to array and sort by date
    return Array.from(dailyCalls.entries())
      .map(([date, counts]) => ({
        date,
        totalCalls: counts.total,
        connectedCalls: counts.connected
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  static async getAgents(): Promise<Array<{ id: string, name: string }>> {
    try {
      const { data, error } = await supabase
        .from('call_data')
        .select('agent_id')
        .order('agent_id')

      if (error) {
        console.error('Error fetching agents:', error)
        return []
      }

      // Get unique agent IDs
      const uniqueAgents = [...new Set(data?.map(item => item.agent_id).filter(Boolean) || [])]

      return uniqueAgents.map(agentId => ({
        id: agentId,
        name: `Agent ${agentId}`
      }))
    } catch (error) {
      console.error('Error in getAgents:', error)
      return []
    }
  }

  static async getBatches(): Promise<Array<{ id: string, name: string }>> {
    try {
      const { data, error } = await supabase
        .from('call_data')
        .select('batch_id')
        .order('batch_id')

      if (error) {
        console.error('Error fetching batches:', error)
        return []
      }

      // Get unique batch IDs
      const uniqueBatches = [...new Set(data?.map(item => item.batch_id).filter(Boolean) || [])]

      return uniqueBatches.map(batchId => ({
        id: batchId,
        name: `Batch ${batchId}`
      }))
    } catch (error) {
      console.error('Error in getBatches:', error)
      return []
    }
  }
}