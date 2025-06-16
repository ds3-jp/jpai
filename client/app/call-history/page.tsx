'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  History,
  Search,
  Filter,
  Eye,
  Phone,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  UserCheck,
  IdCard,
  PhoneCall
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { CallHistoryTable } from '@/components/call-history/call-history-table'
import { CallDetailsSidePanel } from '@/components/call-history/call-details-side-panel'
import { CallHistoryService } from '@/app/services/call-history-service'
import { CallRecord, CallFilters } from '@/app/types/call-history'

const ITEMS_PER_PAGE = 20

const CallHistoryPage = () => {
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [agents, setAgents] = useState<Array<{ id: string, name: string }>>([])
  const [twilioStatuses, setTwilioStatuses] = useState<string[]>([])
  const [filters, setFilters] = useState<CallFilters>({
    status: 'all',
    dateRange: 'all',
    agentId: 'all',
    nameVerified: 'all',
    icVerified: 'all',
    callOutcome: 'all',
    twilioStatus: 'all',
  })
  const { toast } = useToast()

  // Load agents and Twilio statuses for filtering
  useEffect(() => {
    const loadFilterData = async () => {
      try {
        const [agentList, statusList] = await Promise.all([
          CallHistoryService.getAgents(),
          CallHistoryService.getTwilioStatuses()
        ])
        setAgents(agentList)
        setTwilioStatuses(statusList)
      } catch (error) {
        console.error('Error loading filter data:', error)
      }
    }
    loadFilterData()
  }, [])

  // Load call history data
  useEffect(() => {
    const loadCallHistory = async () => {
      setIsLoading(true)
      try {
        const response = await CallHistoryService.getCallHistory({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: searchTerm,
          filters,
        })

        setCalls(response.calls)
        setTotalCount(response.totalCount)
      } catch (error) {
        console.error('Error loading call history:', error)
        toast({
          title: 'Error',
          description: 'Failed to load call history. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    // Debounce search
    const timeoutId = setTimeout(loadCallHistory, 300)
    return () => clearTimeout(timeoutId)
  }, [currentPage, searchTerm, filters, toast])

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, totalCount)

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Reset to first page when searching
  }

  // Handle filter changes
  const handleFilterChange = (key: keyof CallFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  // Handle call details view
  const handleViewDetails = (conversationId: string) => {
    setSelectedCallId(conversationId)
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Get status statistics
  const statusStats = useMemo(() => {
    const successful = calls.filter(call => call.call_success === 'success').length
    const failed = calls.filter(call => call.call_success === 'failure').length
    const unknown = calls.filter(call => call.call_success === 'unknown').length
    const totalcalls = successful + failed + unknown
    const nameMatched = calls.filter(call =>
      call.data_collection_results?.nameVerified?.value === 'Match'
    ).length
    const icMatched = calls.filter(call =>
      call.data_collection_results?.icVerified?.value === 'Match'
    ).length
    const successfulOutcomes = calls.filter(call =>
      call.data_collection_results?.callOutcome?.value === 'success'
    ).length
    const twilioCompleted = calls.filter(call =>
      call.call_status?.toLowerCase() === 'completed'
    ).length

    return {
      totalcalls,
      successful,
      failed,
      total: calls.length,
      nameMatched,
      icMatched,
      successfulOutcomes,
      twilioCompleted
    }
  }, [calls])

  return (
    <div className="mx-auto px-4 pb-4 space-y-4" suppressHydrationWarning>
      {/* Header
      <div className="flex items-center gap-2">
        <History className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Call History</h1>
      </div> */}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
        {/* Total Calls */}
        <Card>
          <CardContent className="relative px-4">
            <Phone className="absolute top-4 right-4 h-5 w-5 text-[#9ca3af]" />
            <p className="text-sm text-muted-foreground">Total Calls</p>
            <p className="text-2xl font-bold">{statusStats.totalcalls}</p>
          </CardContent>
        </Card>

        {/* Twilio Completed */}
        <Card>
          <CardContent className="relative px-4">
            <PhoneCall className="absolute top-4 right-4 h-5 w-5 text-[#34d399]" />
            <p className="text-sm text-muted-foreground">Twilio Completed</p>
            <p className="text-2xl font-bold">{statusStats.twilioCompleted}</p>
          </CardContent>
        </Card>

        {/* Successful Calls */}
        <Card>
          <CardContent className="relative px-4">
            <CheckCircle className="absolute top-4 right-4 h-5 w-5 text-[#4ade80]" />
            <p className="text-sm text-muted-foreground">Successful</p>
            <p className="text-2xl font-bold">{statusStats.successful}</p>
          </CardContent>
        </Card>

        {/* Failed Calls */}
        <Card>
          <CardContent className="relative px-4">
            <XCircle className="absolute top-4 right-4 h-5 w-5 text-[#f87171]" />
            <p className="text-sm text-muted-foreground">Failed</p>
            <p className="text-2xl font-bold">{statusStats.failed}</p>
          </CardContent>
        </Card>

        {/* Name Verified */}
        <Card>
          <CardContent className="relative px-4">
            <UserCheck className="absolute top-4 right-4 h-5 w-5 text-[#22d3ee]" />
            <p className="text-sm text-muted-foreground">Name Matched</p>
            <p className="text-2xl font-bold">{statusStats.nameMatched}</p>
          </CardContent>
        </Card>

        {/* IC Verified */}
        <Card>
          <CardContent className="relative px-4">
            <IdCard className="absolute top-4 right-4 h-5 w-5 text-[#22d3ee]" />
            <p className="text-sm text-muted-foreground">IC Matched</p>
            <p className="text-2xl font-bold">{statusStats.icMatched}</p>
          </CardContent>
        </Card>
      </div>



      {/* Filters and Search */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-9 gap-4 items-start">
        {/* Search */}
        <div className="xl:col-span-2">
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Search
          </label>
          <Input
            placeholder="Search by name or conversation ID..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Status
          </label>
          <Select
            value={filters.status}
            onValueChange={(value) => handleFilterChange('status', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="successful">Successful</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Date Range
          </label>
          <Select
            value={filters.dateRange}
            onValueChange={(value) => handleFilterChange('dateRange', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Agent Filter */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Agent
          </label>
          <Select
            value={filters.agentId}
            onValueChange={(value) => handleFilterChange('agentId', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Twilio Status Filter */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Twilio Status
          </label>
          <Select
            value={filters.twilioStatus || 'all'}
            onValueChange={(value) => handleFilterChange('twilioStatus', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Twilio Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Twilio Status</SelectItem>
              {twilioStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Name Verification Filter */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Name Verification
          </label>
          <Select
            value={filters.nameVerified || 'all'}
            onValueChange={(value) => handleFilterChange('nameVerified', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Name Verified" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Names</SelectItem>
              <SelectItem value="Match">Match</SelectItem>
              <SelectItem value="Partial Match">Partial Match</SelectItem>
              <SelectItem value="No Match">No Match</SelectItem>
              <SelectItem value="None">None</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* IC Verification Filter */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            IC Verification
          </label>
          <Select
            value={filters.icVerified || 'all'}
            onValueChange={(value) => handleFilterChange('icVerified', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="IC Verified" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All IC</SelectItem>
              <SelectItem value="Match">Match</SelectItem>
              <SelectItem value="No Match">No Match</SelectItem>
              <SelectItem value="None">None</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Call Outcome Filter */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Call Outcome
          </label>
          <Select
            value={filters.callOutcome || 'all'}
            onValueChange={(value) => handleFilterChange('callOutcome', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Call Outcome" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outcomes</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="incomplete">Incomplete</SelectItem>
              <SelectItem value="unsuccessful">Unsuccessful</SelectItem>
              <SelectItem value="busy">Busy</SelectItem>
              <SelectItem value="line issue">Line Issue</SelectItem>
              <SelectItem value="user silent">User Silent</SelectItem>
              <SelectItem value="voicemail">Voicemail</SelectItem>
              <SelectItem value="wrong number">Wrong Number</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
              <SelectItem value="None">None</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Call History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Call Records</CardTitle>
              <CardDescription>
                {isLoading ? (
                  'Loading call history...'
                ) : (
                  `Showing ${startIndex}-${endIndex} of ${totalCount} calls`
                )}
              </CardDescription>
            </div>
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <CallHistoryTable
            calls={calls}
            isLoading={isLoading}
            onViewDetails={handleViewDetails}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </CardContent>
      </Card>

      {/* Call Details Side Panel */}
      <CallDetailsSidePanel
        conversationId={selectedCallId}
        isOpen={!!selectedCallId}
        onClose={() => setSelectedCallId(null)}
      />
    </div>
  )
}

export default CallHistoryPage