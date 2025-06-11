'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ArrowLeft, Search, Download, FileText, Users, Clock, Calendar, Phone, CheckCircle, XCircle, AlertCircle, Filter, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { SupabaseService, BatchRecord } from '@/app/services/supabase-service'

interface BatchDetailsPageProps { }

interface EnrichedCSVData {
  [key: string]: any
  call_success?: string
  call_status?: string
  call_duration?: number
  conversation_id?: string
  event_timestamp?: number
}

const BatchDetailsPage: React.FC<BatchDetailsPageProps> = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const batchId = searchParams.get('id')

  const [batch, setBatch] = useState<BatchRecord | null>(null)
  const [csvData, setCsvData] = useState<any[]>([])
  const [enrichedData, setEnrichedData] = useState<EnrichedCSVData[]>([])
  const [filteredData, setFilteredData] = useState<EnrichedCSVData[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [csvColumns, setCsvColumns] = useState<string[]>([])
  const [callSuccessFilter, setCallSuccessFilter] = useState<string[]>([])
  const [callStatusFilter, setCallStatusFilter] = useState<string[]>([])
  const [availableCallSuccess, setAvailableCallSuccess] = useState<string[]>([])
  const [availableCallStatus] = useState<string[]>(['in-progress', 'completed', 'busy', 'no-answer', 'canceled', 'failed'])
  const { toast } = useToast()

  // Load batch details and call data
  const loadBatchDetails = async () => {
    if (!batchId) {
      toast({
        title: "Invalid Batch ID",
        description: "No batch ID provided in the URL.",
        variant: "destructive",
      })
      router.push('/batch-calling')
      return
    }

    try {
      setIsLoading(true)

      // Get batch details
      const batches = await SupabaseService.getBatches()
      const batchDetails = batches.find(b => b.id === batchId)

      if (!batchDetails) {
        toast({
          title: "Batch Not Found",
          description: "The requested batch could not be found.",
          variant: "destructive",
        })
        router.push('/batch-calling')
        return
      }

      setBatch(batchDetails)

      // Extract CSV data
      const csvData = batchDetails.csv_data || []
      setCsvData(csvData)

      // Get call data for this batch
      const callData = await SupabaseService.getBatchCallData(batchId)

      // Create a map of recipient_id to call data for faster lookup
      const callDataMap = new Map(
        callData.map(call => [call.recipient_id, call])
      )

      // Enrich CSV data with call information
      const enrichedData = csvData.map(row => {
        const recipientId = row.recipient_id
        const callInfo = callDataMap.get(recipientId)

        return {
          ...row,
          call_success: callInfo?.call_success || null,
          call_status: callInfo?.call_status || null,
          call_duration: callInfo?.call_duration || null,
          conversation_id: callInfo?.conversation_id || null,
          event_timestamp: callInfo?.event_timestamp || null
        }
      })

      setEnrichedData(enrichedData)
      setFilteredData(enrichedData)

      // Extract unique values for call success filter only
      const uniqueCallSuccess = [...new Set(enrichedData.map(row => row.call_success).filter(Boolean))]
      setAvailableCallSuccess(uniqueCallSuccess)

      // Extract column names including new call data columns
      if (enrichedData.length > 0) {
        const columns = Object.keys(enrichedData[0])
        setCsvColumns(columns)
      }

    } catch (error) {
      console.error('Error loading batch details:', error)
      toast({
        title: "Error Loading Batch",
        description: "Failed to load batch details from database.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Filter data based on search term and filters
  useEffect(() => {
    let filtered = enrichedData

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(row => {
        return Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      })
    }

    // Apply call success filter
    if (callSuccessFilter.length > 0) {
      filtered = filtered.filter(row => {
        const callSuccess = row.call_success
        if (!callSuccess) return callSuccessFilter.includes('No Call')
        return callSuccessFilter.includes(callSuccess)
      })
    }

    // Apply call status filter
    if (callStatusFilter.length > 0) {
      filtered = filtered.filter(row => {
        const callStatus = row.call_status
        if (!callStatus) return callStatusFilter.includes('No Call')
        return callStatusFilter.includes(callStatus)
      })
    }

    setFilteredData(filtered)
  }, [searchTerm, enrichedData, callSuccessFilter, callStatusFilter])

  // Load data on mount
  useEffect(() => {
    loadBatchDetails()
  }, [batchId])

  const handleBack = () => {
    router.push('/batch-calling')
  }

  const handleExportResults = () => {
    if (enrichedData.length === 0) {
      toast({
        title: "No Data",
        description: "No data available to export.",
        variant: "destructive",
      })
      return
    }

    // Convert enriched data to CSV format
    const headers = csvColumns.join(',')
    const rows = enrichedData.map(row =>
      csvColumns.map(col => {
        const value = row[col] || ''
        // Escape commas and quotes in CSV
        return typeof value === 'string' && (value.includes(',') || value.includes('"'))
          ? `"${value.replace(/"/g, '""')}"`
          : value
      }).join(',')
    )

    const csvContent = [headers, ...rows].join('\n')

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${batch?.batch_name || 'batch'}_results.csv`
    link.click()

    toast({
      title: "Export Successful",
      description: "CSV file with call results has been downloaded.",
    })
  }

  const handleExportOriginalCSV = () => {
    if (filteredData.length === 0) {
      toast({
        title: "No Data",
        description: "No data available to export with current filters.",
        variant: "destructive",
      })
      return
    }

    // Get original CSV columns excluding recipient_id and call-related columns, and map name/phone back to original names
    const originalColumns = Object.keys(filteredData[0])
      .filter(col => !['recipient_id', 'call_success', 'call_status', 'call_duration', 'conversation_id', 'event_timestamp'].includes(col))

    // Map columns back to original CSV format
    const exportColumns = originalColumns.map(col => {
      if (col === 'name') return 'FullName'
      if (col === 'phone') return 'number'
      return col
    })

    // Convert filtered data to CSV format with mapped column names
    const headers = exportColumns.join(',')
    const rows = filteredData.map(row =>
      originalColumns.map(col => {
        const value = row[col] || ''
        // Escape commas and quotes in CSV
        return typeof value === 'string' && (value.includes(',') || value.includes('"'))
          ? `"${value.replace(/"/g, '""')}"`
          : value
      }).join(',')
    )

    const csvContent = [headers, ...rows].join('\n')

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)

    // Add filter info to filename if filters are active
    const filterSuffix = getActiveFilterCount() > 0 ? '_filtered' : '_original'
    link.download = `${batch?.batch_name || 'batch'}${filterSuffix}.csv`
    link.click()

    toast({
      title: "Export Successful",
      description: `Exported ${filteredData.length} rows with original column names${getActiveFilterCount() > 0 ? ' (filtered data)' : ''}.`,
    })
  }

  const clearAllFilters = () => {
    setCallSuccessFilter([])
    setCallStatusFilter([])
    setSearchTerm('')
  }

  const getActiveFilterCount = () => {
    return callSuccessFilter.length + callStatusFilter.length + (searchTerm ? 1 : 0)
  }

  const handleCallSuccessFilterChange = (value: string, checked: boolean) => {
    if (checked) {
      setCallSuccessFilter(prev => [...prev, value])
    } else {
      setCallSuccessFilter(prev => prev.filter(item => item !== value))
    }
  }

  const handleCallStatusFilterChange = (value: string, checked: boolean) => {
    if (checked) {
      setCallStatusFilter(prev => [...prev, value])
    } else {
      setCallStatusFilter(prev => prev.filter(item => item !== value))
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatTimestamp = (timestamp: number | null) => {
    if (!timestamp) return '-'
    return new Date(timestamp * 1000).toLocaleString()
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      'Not Running': 'bg-yellow-100 text-yellow-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'processing': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800'
    }

    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'} variant="secondary">
        {status}
      </Badge>
    )
  }

  const getCallSuccessBadge = (success: string | null) => {
    if (!success) return <Badge variant="outline">No Call</Badge>

    switch (success.toLowerCase()) {
      case 'true':
      case 'success':
        return (
          <Badge className="bg-green-100 text-green-800" variant="secondary">
            <CheckCircle className="h-3 w-3 mr-1" />
            Success
          </Badge>
        )
      case 'false':
      case 'failed':
      case 'error':
        return (
          <Badge className="bg-red-100 text-red-800" variant="secondary">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        )
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800" variant="secondary">
            <AlertCircle className="h-3 w-3 mr-1" />
            {success}
          </Badge>
        )
    }
  }

  const getCallStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">-</Badge>

    const statusColors: { [key: string]: string } = {
      'completed': 'bg-green-100 text-green-800',
      'answered': 'bg-green-100 text-green-800',
      'busy': 'bg-yellow-100 text-yellow-800',
      'no-answer': 'bg-orange-100 text-orange-800',
      'failed': 'bg-red-100 text-red-800',
      'canceled': 'bg-gray-100 text-gray-800'
    }

    const colorClass = statusColors[status.toLowerCase()] || 'bg-blue-100 text-blue-800'

    return (
      <Badge className={colorClass} variant="secondary">
        {status}
      </Badge>
    )
  }

  const getProgress = (completedCalls: number, totalRecipients: number) => {
    if (totalRecipients === 0) return 0
    return Math.round((completedCalls / totalRecipients) * 100)
  }

  const renderCellValue = (column: string, value: any) => {
    switch (column) {
      case 'call_success':
        return getCallSuccessBadge(value)
      case 'call_status':
        return getCallStatusBadge(value)
      case 'call_duration':
        return formatDuration(value)
      case 'event_timestamp':
        return formatTimestamp(value)
      case 'conversation_id':
        return value ? (
          <span className="font-mono text-xs">{value}</span>
        ) : '-'
      default:
        return value || '-'
    }
  }

  const getColumnHeader = (column: string) => {
    const headerMap: { [key: string]: string } = {
      'call_success': 'Call Success',
      'call_status': 'Call Status',
      'call_duration': 'Duration',
      'event_timestamp': 'Call Time',
      'conversation_id': 'Conversation ID',
      'recipient_id': 'Recipient ID'
    }

    return headerMap[column] || column
  }

  const getColumnIcon = (column: string) => {
    switch (column) {
      case 'call_success':
        return <CheckCircle className="h-4 w-4" />
      case 'call_status':
        return <Phone className="h-4 w-4" />
      case 'call_duration':
        return <Clock className="h-4 w-4" />
      case 'event_timestamp':
        return <Calendar className="h-4 w-4" />
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            Loading batch details...
          </div>
        </div>
      </div>
    )
  }

  if (!batch) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Batch Not Found</h1>
          <Button onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Batches
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{batch.batch_name}</h1>
              <p className="text-muted-foreground">Batch ID: {batch.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(batch.status)}
          </div>
        </div>

        {/* Summary Cards */}
        <Card>
          <CardContent className="px-4">
            <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x">

              {/* Total Recipients */}
              <div className="flex flex-1 items-center gap-2 px-4 py-1">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Recipients</p>
                  <p className="text-2xl font-bold">{batch.total_recipients}</p>
                </div>
              </div>

              {/* Progress */}
              <div className="flex flex-1 items-center gap-2 px-4 py-1">
                <Clock className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Progress</p>
                  <p className="text-2xl font-bold">
                    {getProgress(batch.completed_calls || 0, batch.total_recipients)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {batch.completed_calls || 0}/{batch.total_recipients} calls
                  </p>
                </div>
              </div>

              {/* Success Rate */}
              <div className="flex flex-1 items-center gap-2 px-4 py-1">
                <FileText className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">
                    {batch.total_recipients > 0 && (batch.successful_calls || 0) > 0
                      ? Math.round(((batch.successful_calls || 0) / batch.total_recipients) * 100)
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {batch.successful_calls || 0} successful
                  </p>
                </div>
              </div>

              {/* Created Info */}
              <div className="flex flex-1 items-center gap-2 px-4 py-1">
                <Calendar className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p className="text-sm font-bold">{formatDate(batch.created_at)}</p>
                  {batch.completed_at && (
                    <p className="text-xs text-muted-foreground">
                      Completed: {formatDate(batch.completed_at)}
                    </p>
                  )}
                </div>
              </div>

            </div>
          </CardContent>
        </Card>


        {/* Recipients Data with Call Results */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recipients & Call Results ({filteredData.length} records)</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  CSV data enriched with call results from call_data table
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search recipients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>

                {/* Call Success Filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Call Success
                      {callSuccessFilter.length > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {callSuccessFilter.length}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56" align="start">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Call Success</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="no-call-success"
                            checked={callSuccessFilter.includes('No Call')}
                            onCheckedChange={(checked) =>
                              handleCallSuccessFilterChange('No Call', !!checked)
                            }
                          />
                          <label htmlFor="no-call-success" className="text-sm">
                            No Call
                          </label>
                        </div>
                        {availableCallSuccess.map((value) => (
                          <div key={value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`success-${value}`}
                              checked={callSuccessFilter.includes(value)}
                              onCheckedChange={(checked) =>
                                handleCallSuccessFilterChange(value, !!checked)
                              }
                            />
                            <label htmlFor={`success-${value}`} className="text-sm">
                              {value}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Call Status Filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Call Status
                      {callStatusFilter.length > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {callStatusFilter.length}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56" align="start">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Call Status</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="no-call-status"
                            checked={callStatusFilter.includes('No Call')}
                            onCheckedChange={(checked) =>
                              handleCallStatusFilterChange('No Call', !!checked)
                            }
                          />
                          <label htmlFor="no-call-status" className="text-sm">
                            No Call
                          </label>
                        </div>
                        {availableCallStatus.map((value) => (
                          <div key={value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`status-${value}`}
                              checked={callStatusFilter.includes(value)}
                              onCheckedChange={(checked) =>
                                handleCallStatusFilterChange(value, !!checked)
                              }
                            />
                            <label htmlFor={`status-${value}`} className="text-sm">
                              {value}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Clear Filters Button */}
                {/* {getActiveFilterCount() > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearAllFilters}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear Filters ({getActiveFilterCount()})
                  </Button>
                )} */}

                <Button variant="outline" onClick={handleExportOriginalCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={handleExportResults}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Results
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {enrichedData.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        {csvColumns.map((column) => (
                          <TableHead key={column} className="font-semibold whitespace-nowrap min-w-[120px]">
                            <div className="flex items-center gap-2">
                              {getColumnIcon(column)}
                              <span>{getColumnHeader(column)}</span>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((row, index) => (
                        <TableRow key={index}>
                          {csvColumns.map((column) => (
                            <TableCell key={column} className="max-w-[200px] min-w-[120px]">
                              <div className="truncate">
                                {renderCellValue(column, row[column])}
                              </div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {filteredData.length === 0 && searchTerm && (
                  <div className="text-center py-8 text-muted-foreground">
                    No records match your search criteria
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Data</h3>
                <p>No data is available for this batch.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default BatchDetailsPage