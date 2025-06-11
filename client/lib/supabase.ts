// client/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database types based on your schema
export interface PostCallData {
  conversation_id: string
  agent_id: string
  event_timestamp: number
  evaluation_criteria_results: any
  data_collection_results: any
  transcript: any
  call_successful: string | null
  call_duration: number | null
  dynamic_variables: any
}
