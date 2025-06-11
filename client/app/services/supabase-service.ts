import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface BatchRecord {
  id: string
  batch_name: string
  total_recipients: number
  completed_calls: number
  csv_data: any[] // Add csv_data field for JSONB column
  status: string
  created_at: string
  started_at?: string
  completed_at?: string
  recipients: string[] // Array of full names
  // Computed fields from post_call_data
  successful_calls?: number
  failed_calls?: number
  // Additional fields for UI
  batchSize?: number
  intervalMinutes?: number
  recipientObjects?: any[]
  configuration?: {
    batchSize: number
    intervalMinutes: number
  }
}


export interface CallRecord {
  conversation_id: string
  agent_id: string
  event_timestamp: number
  call_successful: string
  call_duration: number
  batch_id: string
  dynamic_variables: any
  transcript: any
}

export class SupabaseService {

  // Test connection function
  static async testConnection() {
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('count')
        .limit(1)

      if (error) {
        console.error('Connection test failed:', error)
        return false
      }

      console.log('Supabase connection successful')
      return true
    } catch (err) {
      console.error('Connection test error:', err)
      return false
    }
  }

  // Create a new batch
  static async createBatch(batchData: {
    id: string
    batch_name: string
    total_recipients: number
    recipients: string[] // Array of full names
    csv_data: any[] // Add csv_data parameter
  }) {
    console.log('Creating batch with data:', batchData)

    const { data, error } = await supabase
      .from('batches')
      .insert([{
        id: batchData.id,
        batch_name: batchData.batch_name,
        total_recipients: batchData.total_recipients,
        recipients: batchData.recipients,
        csv_data: batchData.csv_data, // Include csv_data in the insert
        completed_calls: 0, // Initialize completed_calls to 0
        status: 'Not Running'
      }])
      .select()
      .single()

    if (error) {
      console.error('Supabase error details:', error)
      console.error('Error message:', error.message)
      console.error('Error details:', error.details)
      console.error('Error hint:', error.hint)
      console.error('Error code:', error.code)
      throw new Error(`Supabase error: ${error.message || 'Unknown error'}`)
    }

    console.log('Batch created successfully:', data)
    return data
  }

  // Simple test function
  static async createBatchSimple() {
    try {
      const testData = {
        id: 'test_123',
        batch_name: 'Test Batch',
        total_recipients: 1,
        recipients: ['John Doe'],
        completed_calls: 0,
        status: 'Not Running'
      }

      console.log('Inserting test data:', testData)

      const { data, error } = await supabase
        .from('batches')
        .insert([testData])
        .select()

      console.log('Insert result:', { data, error })

      if (error) {
        console.error('Insert error:', error)
        return { success: false, error }
      }

      return { success: true, data }
    } catch (err) {
      console.error('Catch error:', err)
      return { success: false, error: err }
    }
  }

  // Get all batches with call statistics
  static async getBatches(): Promise<BatchRecord[]> {
    try {
      // Get all batches including completed_calls
      const { data: batches, error: batchError } = await supabase
        .from('batches')
        .select('*') // This will include completed_calls and csv_data
        .order('created_at', { ascending: false })

      if (batchError) {
        console.error('Error fetching batches:', batchError)
        throw batchError
      }

      // Get call statistics for each batch AND reconstruct recipientObjects
      const batchesWithStats = await Promise.all(
        (batches || []).map(async (batch) => {
          const stats = await this.getBatchCallStats(batch.id)

          // Reconstruct recipientObjects from csv_data for API calls
          let recipientObjects: any[] = []
          if (batch.csv_data && Array.isArray(batch.csv_data)) {
            recipientObjects = batch.csv_data.map((csvRow: any, index: number) => ({
              id: `${batch.id}_${index}`, // Generate consistent ID
              recipient_id: csvRow.recipient_id,
              name: csvRow.name || csvRow.FullName, // Handle both possible name columns
              phone: csvRow.phone || csvRow.number, // Handle both possible phone columns
              ...csvRow // Include all other CSV columns
            }))
          }

          return {
            ...batch,
            successful_calls: stats.successful_calls,
            failed_calls: stats.failed_calls,
            recipientObjects // Add this so the Start button works after reload
          }
        })
      )

      return batchesWithStats
    } catch (error) {
      console.error('Error in getBatches:', error)
      throw error
    }
  }

  /**
 * Delete a batch by ID
 */
  static async deleteBatch(batchId: string) {
    try {
      console.log(`Deleting batch: ${batchId}`)

      const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', batchId)

      if (error) {
        console.error('Error deleting batch:', error)
        throw new Error(`Failed to delete batch: ${error.message}`)
      }

      console.log(`Successfully deleted batch: ${batchId}`)

    } catch (error) {
      console.error('Error in deleteBatch:', error)
      throw error
    }
  }

  // Get call statistics for a specific batch
  static async getBatchCallStats(batchId: string) {
    try {
      const { data, error } = await supabase
        .from('call_data')
        .select('call_status')
        .eq('batch_id', batchId)

      if (error) {
        console.error('Error fetching batch stats:', error)
        return { successful_calls: 0, failed_calls: 0 }
      }

      const successful_calls = data.filter(call =>
        call.call_status === 'completed' || call.call_status === 'in-progress'
      ).length

      const failed_calls = data.filter(call =>
        call.call_status === 'no-answer' || call.call_status === 'failed' || call.call_status === 'busy'
      ).length

      return { successful_calls, failed_calls }
    } catch (error) {
      console.error('Error in getBatchCallStats:', error)
      return { successful_calls: 0, failed_calls: 0 }
    }
  }

  // Update batch status
  static async updateBatchStatus(batchId: string, status: string, timestamps?: { started_at?: string, completed_at?: string }) {
    try {
      const updateData: any = { status }

      if (timestamps?.started_at) {
        updateData.started_at = timestamps.started_at
      }

      if (timestamps?.completed_at) {
        updateData.completed_at = timestamps.completed_at
      }

      const { error } = await supabase
        .from('batches')
        .update(updateData)
        .eq('id', batchId)

      if (error) {
        console.error('Error updating batch status:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in updateBatchStatus:', error)
      throw error
    }
  }

  // Update completed_calls count for a batch
  static async incrementCompletedCalls(batchId: string) {
    try {
      // Use RPC to atomically increment the completed_calls counter
      const { error } = await supabase.rpc('increment_completed_calls', {
        batch_id_param: batchId
      })

      if (error) {
        console.error('Error incrementing completed calls:', error)
        // Fallback to manual increment if RPC doesn't exist
        const { data: batch, error: fetchError } = await supabase
          .from('batches')
          .select('completed_calls')
          .eq('id', batchId)
          .single()

        if (fetchError) {
          throw fetchError
        }

        const { error: updateError } = await supabase
          .from('batches')
          .update({ completed_calls: (batch.completed_calls || 0) + 1 })
          .eq('id', batchId)

        if (updateError) {
          throw updateError
        }
      }
    } catch (error) {
      console.error('Error in incrementCompletedCalls:', error)
      throw error
    }
  }

  // Get detailed call records for a batch
  static async getBatchCallDetails(batchId: string): Promise<CallRecord[]> {
    try {
      const { data, error } = await supabase
        .from('post_call_data_duplicate')
        .select('*')
        .eq('batch_id', batchId)
        .order('event_timestamp', { ascending: false })

      if (error) {
        console.error('Error fetching batch call details:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getBatchCallDetails:', error)
      return []
    }
  }

  // Get call data for a specific batch
  static async getBatchCallData(batchId: string) {
    try {
      const { data, error } = await supabase
        .from('call_data')
        .select('recipient_id, call_success, call_status, conversation_id, call_duration, event_timestamp')
        .eq('batch_id', batchId)

      if (error) {
        console.error('Error fetching batch call data:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getBatchCallData:', error)
      return []
    }
  }

  // Get call data for specific recipient IDs (alternative method)
  static async getCallDataByRecipientIds(recipientIds: string[]) {
    try {
      const { data, error } = await supabase
        .from('call_data')
        .select('recipient_id, call_success, call_status, conversation_id, call_duration, event_timestamp')
        .in('recipient_id', recipientIds)

      if (error) {
        console.error('Error fetching call data by recipient IDs:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getCallDataByRecipientIds:', error)
      return []
    }
  }

  // Search batches
  static async searchBatches(searchTerm: string, statusFilter?: string) {
    try {
      let query = supabase
        .from('batches')
        .select('*')
        .order('created_at', { ascending: false })

      if (searchTerm) {
        query = query.ilike('batch_name', `%${searchTerm}%`)
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error searching batches:', error)
        throw error
      }

      // Add call statistics
      const batchesWithStats = await Promise.all(
        (data || []).map(async (batch) => {
          const stats = await this.getBatchCallStats(batch.id)
          return {
            ...batch,
            successful_calls: stats.successful_calls,
            failed_calls: stats.failed_calls
          }
        })
      )

      return batchesWithStats
    } catch (error) {
      console.error('Error in searchBatches:', error)
      return []
    }
  }
}