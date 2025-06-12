'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import {
  Bar,
  BarChart,
  LabelList,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  Cell,
  Label,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
  CartesianGrid
} from 'recharts'
import {
  Phone,
  PhoneCall,
  Clock,
  TrendingUp,
  Users,
  Filter,
  Loader2,
  UserCheck,
  IdCard,
  CheckCircle,
  Activity
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { DashboardService } from '@/app/services/dashboard-service'
import { DashboardData, DashboardFilters } from '@/app/types/dashboard'

const DashboardPage = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [agents, setAgents] = useState<Array<{ id: string, name: string }>>([])
  const [batches, setBatches] = useState<Array<{ id: string, name: string }>>([])
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: 'all',
    agentId: 'all',
    batchId: 'all',
  })
  const { toast } = useToast()

  // Load agents and batches for filtering
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [agentList, batchList] = await Promise.all([
          DashboardService.getAgents(),
          DashboardService.getBatches()
        ])
        setAgents(agentList)
        setBatches(batchList)
      } catch (error) {
        console.error('Error loading filter options:', error)
      }
    }
    loadFilterOptions()
  }, [])

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true)
      try {
        const data = await DashboardService.getDashboardData({ filters })
        setDashboardData(data)
      } catch (error) {
        console.error('Error loading dashboard data:', error)
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [filters, toast])

  // Handle filter changes
  const handleFilterChange = (key: keyof DashboardFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  // Format duration helper
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}m ${secs}s`
  }

  // Chart configurations
  const evaluationResultsConfig = {
    success: {
      label: "Success",
      color: "#52be4f",
    },
    failure: {
      label: "Failure",
      color: "#e23636",
    },
    unknown: {
      label: "Unknown",
      color: "#edb95e",
    },
  } satisfies ChartConfig

  const callOutcomesConfig = {
    count: {
      label: "Count",
    },
    "outcome-1": {
      label: "Outcome 1",
      color: "hsl(var(--chart-1))",
    },
    "outcome-2": {
      label: "Outcome 2",
      color: "hsl(var(--chart-2))",
    },
    "outcome-3": {
      label: "Outcome 3",
      color: "hsl(var(--chart-3))",
    },
    "outcome-4": {
      label: "Outcome 4",
      color: "hsl(var(--chart-4))",
    },
    "outcome-5": {
      label: "Outcome 5",
      color: "hsl(var(--chart-5))",
    },
    "outcome-6": {
      label: "Outcome 6",
      color: "hsl(var(--chart-6))",
    },
    "outcome-7": {
      label: "Outcome 7",
      color: "hsl(var(--chart-7))",
    },
    "outcome-8": {
      label: "Outcome 8",
      color: "hsl(var(--chart-8))",
    },
  } satisfies ChartConfig

  // Updated verification config for stacked chart
  const verificationConfig = {
    match: {
      label: "Match",
      color: "#52be4f",
    },
    partialMatch: {
      label: "Partial Match",
      color: "#edb95e",
    },
    noMatch: {
      label: "No Match",
      color: "#e23636",
    },
  } satisfies ChartConfig

  // Specific color mapping for call outcomes
  const getCallOutcomeColor = (outcome: string): string => {
    const colorMap: { [key: string]: string } = {
      'None': '#2D2D2D',
      'success': '#52be4f',
      'unsuccessful': '#e23636',
      'user silent': '#edb95e',
      'unknown': '#94d2bd',
      'voicemail': '#1260cc'

    }
    
    // Return specific color if mapped, otherwise use a default color
    return colorMap[outcome] || '#94d2bd'
  }

  // Transform verification data for stacked chart
  const verificationStackedData = useMemo(() => {
    if (!dashboardData?.chartData.nameVerification || !dashboardData?.chartData.icVerification) return []

    const getCountByStatus = (data: any[], status: string) => {
      return data.find(item => item.status === status)?.count || 0
    }

    return [
      {
        verification: "Name Verification",
        match: getCountByStatus(dashboardData.chartData.nameVerification, "Match"),
        partialMatch: getCountByStatus(dashboardData.chartData.nameVerification, "Partial Match"),
        noMatch: getCountByStatus(dashboardData.chartData.nameVerification, "No Match"),
      },
      {
        verification: "IC Verification",
        match: getCountByStatus(dashboardData.chartData.icVerification, "Match"),
        partialMatch: 0, // IC verification doesn't have partial match
        noMatch: getCountByStatus(dashboardData.chartData.icVerification, "No Match"),
      }
    ]
  }, [dashboardData?.chartData.nameVerification, dashboardData?.chartData.icVerification])

  // Transform evaluation results data for radial chart
  const evaluationRadialData = useMemo(() => {
    if (!dashboardData?.chartData.evaluationResults) return []

    // Create a single object with all evaluation results
    const dataObj: any = {}
    dashboardData.chartData.evaluationResults.forEach(item => {
      dataObj[item.result] = item.count
    })

    return [dataObj]
  }, [dashboardData?.chartData.evaluationResults])

  // Calculate total for center label
  const totalEvaluations = useMemo(() => {
    return dashboardData?.chartData.evaluationResults.reduce((sum, item) => sum + item.count, 0) || 0
  }, [dashboardData?.chartData.evaluationResults])

  const COLORS = ["#94d2bd", "#bc4749", "#ffd166", "#a7c957", "#6a994e", "#344e41"]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-lg">Loading dashboard...</span>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No Data Available</h3>
          <p className="text-muted-foreground">Unable to load dashboard data.</p>
        </div>
      </div>
    )
  }

  const { stats, chartData } = dashboardData

  return (
    <div className="px-4 mx-auto pb-4 space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <Filter className="h-5 w-5" />
        <div className="flex gap-4">
          <Select
            value={filters.dateRange}
            onValueChange={(value) => handleFilterChange('dateRange', value)}
          >
            <SelectTrigger className="w-40">
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

          <Select
            value={filters.agentId}
            onValueChange={(value) => handleFilterChange('agentId', value)}
          >
            <SelectTrigger className="w-40">
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

          <Select
            value={filters.batchId}
            onValueChange={(value) => handleFilterChange('batchId', value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Batch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches.map((batch) => (
                <SelectItem key={batch.id} value={batch.id}>
                  {batch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
        {/* Total Phone Numbers */}
        <Card>
          <CardContent className="flex items-center justify-between px-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Total Phone Numbers</p>
              <p className="text-2xl font-bold mt-1 truncate">
                {stats.totalPhoneNumbers.toLocaleString()}
              </p>
            </div>
            <Phone className="h-5 w-5 text-[#94d2bd] ml-4 flex-shrink-0" />
          </CardContent>
        </Card>

        {/* Connection Rate */}
        <Card>
          <CardContent className="flex items-center justify-between px-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Connection Rate</p>
              <p className="text-2xl font-bold mt-1 truncate">{stats.connectionRate}%</p>
            </div>
            <TrendingUp className="h-5 w-5 text-[#94d2bd] ml-4 flex-shrink-0" />
          </CardContent>
        </Card>

        {/* Total Connected Numbers */}
        <Card>
          <CardContent className="flex items-center justify-between px-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Connected Numbers</p>
              <p className="text-2xl font-bold mt-1 truncate">{stats.totalConnectedNumbers.toLocaleString()}</p>
            </div>
            <PhoneCall className="h-5 w-5 text-[#94d2bd] ml-4 flex-shrink-0" />
          </CardContent>
        </Card>

        {/* Total Call Duration */}
        <Card>
          <CardContent className="flex items-center justify-between px-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Total Duration</p>
              <p className="text-2xl font-bold mt-1 truncate">{formatDuration(stats.totalCallDuration)}</p>
            </div>
            <Clock className="h-5 w-5 text-[#94d2bd] ml-4 flex-shrink-0" />
          </CardContent>
        </Card>

        {/* Average Call Duration */}
        <Card>
          <CardContent className="flex items-center justify-between px-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Avg Duration</p>
              <p className="text-2xl font-bold mt-1 truncate">{formatDuration(stats.averageCallDuration)}</p>
            </div>
            <Clock className="h-5 w-5 text-[#94d2bd] ml-4 flex-shrink-0" />
          </CardContent>
        </Card>

        {/* Success Rate (based on evaluation criteria) */}
        <Card>
          <CardContent className="flex items-center justify-between px-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="text-2xl font-bold mt-1 truncate">
                {chartData.evaluationResults.length > 0
                  ? Math.round((chartData.evaluationResults.find(r => r.result === 'success')?.count || 0) /
                    chartData.evaluationResults.reduce((sum, r) => sum + r.count, 0) * 100)
                  : 0}%
              </p>
            </div>
            <CheckCircle className="h-5 w-5 text-[#94d2bd] ml-4 flex-shrink-0" />
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
        {/* Evaluation Criteria Results Radial Chart */}
        <Card className='lg:col-span-2'>
          <CardHeader className="items-start pb-0">
            <CardTitle>Evaluation Results</CardTitle>
            <CardDescription>Distribution of call evaluation outcomes</CardDescription>
          </CardHeader>

          {/* Chart and legend side-by-side, legend aligned to chart top */}
          <div className="items-start justify-start px-6">
            {/* Chart - Centered horizontally */}
            <CardContent className="flex items-start justify-center p-0 overflow-hidden h-[80%]">
              <ChartContainer
                config={evaluationResultsConfig}
                className="aspect-square w-[200px]"
              >
                <RadialBarChart
                  data={evaluationRadialData}
                  endAngle={180}
                  innerRadius={80}
                  outerRadius={130}
                  className='mt-6'
                >
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) - 16}
                                className="fill-foreground text-2xl font-bold"
                              >
                                {totalEvaluations.toLocaleString()}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 4}
                                className="fill-muted-foreground"
                              >
                                Total Calls
                              </tspan>
                            </text>
                          )
                        }
                      }}
                    />
                  </PolarRadiusAxis>
                  <RadialBar
                    dataKey="success"
                    stackId="a"
                    cornerRadius={5}
                    fill="var(--color-success)"
                    className="stroke-transparent stroke-2"
                  />
                  <RadialBar
                    dataKey="failure"
                    stackId="a"
                    cornerRadius={5}
                    fill="var(--color-failure)"
                    className="stroke-transparent stroke-2"
                  />
                  <RadialBar
                    dataKey="unknown"
                    stackId="a"
                    cornerRadius={5}
                    fill="var(--color-unknown)"
                    className="stroke-transparent stroke-2"
                  />
                </RadialBarChart>
              </ChartContainer>
            </CardContent>

            {/* Legend aligned to chart top */}
            <CardContent className="flex-col gap-2 text-sm">
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#52be4f' }}></div>
                  <span className="text-sm">Success</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#e23636' }}></div>
                  <span className="text-sm">Failure</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#edb95e' }}></div>
                  <span className="text-sm">Unknown</span>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* Call Outcomes Pie Chart */}
        <Card className='lg:col-span-2'>
          <CardHeader className="items-start pb-0">
            <CardTitle>Call Outcomes</CardTitle>
            <CardDescription>Distribution of call outcome types</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-row items-center justify-between gap-6 px-6 pb-4">
            {/* Legend - Left Side */}
            <div className="flex flex-col justify-center gap-3 text-sm min-w-[120px]">
              {chartData.callOutcomes.map((entry) => (
                <div key={entry.outcome} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getCallOutcomeColor(entry.outcome) }}
                  ></div>
                  <span className="text-xs truncate" title={entry.outcome}>
                    {entry.outcome}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {entry.count}
                  </span>
                </div>
              ))}
            </div>

            {/* Pie Chart - Centered */}
            <div className="flex items-center justify-center flex-1">
              <ChartContainer
                config={callOutcomesConfig}
                className="aspect-square w-[200px]"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={chartData.callOutcomes}
                    dataKey="count"
                    nameKey="outcome"
                    innerRadius={50}
                    stroke="0"
                  >
                    {chartData.callOutcomes.map((entry) => (
                      <Cell 
                        key={`cell-${entry.outcome}`} 
                        fill={getCallOutcomeColor(entry.outcome)} 
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* Combined Verification Results Stacked Bar Chart */}
        <Card className='lg:col-span-2'>
          <CardHeader>
            <CardTitle>Verification Results</CardTitle>
            <CardDescription>Distribution of name and IC verification outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={verificationConfig}>
              <BarChart
                accessibilityLayer
                data={verificationStackedData}
                margin={{
                  top: 20,
                  right: 12,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="verification"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="match"
                  stackId="a"
                  fill="var(--color-match)"
                  radius={[0, 0, 4, 4]}
                />
                <Bar
                  dataKey="partialMatch"
                  stackId="a"
                  fill="var(--color-partialMatch)"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="noMatch"
                  stackId="a"
                  fill="var(--color-noMatch)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DashboardPage