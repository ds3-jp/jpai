import { supabase } from './supabase-service' // Import supabase client

interface Recipient {
  id: string
  recipient_id: string
  name: string
  phone: string
  [key: string]: any
}

interface BatchCallRequest {
  batchName: string
  recipients: Recipient[]
  batchSize?: number
  intervalMinutes?: number
  batchId?: string
}

interface BatchCallResponse {
  batchId: string
  batchName: string
  totalRecipients: number
  successfulCalls: number
  failedCalls: number
  status: 'processing' | 'completed' | 'failed'
  createdAt: string
  totalBatches: number
  estimatedCompletionTime: string
}

interface CallResult {
  recipientId: string
  recipientName: string
  recipientPhone: string
  success: boolean
  error?: string
  response?: any
  dbInserted?: boolean // Track if DB insertion was successful
  dbError?: string // Track DB insertion errors
}

// Interface for call_data table structure (simplified for our use case)
interface CallDataRecord {
  recipient_id: string
  batch_id: string
  // All other fields will be null and populated by other sources
}

export class BatchCallService {
  private static readonly API_BASE_URL = 'https://30a3-118-100-170-23.ngrok-free.app'
  private static readonly BATCH_CALL_ENDPOINT = '/outbound-call'

  /**
   * Submit a batch call request with batch splitting and intervals
   */
  static async submitBatchCall(request: BatchCallRequest): Promise<BatchCallResponse> {
    try {
      // Use existing batch ID or generate a new one
      const batchId = request.batchId || `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const batchSize = request.batchSize || 20
      const intervalMinutes = request.intervalMinutes || 5

      console.log(`Starting batch call: ${request.batchName} with ${request.recipients.length} recipients`)
      console.log(`Using batch ID: ${batchId}`)
      console.log(`Batch configuration: ${batchSize} recipients per batch, ${intervalMinutes} minute intervals`)

      // Split recipients into smaller batches
      const recipientBatches = this.splitIntoChunks(request.recipients, batchSize)
      const totalBatches = recipientBatches.length

      console.log(`Split into ${totalBatches} batches`)

      // Calculate estimated completion time
      const estimatedMinutes = totalBatches > 1 ? (totalBatches - 1) * intervalMinutes : 0
      const estimatedCompletionTime = new Date(Date.now() + estimatedMinutes * 60000).toISOString()

      // Process batches with intervals
      const allResults = await this.processBatchesWithInterval(
        recipientBatches,
        batchId,
        intervalMinutes
      )

      // Calculate statistics
      const successfulCalls = allResults.filter(r => r.success).length
      const failedCalls = allResults.filter(r => !r.success).length
      const dbInsertionErrors = allResults.filter(r => !r.dbInserted).length

      // Log DB insertion statistics
      console.log(`DB Insertion Summary: ${allResults.length - dbInsertionErrors} successful, ${dbInsertionErrors} failed`)

      // Create batch record
      const batchRecord: BatchCallResponse = {
        batchId,
        batchName: request.batchName,
        totalRecipients: request.recipients.length,
        successfulCalls,
        failedCalls,
        status: failedCalls === 0 ? 'completed' : 'completed',
        createdAt: new Date().toISOString(),
        totalBatches,
        estimatedCompletionTime,
      }

      // Save batch record
      await this.saveBatchRecord(batchRecord, allResults)

      return batchRecord

    } catch (error) {
      console.error('Error in submitBatchCall:', error)
      throw new Error('Failed to submit batch call')
    }
  }

  /**
   * Split array into chunks of specified size
   */
  private static splitIntoChunks<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  /**
   * Process batches with specified intervals between them
   */
  private static async processBatchesWithInterval(
    recipientBatches: Recipient[][],
    batchId: string,
    intervalMinutes: number
  ): Promise<CallResult[]> {
    const allResults: CallResult[] = []

    for (let batchIndex = 0; batchIndex < recipientBatches.length; batchIndex++) {
      const batch = recipientBatches[batchIndex]
      const currentBatch = batchIndex + 1

      console.log(`Processing batch ${currentBatch}/${recipientBatches.length} with ${batch.length} recipients`)

      // Process current batch
      const batchResults = await this.processSingleBatch(batch, batchId)
      allResults.push(...batchResults)

      const successfulCalls = batchResults.filter(r => r.success).length
      const failedCalls = batchResults.filter(r => !r.success).length
      const dbInserted = batchResults.filter(r => r.dbInserted).length

      console.log(`Batch ${currentBatch} completed: ${successfulCalls} successful calls, ${failedCalls} failed calls, ${dbInserted} DB records inserted`)

      // Wait before processing next batch (except for the last one)
      if (batchIndex < recipientBatches.length - 1 && intervalMinutes > 0) {
        console.log(`Waiting ${intervalMinutes} minutes before next batch...`)
        await this.delay(intervalMinutes * 60 * 1000) // Convert minutes to milliseconds
      }
    }

    return allResults
  }

  /**
   * Process a single batch of recipients
   */
  private static async processSingleBatch(
    recipients: Recipient[],
    batchId: string
  ): Promise<CallResult[]> {
    const CONCURRENCY_LIMIT = 5 // Adjust based on your API limits
    const results: CallResult[] = []

    // Process recipients in chunks to avoid overwhelming the API
    for (let i = 0; i < recipients.length; i += CONCURRENCY_LIMIT) {
      const chunk = recipients.slice(i, i + CONCURRENCY_LIMIT)

      const chunkPromises = chunk.map(async (recipient) => {
        return this.makeIndividualCall(recipient, batchId)
      })

      const chunkResults = await Promise.allSettled(chunkPromises)

      chunkResults.forEach((result, index) => {
        const recipient = chunk[index]
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          results.push({
            recipientId: recipient.recipient_id,
            recipientName: recipient.name,
            recipientPhone: recipient.phone,
            success: false,
            error: result.reason?.message || 'Unknown error',
            dbInserted: false,
            dbError: 'Call failed, no DB insertion attempted'
          })
        }
      })

      // Add a small delay between chunks within the same batch
      if (i + CONCURRENCY_LIMIT < recipients.length) {
        await this.delay(100)
      }
    }

    return results
  }

  /**
   * Make an individual call to your existing endpoint
   */
  private static async makeIndividualCall(
    recipient: Recipient,
    batchId: string
  ): Promise<CallResult> {
    try {
      // Create payload with original column names preserved and include recipient_id
      const payload = {
        //batch_id: batchId,
        recipient_id: recipient.recipient_id,
        FullName: recipient.name,
        number: recipient.phone,
        // Include any additional data from the CSV with original column names
        ...Object.keys(recipient).reduce((acc, originalKey) => {
          if (!['id', 'recipient_id', 'name', 'phone'].includes(originalKey)) {
            acc[originalKey] = recipient[originalKey]
          }
          return acc
        }, {} as Record<string, any>)
      }

      console.log(`Making call for ${recipient.name} (ID: ${recipient.recipient_id}) with batch ID: ${batchId}`)

      const response = await fetch(`${this.API_BASE_URL}${this.BATCH_CALL_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const responseData = await response.json()

      // Insert record into call_data table
      const dbResult = await this.insertCallDataRecord(recipient.recipient_id, batchId)

      return {
        recipientId: recipient.recipient_id,
        recipientName: recipient.name,
        recipientPhone: recipient.phone,
        success: true,
        response: responseData,
        dbInserted: dbResult.success,
        dbError: dbResult.error
      }

    } catch (error) {
      console.error(`Failed to call ${recipient.name} (ID: ${recipient.recipient_id}, Phone: ${recipient.phone}):`, error)

      // Still attempt to insert a record for failed calls
      const dbResult = await this.insertCallDataRecord(recipient.recipient_id, batchId)

      return {
        recipientId: recipient.recipient_id,
        recipientName: recipient.name,
        recipientPhone: recipient.phone,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        dbInserted: dbResult.success,
        dbError: dbResult.error
      }
    }
  }

  /**
   * Insert a record into the call_data table with only recipient_id and batch_id
   */
  private static async insertCallDataRecord(
    recipientId: string,
    batchId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Only upsert recipient_id and batch_id, everything else stays null
      const callDataRecord = {
        recipient_id: recipientId,
        batch_id: batchId
      }

      console.log(`Upserting call_data record for recipient: ${recipientId}`)

      const { data, error } = await supabase
        .from('call_data')
        .upsert([callDataRecord], {
          onConflict: 'recipient_id' // Specify the primary key column
        })
        .select()

      if (error) {
        console.error(`Failed to upsert call_data for recipient ${recipientId}:`, error)
        return { success: false, error: error.message }
      }

      console.log(`Successfully upserted call_data record for recipient: ${recipientId}`)
      return { success: true }

    } catch (error) {
      console.error(`Error upserting call_data for recipient ${recipientId}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown database error'
      }
    }
  }

  /**
   * Utility function to create delays
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Save batch record to your backend (optional)
   */
  private static async saveBatchRecord(
    batchRecord: BatchCallResponse,
    callResults: CallResult[]
  ): Promise<void> {
    try {
      const dbInsertionStats = {
        total: callResults.length,
        successful: callResults.filter(r => r.dbInserted).length,
        failed: callResults.filter(r => !r.dbInserted).length,
        errors: callResults.filter(r => r.dbError).map(r => ({
          recipientId: r.recipientId,
          error: r.dbError
        }))
      }

      console.log('Batch call completed:', {
        batchRecord,
        callResults: callResults.slice(0, 3), // Log first 3 results as sample
        dbInsertionStats
      })

    } catch (error) {
      console.error('Error saving batch record:', error)
    }
  }

  /**
   * Get batch call history (for future implementation)
   */
  static async getBatchHistory(): Promise<BatchCallResponse[]> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/batch-records`)
      if (!response.ok) {
        throw new Error('Failed to fetch batch history')
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching batch history:', error)
      return []
    }
  }
}