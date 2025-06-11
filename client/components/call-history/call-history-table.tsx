'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Phone
} from 'lucide-react'
import { CallRecord } from '@/app/types/call-history'

interface CallHistoryTableProps {
  calls: CallRecord[]
  isLoading: boolean
  onViewDetails: (conversationId: string) => void
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

const CallHistoryTable: React.FC<CallHistoryTableProps> = ({
  calls,
  isLoading,
  onViewDetails,
  currentPage,
  totalPages,
  onPageChange
}) => {
  const formatDateTime = (unixTimestamp: number) => {
    const date = new Date(unixTimestamp * 1000) // Convert Unix timestamp to milliseconds
    return {
      date: date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0s'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  const getStatusBadge = (callSuccess: string | null) => {
    switch (callSuccess) {
      case 'success':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Success
          </Badge>
        )
      case 'failure':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            {callSuccess || 'None'}
          </Badge>
        )
    }
  }

  const getTwilioStatusBadge = (status: string | null) => {
    if (!status) {
      return (
        <Badge variant="secondary">
          None
        </Badge>
      )
    }

    const statusLower = status.toLowerCase()
    
    switch (statusLower) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
            <Phone className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        )
      case 'busy':
        return (
          <Badge variant="default" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
            Busy
          </Badge>
        )
      case 'canceled':
        return (
          <Badge variant="default" className="bg-gray-100 text-gray-800 hover:bg-gray-200">
            Canceled
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive">
            Failed
          </Badge>
        )
      case 'no-answer':
        return (
          <Badge variant="default" className="bg-orange-100 text-orange-800 hover:bg-orange-200">
            No Answer
          </Badge>
        )
      case 'queued':
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
            Queued
          </Badge>
        )
      case 'ringing':
        return (
          <Badge variant="default" className="bg-purple-100 text-purple-800 hover:bg-purple-200">
            Ringing
          </Badge>
        )
      case 'in-progress':
        return (
          <Badge variant="default" className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200">
            In Progress
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            {status}
          </Badge>
        )
    }
  }

  const getNameVerificationBadge = (status: string) => {
    switch (status) {
      case 'Match':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
            Match
          </Badge>
        )
      case 'Partial Match':
        return (
          <Badge variant="default" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
            Partial
          </Badge>
        )
      case 'No Match':
        return (
          <Badge variant="destructive">
            No Match
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            {status || 'None'}
          </Badge>
        )
    }
  }

  const getICVerificationBadge = (status: string) => {
    switch (status) {
      case 'Match':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
            Match
          </Badge>
        )
      case 'No Match':
        return (
          <Badge variant="destructive">
            No Match
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            {status || 'None'}
          </Badge>
        )
    }
  }

  const getCallOutcomeBadge = (outcome: string) => {
    const colorMap: Record<string, string> = {
      'success': 'bg-green-100 text-green-800 hover:bg-green-200',
      'incomplete': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
      'unsuccessful': 'bg-red-100 text-red-800 hover:bg-red-200',
      'busy': 'bg-orange-100 text-orange-800 hover:bg-orange-200',
      'line issue': 'bg-purple-100 text-purple-800 hover:bg-purple-200',
      'user silent': 'bg-gray-100 text-gray-800 hover:bg-gray-200',
      'voicemail': 'bg-blue-100 text-blue-800 hover:bg-blue-200',
      'wrong number': 'bg-pink-100 text-pink-800 hover:bg-pink-200',
      'failed': 'bg-red-100 text-red-800 hover:bg-red-200',
      'unknown': 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    }

    const colorClass = colorMap[outcome] || 'bg-gray-100 text-gray-800 hover:bg-gray-200'

    return (
      <Badge variant="default" className={colorClass}>
        {outcome || 'None'}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading call history...</span>
      </div>
    )
  }

  if (calls.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No calls found</h3>
          <p className="text-muted-foreground">No call records match your current filters.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Twilio Status</TableHead>
              <TableHead>Name Verified</TableHead>
              <TableHead>IC Verified</TableHead>
              <TableHead>Call Outcome</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calls.map((call, index) => {
              const { date, time } = formatDateTime(call.event_timestamp)
              const fullName = call.dynamic_variables?.FullName || 'N/A'
              const nameVerified = call.data_collection_results?.nameVerified?.value || 'None'
              const icVerified = call.data_collection_results?.icVerified?.value || 'None'
              const callOutcome = call.data_collection_results?.callOutcome?.value || 'None'
              
              // Use recipient_id as primary key, fallback to index if that's also null
              const uniqueKey = call.recipient_id || `call-${index}`

              return (
                <TableRow key={uniqueKey}>
                  <TableCell className="font-medium">
                    {fullName}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{date}</span>
                      <span className="text-sm text-muted-foreground">{time}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatDuration(call.call_duration)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(call.call_success)}
                  </TableCell>
                  <TableCell>
                    {getTwilioStatusBadge(call.call_status)}
                  </TableCell>
                  <TableCell>
                    {getNameVerificationBadge(nameVerified)}
                  </TableCell>
                  <TableCell>
                    {getICVerificationBadge(icVerified)}
                  </TableCell>
                  <TableCell>
                    {getCallOutcomeBadge(callOutcome)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(call.conversation_id || call.recipient_id)}
                      disabled={!call.conversation_id}
                      title={!call.conversation_id ? 'No conversation details available' : 'View call details'}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export { CallHistoryTable }