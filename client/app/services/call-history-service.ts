import { createClient } from '@supabase/supabase-js'
import { CallRecord, CallHistoryResponse, CallHistoryParams, CallFilters } from '@/app/types/call-history'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export class CallHistoryService {
  static async getCallHistory(params: CallHistoryParams): Promise<CallHistoryResponse> {
    try {
      let query = supabase
        .from('call_data')
        .select('*', { count: 'exact' })

      // Apply search filter
      if (params.search) {
        query = query.or(`dynamic_variables->>FullName.ilike.%${params.search}%,conversation_id.ilike.%${params.search}%,recipient_id.ilike.%${params.search}%`)
      }

      // Apply filters
      if (params.filters) {
        const { status, dateRange, agentId, nameVerified, icVerified, callOutcome, twilioStatus } = params.filters

        // Status filter
        if (status && status !== 'all') {
          if (status === 'successful') {
            query = query.eq('call_success', 'true')
          } else if (status === 'failed') {
            query = query.eq('call_success', 'false')
          }
        }

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
              const quarter = Math.floor(now.getMonth() / 3)
              startDate = new Date(now.getFullYear(), quarter * 3, 1)
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

        // Name verification filter
        if (nameVerified && nameVerified !== 'all') {
          query = query.eq('data_collection_results->nameVerified->>value', nameVerified)
        }

        // IC verification filter
        if (icVerified && icVerified !== 'all') {
          query = query.eq('data_collection_results->icVerified->>value', icVerified)
        }

        // Call outcome filter
        if (callOutcome && callOutcome !== 'all') {
          query = query.eq('data_collection_results->callOutcome->>value', callOutcome)
        }

        // Twilio status filter
        if (twilioStatus && twilioStatus !== 'all') {
          query = query.eq('call_status', twilioStatus)
        }
      }

      // Apply pagination
      const { page, limit } = params
      const from = (page - 1) * limit
      const to = from + limit - 1

      query = query
        .range(from, to)
        .order('event_timestamp', { ascending: false })

      const { data, error, count } = await query

      if (error) {
        throw new Error(`Failed to fetch call history: ${error.message}`)
      }

      return {
        calls: data || [],
        totalCount: count || 0
      }
    } catch (error) {
      console.error('Error in getCallHistory:', error)
      throw error
    }
  }

  static async getAgents(): Promise<Array<{ id: string, name: string }>> {
    try {
      // Get unique agents from call_data table
      const { data, error } = await supabase
        .from('call_data')
        .select('agent_id')
        .order('agent_id')

      if (error) {
        console.error('Error fetching agents:', error)
        return []
      }

      // Get unique agent IDs and create name from ID
      const uniqueAgents = [...new Set(data?.map(item => item.agent_id) || [])]

      return uniqueAgents.map(agentId => ({
        id: agentId,
        name: `Agent ${agentId}` // You can modify this to get actual names if you have an agents table
      }))
    } catch (error) {
      console.error('Error in getAgents:', error)
      return []
    }
  }

  static async getTwilioStatuses(): Promise<string[]> {
    try {
      // Get unique Twilio statuses from call_data table
      const { data, error } = await supabase
        .from('call_data')
        .select('call_status')
        .not('call_status', 'is', null)
        .order('call_status')

      if (error) {
        console.error('Error fetching Twilio statuses:', error)
        return []
      }

      // Get unique statuses
      const uniqueStatuses = [...new Set(data?.map(item => item.call_status) || [])]
      return uniqueStatuses.filter(status => status) // Remove any null/empty values
    } catch (error) {
      console.error('Error in getTwilioStatuses:', error)
      return []
    }
  }

  static async getCallDetails(conversationId: string): Promise<CallRecord | null> {
    try {
      // First try to find by conversation_id
      let { data, error } = await supabase
        .from('call_data')
        .select('*')
        .eq('conversation_id', conversationId)
        .maybeSingle()

      // If not found by conversation_id, try recipient_id as fallback
      if (!data && !error) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('call_data')
          .select('*')
          .eq('recipient_id', conversationId)
          .single()
        
        data = fallbackData
        error = fallbackError
      }

      if (error) {
        throw new Error(`Failed to fetch call details: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error in getCallDetails:', error)
      return null
    }
  }

  static async getCallAudio(conversationId: string): Promise<Blob> {
    try {
      console.log(`Fetching audio for conversation: ${conversationId}`)
      
      const response = await fetch(`/api/calls/${conversationId}/audio`, {
        method: 'GET',
        headers: {
          'Accept': 'audio/*',
        },
      })

      console.log(`Audio API response status: ${response.status}`)
      console.log(`Audio API response headers:`, Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Failed to fetch audio: ${response.statusText}`)
      }

      const blob = await response.blob()
      console.log(`Audio blob created - size: ${blob.size} bytes, type: ${blob.type}`)
      
      if (blob.size === 0) {
        throw new Error('Received empty audio file')
      }

      return blob
    } catch (error) {
      console.error('Error fetching call audio:', error)
      throw error
    }
  }

  /**
   * Get a playable URL for the audio
   */
  static async getCallAudioUrl(conversationId: string): Promise<string> {
    try {
      const audioBlob = await this.getCallAudio(conversationId)
      const url = URL.createObjectURL(audioBlob)
      console.log(`Audio URL created: ${url}`)
      
      // Test if the blob URL is accessible
      try {
        const testResponse = await fetch(url, { method: 'HEAD' })
        console.log(`Blob URL test - status: ${testResponse.status}`)
      } catch (testError) {
        console.warn('Blob URL test failed:', testError)
      }
      
      return url
    } catch (error) {
      console.error('Error creating audio URL:', error)
      throw error
    }
  }

  /**
   * Check if audio is available for a conversation
   * Since HEAD method isn't supported, we'll try a GET request and check the response
   */
  static async isAudioAvailable(conversationId: string): Promise<boolean> {
    try {
      // Just try to get the audio - if it succeeds, it's available
      await this.getCallAudio(conversationId)
      return true
    } catch (error) {
      console.error('Audio not available:', error)
      return false
    }
  }
}