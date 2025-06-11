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
import { ArrowLeft, Search, Download, FileText, Users, Clock, Calendar } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { SupabaseService, BatchRecord } from '@/app/services/supabase-service'

interface BatchDetailsPageProps {}

const BatchDetailsPage: React.FC<BatchDetailsPageProps> = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const batchId = searchParams.get('id')
  
  const [batch, setBatch] = useState<BatchRecord | null>(null)
  const [csvData, setCsvData] = useState<any[]>([])
  const [filteredData, setFilteredData] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [csvColumns, setCsvColumns] = useState<string[]>([])
  const { toast } = useToast()

  // Load batch details
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
      setFilteredData(csvData)
      
      // Extract column names from first row
      if (csvData.length > 0) {
        const columns = Object.keys(csvData[0])
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

  // Filter data based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredData(csvData)
      return
    }

    const filtered = csvData.filter(row => {
      return Object.values(row).some(value => 
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    })
    setFilteredData(filtered)
  }, [searchTerm, csvData])

  // Load data on mount
  useEffect(() => {
    loadBatchDetails()
  }, [batchId])

  const handleBack = () => {
    router.push('/batch-calling')
  }

  const handleExportCSV = () => {
    if (csvData.length === 0) {
      toast({
        title: "No Data",
        description: "No CSV data available to export.",
        variant: "destructive",
      })
      return
    }

    // Convert data to CSV format
    const headers = csvColumns.join(',')
    const rows = csvData.map(row => 
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
    link.download = `${batch?.batch_name || 'batch'}_data.csv`
    link.click()
    
    toast({
      title: "Export Successful",
      description: "CSV file has been downloaded.",
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
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

  const getProgress = (completedCalls: number, totalRecipients: number) => {
    if (totalRecipients === 0) return 0
    return Math.round((completedCalls / totalRecipients) * 100)
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
    <div className="container mx-auto px-4 py-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Recipients</p>
                  <p className="text-2xl font-bold">{batch.total_recipients}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
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
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
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
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
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
            </CardContent>
          </Card>
        </div>

        {/* CSV Data Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>CSV Data ({filteredData.length} records)</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Original data from uploaded CSV file
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search CSV data..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button variant="outline" onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {csvData.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        {csvColumns.map((column) => (
                          <TableHead key={column} className="font-semibold">
                            {column}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((row, index) => (
                        <TableRow key={index}>
                          {csvColumns.map((column) => (
                            <TableCell key={column} className="max-w-xs truncate">
                              {row[column] || '-'}
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
                <h3 className="text-lg font-semibold mb-2">No CSV Data</h3>
                <p>No CSV data is available for this batch.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default BatchDetailsPage