"use client"

import { useState, useEffect, useRef } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Download, BarChart } from "lucide-react"

interface AaveOperationsData {
  operation_date: string
  operation_type: string
  transactions: number
  users: number
  volume: number
}

interface AaveOperationsChartProps {
  network: string
  height?: string
}

export function AaveOperationsChart({ 
  network, 
  height = "500px" 
}: AaveOperationsChartProps) {
  const [timeRange, setTimeRange] = useState('3M')
  const [data, setData] = useState<AaveOperationsData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeMetric, setActiveMetric] = useState<'volume' | 'transactions' | 'users'>('volume')
  const chartRef = useRef<HTMLDivElement>(null)

  // Available metrics for this chart
  const availableMetrics = [
    { id: 'volume', label: 'Volume (USD)', format: (val: number) => `$${(val / 1000000).toFixed(2)}M` },
    { id: 'transactions', label: 'Transactions', format: (val: number) => val.toLocaleString() },
    { id: 'users', label: 'Users', format: (val: number) => val.toLocaleString() }
  ]

  useEffect(() => {
    if (network.toLowerCase() !== "avalanche") {
      setLoading(false)
      return
    }

    if (!isSupabaseConfigured()) {
      setError("Supabase is not properly configured")
      setLoading(false)
      return
    }

    async function fetchAaveOperationsData() {
      setLoading(true)
      setError(null)
      
      try {
        // Calculate the date filter based on the selected time range
        const currentDate = new Date()
        let filterDate = new Date()
        
        switch (timeRange) {
          case '1M':
            filterDate.setMonth(currentDate.getMonth() - 1)
            break
          case '3M':
            filterDate.setMonth(currentDate.getMonth() - 3)
            break
          case '6M':
            filterDate.setMonth(currentDate.getMonth() - 6)
            break
          case '1Y':
          default:
            filterDate.setFullYear(currentDate.getFullYear() - 1)
            break
        }
        
        const formattedFilterDate = filterDate.toISOString().split('T')[0]
        
        const { data, error } = await supabase
          .from('aave_v3_operations')
          .select(`
            operation_date,
            operation_type,
            transactions,
            users,
            volume
          `)
          .eq('blockchain', 'avalanche_c')
          .gte('operation_date', formattedFilterDate)
          .order('operation_date', { ascending: true })
        
        if (error) {
          throw new Error(`Error fetching Aave operations data: ${error.message}`)
        }
        
        if (data) {
          setData(data as AaveOperationsData[])
        }
      } catch (err) {
        console.error('Error fetching Aave operations data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchAaveOperationsData()
  }, [network, timeRange])

  // Create chart when data changes
  useEffect(() => {
    if (!data || data.length === 0 || !chartRef.current) return

    createChart()
  }, [data, activeMetric])

  const createChart = () => {
    if (!chartRef.current || !data.length) return

    // Group data by date and operation type
    const groupedData = data.reduce((acc, item) => {
      const date = item.operation_date
      if (!acc[date]) {
        acc[date] = { date, deposit: null, borrow: null }
      }
      acc[date][item.operation_type as 'deposit' | 'borrow'] = item
      return acc
    }, {} as Record<string, { date: string, deposit: AaveOperationsData | null, borrow: AaveOperationsData | null }>)

    const chartData = Object.values(groupedData).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Format dates based on time range
    const formatDateForDisplay = (dateStr: string) => {
      const date = new Date(dateStr)
      if (timeRange === '1M') {
        // For 1M, show day-month format (e.g., "15 Jan")
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
      } else {
        // For longer periods, show month-year format (e.g., "Jan 2024")
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      }
    }

    // For longer time ranges, we might want to aggregate data by month
    let finalChartData = chartData
    let xAxisLabels = chartData.map(d => formatDateForDisplay(d.date))

    if (timeRange !== '1M') {
      // Group by month for longer time ranges to reduce clutter
      const monthlyData = chartData.reduce((acc, item) => {
        const monthKey = new Date(item.date).toISOString().slice(0, 7) // YYYY-MM format
        if (!acc[monthKey]) {
          acc[monthKey] = {
            date: monthKey + '-01', // Use first day of month for consistency
            deposit: { operation_date: monthKey + '-01', operation_type: 'deposit', transactions: 0, users: 0, volume: 0 },
            borrow: { operation_date: monthKey + '-01', operation_type: 'borrow', transactions: 0, users: 0, volume: 0 }
          }
        }
        
        if (item.deposit) {
          acc[monthKey].deposit.transactions += item.deposit.transactions
          acc[monthKey].deposit.users += item.deposit.users
          acc[monthKey].deposit.volume += item.deposit.volume
        }
        if (item.borrow) {
          acc[monthKey].borrow.transactions += item.borrow.transactions
          acc[monthKey].borrow.users += item.borrow.users
          acc[monthKey].borrow.volume += item.borrow.volume
        }
        
        return acc
      }, {} as Record<string, { date: string, deposit: AaveOperationsData, borrow: AaveOperationsData }>)

      finalChartData = Object.values(monthlyData).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      xAxisLabels = finalChartData.map(d => formatDateForDisplay(d.date))
    }

    const traces = [
      {
        x: xAxisLabels,
        y: finalChartData.map(d => d.deposit ? d.deposit[activeMetric] : 0),
        name: 'Deposits',
        type: 'bar',
        marker: { color: '#10B981' }, // Green for deposits
        hovertemplate: `<b>Deposits</b><br>Period: %{x}<br>Value: %{y}<extra></extra>`
      },
      {
        x: xAxisLabels,
        y: finalChartData.map(d => d.borrow ? d.borrow[activeMetric] : 0),
        name: 'Borrows',
        type: 'bar',
        marker: { color: '#EF4444' }, // Red for borrows
        hovertemplate: `<b>Borrows</b><br>Period: %{x}<br>Value: %{y}<extra></extra>`
      }
    ]

    const layout = {
      title: {
        text: `Aave v3 ${availableMetrics.find(m => m.id === activeMetric)?.label || 'Metrics'} on Avalanche`,
        font: { size: 16, color: '#1f2937' }
      },
      xaxis: {
        title: timeRange === '1M' ? 'Date' : 'Month',
        type: 'category',
        tickangle: timeRange === '1M' ? -45 : -30,
        tickmode: 'array',
        tickvals: xAxisLabels,
        ticktext: xAxisLabels,
        automargin: true
      },
      yaxis: {
        title: availableMetrics.find(m => m.id === activeMetric)?.label || 'Value',
        tickformat: activeMetric === 'volume' ? '$,.2s' : ',d'
      },
      barmode: 'group',
      hovermode: 'x unified',
      showlegend: true,
      legend: {
        orientation: 'h',
        y: -0.2
      },
      margin: { l: 60, r: 30, t: 60, b: 100 },
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)',
      font: { family: 'Inter, sans-serif' }
    }

    const config = {
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d', 'autoScale2d'],
      responsive: true
    }

    // @ts-ignore
    if (typeof window !== 'undefined' && window.Plotly) {
      // @ts-ignore
      window.Plotly.newPlot(chartRef.current, traces, layout, config)
    }
  }

  const exportData = () => {
    if (!data.length) return
    
    const csvContent = [
      ['Date', 'Operation Type', 'Transactions', 'Users', 'Volume'].join(','),
      ...data.map(item => [
        item.operation_date,
        item.operation_type,
        item.transactions,
        item.users,
        item.volume.toFixed(2)
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aave-operations-${network}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <BarChart className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Aave v3</h3>
          </div>
        </div>
        <Skeleton className="w-full h-96" />
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <BarChart className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Aave v3</h3>
          </div>
        </div>
        <div className="text-center text-red-600 py-8">
          <p>{error}</p>
        </div>
      </Card>
    )
  }

  if (!data.length) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <BarChart className="h-5 w-5" />
            <h3 className="text-lg font-semibent">Aave v3</h3>
          </div>
        </div>
        <div className="text-center text-gray-500 py-8">
          <p>No Aave data available for the selected time range.</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <BarChart className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Aave v3 on Avalanche</h3>
        </div>
        <Button variant="outline" size="sm" onClick={exportData}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Metric Selection */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium text-gray-700 self-center">Metric:</span>
          {availableMetrics.map((metric) => (
            <Button
              key={metric.id}
              variant={activeMetric === metric.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveMetric(metric.id as typeof activeMetric)}
            >
              {metric.label}
            </Button>
          ))}
        </div>

        {/* Time Range Selection */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium text-gray-700 self-center">Time:</span>
          {['1M', '3M', '6M', '1Y'].map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div 
        ref={chartRef} 
        style={{ height, width: '100%' }}
        className="border rounded"
      />
    </Card>
  )
} 