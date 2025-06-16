'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Search, Filter, MoreHorizontal, Eye, Download, Play, Loader2, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { SupabaseService, BatchRecord } from '@/app/services/supabase-service'
import { BatchCallService } from '@/app/services/batch-call-service'

interface BatchHistoryTableProps {
  onAddBatch: () => void
  newBatch?: BatchRecord | null
}

export const BatchHistoryTable: React.FC<BatchHistoryTableProps> = ({ onAddBatch, newBatch }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [data, setData] = useState<BatchRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [startingBatches, setStartingBatches] = useState<Set<string>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [batchToDelete, setBatchToDelete] = useState<BatchRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  // Load batches from Supabase
  const loadBatches = async () => {
    try {
      setIsLoading(true)
      const batches = await SupabaseService.getBatches()
      setData(batches)
    } catch (error) {
      console.error('Error loading batches:', error)
      toast({
        title: "Error Loading Batches",
        description: "Failed to load batch data from database.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    loadBatches()
  }, [])

  // Add new batch to the table when created
  useEffect(() => {
    if (newBatch) {
      setData(prev => [newBatch, ...prev])
    }
  }, [newBatch])

  const handleStartBatch = async (batch: BatchRecord) => {
    if (!batch.recipientObjects || batch.recipientObjects.length === 0) {
      toast({
        title: "No Recipients",
        description: "This batch has no recipients to call.",
        variant: "destructive",
      })
      return
    }

    setStartingBatches(prev => new Set(prev).add(batch.id))
    
    try {
      console.log(`Starting batch call with ID: ${batch.id}`)
      
      // Update batch status to processing in database
      await SupabaseService.updateBatchStatus(batch.id, 'processing', {
        started_at: new Date().toISOString()
      })

      // Update local state
      setData(prev => prev.map(b => 
        b.id === batch.id 
          ? { ...b, status: 'processing' }
          : b
      ))

      // Pass the existing batch ID to the service
      const result = await BatchCallService.submitBatchCall({
        batchName: batch.batch_name,
        recipients: batch.recipientObjects,
        batchSize: batch.configuration?.batchSize || batch.batchSize || 20,
        intervalMinutes: batch.configuration?.intervalMinutes || batch.intervalMinutes || 5,
        batchId: batch.id // Pass the existing batch ID
      })

      console.log(`Batch call completed with ID: ${result.batchId}`)

      // Update batch status to completed in database
      await SupabaseService.updateBatchStatus(batch.id, 'completed', {
        completed_at: new Date().toISOString()
      })

      // Update local state with results
      setData(prev => prev.map(b => 
        b.id === batch.id 
          ? { 
              ...b, 
              status: 'completed',
              successful_calls: result.successfulCalls,
              failed_calls: result.failedCalls,
              completed_at: new Date().toISOString()
            }
          : b
      ))

      toast({
        title: "Batch Call Completed",
        description: `Successfully completed batch "${batch.batch_name}" with ${result.successfulCalls} successful calls and ${result.failedCalls} failed calls.`,
      })

    } catch (error) {
      console.error('Error starting batch call:', error)
      
      // Update batch status to failed in database
      await SupabaseService.updateBatchStatus(batch.id, 'failed')

      // Update local state
      setData(prev => prev.map(b => 
        b.id === batch.id 
          ? { ...b, status: 'failed' }
          : b
      ))

      toast({
        title: "Batch Call Failed",
        description: "Failed to start the batch call. Please try again.",
        variant: "destructive",
      })
    } finally {
      setStartingBatches(prev => {
        const newSet = new Set(prev)
        newSet.delete(batch.id)
        return newSet
      })
    }
  }

  const handleViewDetails = (batch: BatchRecord) => {
    router.push(`/batch-calling/details?id=${batch.id}`)
  }

  const handleDeleteBatch = (batch: BatchRecord) => {
    setBatchToDelete(batch)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteBatch = async () => {
    if (!batchToDelete) return

    setIsDeleting(true)
    try {
      // Delete from Supabase
      await SupabaseService.deleteBatch(batchToDelete.id)

      // Remove from local state
      setData(prev => prev.filter(b => b.id !== batchToDelete.id))

      toast({
        title: "Batch Deleted",
        description: `Successfully deleted batch "${batchToDelete.batch_name}".`,
      })

      // Close dialog and reset state
      setDeleteDialogOpen(false)
      setBatchToDelete(null)

    } catch (error) {
      console.error('Error deleting batch:', error)
      toast({
        title: "Delete Failed",
        description: "Failed to delete the batch. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const cancelDeleteBatch = () => {
    setDeleteDialogOpen(false)
    setBatchToDelete(null)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getSuccessRate = (successful: number, total: number) => {
    if (total === 0) return 0
    return Math.round((successful / total) * 100)
  }

  const getProgress = (completedCalls: number, totalRecipients: number) => {
    if (totalRecipients === 0) return 0
    return Math.round((completedCalls / totalRecipients) * 100)
  }

  const canStartBatch = (batch: BatchRecord) => {
    return (batch.status === 'Not Running' || batch.status === 'pending') && !startingBatches.has(batch.id)
  }

  const canDeleteBatch = (batch: BatchRecord) => {
    return batch.status !== 'processing' && !startingBatches.has(batch.id)
  }

  // Filter data based on search and status
  const filteredData = data.filter(batch => {
    const matchesSearch = batch.batch_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || batch.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading batches...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardContent>
          {/* Filters */}
          <div className="flex justify-between items-center gap-4 mb-6">
            {/* Left Section: Search + Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search batches..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {/* Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Not Running">Not Running</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Right Section: Add Button */}
            <Button onClick={onAddBatch} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Batch
            </Button>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Name</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Connection</TableHead>
                  <TableHead>Success Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length > 0 ? (
                  filteredData.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium">
                        <div>
                          {batch.batch_name}
                        </div>
                        <div className='text-muted-foreground text-xs opacity-85'>{batch.id}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Total: {batch.total_recipients}</div>
                          <div className="text-muted-foreground">
                            Success: {batch.successful_calls || 0} | Failed: {batch.failed_calls || 0}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {batch.completed_calls || 0}/{batch.total_recipients}
                          </span>
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#60a5fa] transition-all"
                              style={{ 
                                width: `${getProgress(batch.completed_calls || 0, batch.total_recipients)}%` 
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {getProgress(batch.completed_calls || 0, batch.total_recipients)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {batch.total_recipients > 0 && ((batch.successful_calls || 0) > 0 || (batch.failed_calls || 0) > 0) ? (
                          <div className="flex items-center gap-2">
                            <span>{getSuccessRate(batch.successful_calls || 0, batch.total_recipients)}%</span>
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[#4ade80] transition-all"
                                style={{ 
                                  width: `${getSuccessRate(batch.successful_calls || 0, batch.total_recipients)}%` 
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(batch.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(batch.created_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {batch.completed_at ? formatDate(batch.completed_at) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {canStartBatch(batch) && (
                            <Button
                              onClick={() => handleStartBatch(batch)}
                              size="sm"
                              className="flex items-center gap-1"
                            >
                              <Play className="h-3 w-3" />
                              Start
                            </Button>
                          )}
                          
                          {startingBatches.has(batch.id) && (
                            <Button size="sm" disabled className="flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Starting...
                            </Button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetails(batch)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {/* <DropdownMenuItem>
                                <Download className="h-4 w-4 mr-2" />
                                Export Results
                              </DropdownMenuItem> */}
                              {canDeleteBatch(batch) && (
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteBatch(batch)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Batch
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No batches found matching your criteria
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          {filteredData.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredData.length} of {data.length} batches
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Batch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the batch <strong>"{batchToDelete?.batch_name}"</strong>?
              <br /><br />
              This action cannot be undone. All batch data including CSV data and call records will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteBatch} disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteBatch}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Batch
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}