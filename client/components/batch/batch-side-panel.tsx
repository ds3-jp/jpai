'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Upload, FileSpreadsheet, Plus, Clock, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { CSVUploader } from '@/components/batch/csv-uploader'
import { RecipientsTable } from '@/components/batch/recipients-table'
import { SupabaseService } from '@/app/services/supabase-service'

interface Recipient {
  id: string
  recipient_id: string
  name: string
  phone: string
  [key: string]: any // Allow additional CSV columns
}

interface BatchSidePanelProps {
  isOpen: boolean
  onClose: () => void
  onBatchCreated: (batch: any) => void
}

export const BatchSidePanel: React.FC<BatchSidePanelProps> = ({
  isOpen,
  onClose,
  onBatchCreated
}) => {
  const [batchName, setBatchName] = useState('')
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [batchSize, setBatchSize] = useState(20)
  const [intervalMinutes, setIntervalMinutes] = useState(5)
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()

  const handleCSVParsed = (data: Recipient[]) => {
    setRecipients(data)
    toast({
      title: "CSV Uploaded Successfully",
      description: `Parsed ${data.length} recipients from the CSV file.`,
    })
  }

  const calculateBatchInfo = () => {
    if (recipients.length === 0) return { totalBatches: 0, estimatedTime: 0 }
    
    const totalBatches = Math.ceil(recipients.length / batchSize)
    const estimatedTimeMinutes = totalBatches > 1 ? (totalBatches - 1) * intervalMinutes : 0
    
    return { totalBatches, estimatedTime: estimatedTimeMinutes }
  }

  const resetForm = () => {
    setBatchName('')
    setRecipients([])
    setBatchSize(20)
    setIntervalMinutes(5)
  }

  const handleTestConnection = async () => {
    try {
      const result = await SupabaseService.createBatchSimple()
      console.log('Test result:', result)
      if (result.success) {
        toast({
          title: "Test Successful",
          description: "Supabase connection is working!",
        })
      } else {
        toast({
          title: "Test Failed",
          description: `Error: ${result.error || 'Unknown error'}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Test error:', error)
      toast({
        title: "Test Failed",
        description: "Failed to test connection",
        variant: "destructive",
      })
    }
  }

  const handleCreateBatch = async () => {
    if (!batchName.trim()) {
      toast({
        title: "Batch Name Required",
        description: "Please enter a name for this batch call.",
        variant: "destructive",
      })
      return
    }

    if (recipients.length === 0) {
      toast({
        title: "No Recipients",
        description: "Please upload a CSV file with recipients first.",
        variant: "destructive",
      })
      return
    }

    if (batchSize < 1 || batchSize > 50) {
      toast({
        title: "Invalid Batch Size",
        description: "Batch size must be between 1 and 50.",
        variant: "destructive",
      })
      return
    }

    if (intervalMinutes < 0 || intervalMinutes > 60) {
      toast({
        title: "Invalid Interval",
        description: "Interval must be between 0 and 60 minutes.",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    
    try {
      // Test connection first
      console.log('Testing Supabase connection...')
      const connectionOk = await SupabaseService.testConnection()
      if (!connectionOk) {
        throw new Error('Supabase connection failed')
      }

      // Generate batch ID
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      console.log('Generated batch ID:', batchId)
      
      // Extract full names from recipients for the recipients JSONB field
      const recipientNames = recipients.map(recipient => recipient.name)
      console.log('Recipient names:', recipientNames)
      
      // Prepare CSV data for storage (remove internal UI fields)
      const csvData = recipients.map(recipient => {
        const { id, ...csvRow } = recipient // Remove the internal 'id' field
        return csvRow
      })
      console.log('CSV data for storage:', csvData.slice(0, 3)) // Log first 3 rows
      
      // Create batch object for Supabase
      const batchData = {
        id: batchId,
        batch_name: batchName,
        total_recipients: recipients.length,
        recipients: recipientNames, // Array of full names
        csv_data: csvData // Include the entire CSV contents
      }
      
      console.log('About to create batch with:', {
        ...batchData,
        csv_data: `[${csvData.length} rows of CSV data]` // Don't log all CSV data
      })

      // Save to Supabase
      const savedBatch = await SupabaseService.createBatch(batchData)
      console.log('Saved batch:', {
        ...savedBatch,
        csv_data: `[${savedBatch.csv_data?.length || 0} rows stored]`
      })

      // Create local batch object with additional data for the UI
      const localBatch = {
        ...savedBatch,
        batchSize,
        intervalMinutes,
        recipientObjects: recipients, // Keep full recipient objects for API calls
        configuration: {
          batchSize,
          intervalMinutes
        },
        successful_calls: 0,
        failed_calls: 0
      }

      toast({
        title: "Batch Created Successfully",
        description: `Created batch "${batchName}" with ${recipients.length} recipients and stored CSV data. Ready to start calling.`,
      })

      onBatchCreated(localBatch)
      resetForm()
      onClose()
      
    } catch (error) {
      console.error('Full error object:', error)
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create the batch. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleRemoveRecipient = (id: string) => {
    setRecipients(prev => prev.filter(recipient => recipient.id !== id))
    toast({
      title: "Recipient Removed",
      description: "Recipient has been removed from the batch.",
    })
  }

  const handleClose = () => {
    if (!isCreating) {
      resetForm()
      onClose()
    }
  }

  const { totalBatches, estimatedTime } = calculateBatchInfo()

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="w-[600px] sm:w-[800px] lg:w-[1000px] sm:max-w-[600px] overflow-y-auto px-4">
        <SheetHeader>
          <SheetTitle>Create New Batch</SheetTitle>
          <SheetDescription>
            Configure a new batch calling campaign. You can start the calls after creating the batch.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Test Button - Remove this after debugging
          <Card>
            <CardContent className="pt-6">
              <Button onClick={handleTestConnection} variant="outline" className="w-full">
                Test Supabase Connection
              </Button>
            </CardContent>
          </Card> */}

          {/* Batch Name */}
          <Card>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="batch-name">Batch Name</Label>
                <Input
                  id="batch-name"
                  placeholder="Enter batch name"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Accordion for Configuration and CSV Upload */}
          <Accordion type="multiple" defaultValue={["csv-upload"]} className="space-y-4">
            {/* Batch Configuration Accordion */}
            <AccordionItem value="batch-config" className="border rounded-xl">
              <Card className="border-0">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-2 text-left">
                    <Clock className="h-5 w-5" />
                    <div>
                      <div className="font-semibold">Batch Configuration</div>
                      <div className="text-sm text-muted-foreground">
                        Configure batch size and timing intervals
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="batch-size">Recipients per Batch</Label>
                      <Input
                        id="batch-size"
                        type="number"
                        min="1"
                        max="50"
                        value={batchSize}
                        onChange={(e) => setBatchSize(Number(e.target.value))}
                        placeholder="20"
                      />
                      <p className="text-xs text-muted-foreground">
                        Maximum 50 recipients per batch
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="interval">Interval Between Batches (minutes)</Label>
                      <Input
                        id="interval"
                        type="number"
                        min="0"
                        max="60"
                        value={intervalMinutes}
                        onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                        placeholder="5"
                      />
                      <p className="text-xs text-muted-foreground">
                        Time to wait between batch executions
                      </p>
                    </div>

                    {recipients.length > 0 && (
                      <div className="p-3 bg-muted rounded-lg space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Users className="h-4 w-4" />
                          Batch Summary
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Total Recipients: {recipients.length}</p>
                          <p>Number of Batches: {totalBatches}</p>
                          <p>Estimated Total Time: {estimatedTime} minutes</p>
                          <p>CSV Data: Ready for storage</p>
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* CSV Upload Accordion */}
            <AccordionItem value="csv-upload" className="border rounded-xl">
              <Card className="border-0">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-2 text-left">
                    <FileSpreadsheet className="h-5 w-5" />
                    <div>
                      <div className="font-semibold">Recipients (CSV)</div>
                      <div className="text-sm text-muted-foreground">
                        {recipients.length > 0 
                          ? `${recipients.length} recipients loaded`
                          : "Upload a CSV file containing recipient information"
                        }
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <CSVUploader onDataParsed={handleCSVParsed} />
                </AccordionContent>
              </Card>
            </AccordionItem>
          </Accordion>

          {/* Recipients Table */}
          {recipients.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recipients Preview</CardTitle>
                <CardDescription>
                  {recipients.length} recipient(s) loaded - CSV data will be stored in database
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecipientsTable
                  recipients={recipients}
                  onRemoveRecipient={handleRemoveRecipient}
                />
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleClose}
              variant="outline"
              disabled={isCreating}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateBatch}
              disabled={isCreating || !batchName.trim() || recipients.length === 0}
              className="flex-1"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Batch
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}