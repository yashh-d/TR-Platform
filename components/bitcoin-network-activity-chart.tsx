"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface BitcoinNetworkActivityChartProps {
  network: string
  height?: string
}

interface NetworkActivityData {
  day: string
  active_address: number
  txn_count: number
  txn_volume_in_btc: number
  volume_in_dollar: number
  avg_txn_size: number
  avg_txn_fee_in_dollar: number
  transaction_throughput: number
  circulating: number
}

export function BitcoinNetworkActivityChart({ 
  network, 
  height = "500px" 
}: BitcoinNetworkActivityChartProps) {
  const [timeRange, setTimeRange] = useState('1Y')
  const [data, setData] = useState<NetworkActivityData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeMetric, setActiveMetric] = useState<'active_address' | 'txn_count' | 'txn_volume_in_btc' | 'volume_in_dollar' | 'avg_txn_size' | 'avg_txn_fee_in_dollar' | 'transaction_throughput' | 'circulating'>('active_address')
  const chartRef = useRef<HTMLDivElement>(null)

  // Available metrics for this chart
  const availableMetrics = [
    { id: 'active_address', label: 'Active Addresses' },
    { id: 'txn_count', label: 'Transaction Count' },
    { id: 'txn_volume_in_btc', label: 'Volume (BTC)' },
    { id: 'volume_in_dollar', label: 'Volume (USD)' },
    { id: 'avg_txn_size', label: 'Avg Txn Size' },
    { id: 'avg_txn_fee_in_dollar', label: 'Avg Txn Fee' },
    { id: 'transaction_throughput', label: 'Throughput (TPB)' },
    { id: 'circulating', label: 'Circulating Supply' }
  ]

  useEffect(() => {
    if (network.toLowerCase() !== "bitcoin") {
      setLoading(false)
      return
    }

    if (!isSupabaseConfigured()) {
      setError("Supabase is not properly configured")
      setLoading(false)
      return
    }

    async function fetchNetworkActivityData() {
      setLoading(true)
      setError(null)
      
      try {
        // Calculate the date filter based on the selected time range
        const currentDate = new Date()
        let filterDate = new Date()
        
        switch (timeRange) {
          case '30D':
            filterDate.setDate(currentDate.getDate() - 30)
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
          case 'ALL':
            filterDate = new Date('2009-01-01') // Bitcoin genesis
            break
        }
        
        const formattedFilterDate = filterDate.toISOString().split('T')[0]
        
        const { data, error } = await supabase
          .from('btc_metrics')
          .select(`
            day,
            active_address,
            txn_count,
            txn_volume_in_btc,
            volume_in_dollar,
            avg_txn_size,
            avg_txn_fee_in_dollar,
            transaction_throughput,
            circulating
          `)
          .gte('day', formattedFilterDate)
          .order('day', { ascending: true })
        
        if (error) {
          throw new Error(`Error fetching Bitcoin network activity data: ${error.message}`)
        }
        
        if (data) {
          setData(data as NetworkActivityData[])
        }
      } catch (err) {
        console.error('Error fetching Bitcoin network activity data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchNetworkActivityData()
  }, [network, timeRange])

  // Format value for display
  const formatValue = (value: number | null): string => {
    if (value === null || value === undefined) return '0'
    
    if (activeMetric === 'avg_txn_fee_in_dollar') {
      return `$${value.toFixed(2)}`
    } else if (activeMetric === 'volume_in_dollar') {
      if (value >= 1000000000) {
        return `$${(value / 1000000000).toFixed(2)}B`
      } else if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(2)}M`
      } else if (value >= 1000) {
        return `$${(value / 1000).toFixed(2)}K`
      } else {
        return `$${value.toFixed(2)}`
      }
    } else if (activeMetric === 'txn_volume_in_btc' || activeMetric === 'circulating') {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(2)}M BTC`
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(2)}K BTC`
      } else {
        return `${value.toFixed(2)} BTC`
      }
    } else if (activeMetric === 'avg_txn_size') {
      return `${value.toFixed(2)} bytes`
    } else if (activeMetric === 'transaction_throughput') {
      return `${value.toFixed(2)} TPB`
    } else {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(2)}M`
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(2)}K`
      } else {
        return value.toFixed(0)
      }
    }
  }

  // Create Plotly chart data
  const createChartData = () => {
    if (!data.length) return null

    const lineColor = "#F7931A" // Bitcoin orange
    const metricInfo = availableMetrics.find(m => m.id === activeMetric)
    const metricLabel = metricInfo ? metricInfo.label : activeMetric
    
    const traces: any[] = [{
      x: data.map(d => d.day),
      y: data.map(d => d[activeMetric]),
      type: 'scatter',
      mode: 'lines',
      name: metricLabel,
      line: {
        color: lineColor,
        width: 2,
        shape: 'spline'
      },
      hoverinfo: 'y+x'
    }]

    // Get appropriate tick format based on metric
    let tickFormat = ',.0f'
    if (activeMetric === 'avg_txn_fee_in_dollar' || activeMetric === 'volume_in_dollar') {
      tickFormat = '$,.2s'
    } else if (activeMetric === 'txn_volume_in_btc' || activeMetric === 'circulating') {
      tickFormat = ',.2f'
    } else if (activeMetric === 'avg_txn_size' || activeMetric === 'transaction_throughput') {
      tickFormat = ',.2f'
    } else {
      tickFormat = ',.0f'
    }

    return {
      data: traces,
      layout: {
        autosize: true,
        margin: { l: 60, r: 20, t: 60, b: 50 },
        xaxis: { 
          gridcolor: "#e5e7eb",
          type: 'date',
          showgrid: true
        },
        yaxis: { 
          title: metricLabel,
          gridcolor: "#e5e7eb",
          titlefont: { color: lineColor },
          showgrid: true,
          tickformat: tickFormat
        },
        plot_bgcolor: "white",
        paper_bgcolor: "white",
        hovermode: "closest",
        colorway: [lineColor],
        showlegend: false
      } as any,
      config: {
        responsive: true,
        displayModeBar: false
      }
    }
  }

  // Effect to render the chart
  useEffect(() => {
    if (!loading && !error && data.length > 0 && chartRef.current) {
      if (typeof window !== 'undefined' && window.Plotly) {
        const chartData = createChartData()
        if (chartData) {
          window.Plotly.newPlot(
            chartRef.current,
            chartData.data,
            chartData.layout,
            chartData.config
          )
        }
      }
    }
  }, [loading, error, data, timeRange, activeMetric, network])

  if (loading) {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading network activity data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-red-500">Error loading network activity data: {error}</div>
        </div>
      </div>
    )
  }

  if (network.toLowerCase() !== "bitcoin") {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-gray-500">Network activity metrics are only available for Bitcoin.</div>
        </div>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-gray-500">No network activity data available.</div>
        </div>
      </div>
    )
  }

  // Get the most recent data for the summary section
  const latestData = data[data.length - 1]

  return (
    <div className="border rounded-lg p-6 mb-6" style={{ height }}>
      <div className="flex flex-wrap items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold">Bitcoin Network Activity & Volume</h2>
        </div>
        
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          {/* Metric Selector */}
          <div className="flex flex-wrap space-x-1 gap-1">
            {availableMetrics.map((metric) => (
              <Button
                key={metric.id}
                variant={activeMetric === metric.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveMetric(metric.id as any)}
                className="text-xs"
                style={{
                  backgroundColor: activeMetric === metric.id ? "#F7931A" : "",
                  borderColor: activeMetric === metric.id ? "#F7931A" : "",
                  color: activeMetric === metric.id ? "white" : "",
                }}
              >
                {metric.label}
              </Button>
            ))}
          </div>
          
          {/* Time Range Selector */}
          <div className="flex space-x-1">
            {['30D', '3M', '6M', '1Y', 'ALL'].map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(range)}
                className="text-xs"
                style={{
                  backgroundColor: timeRange === range ? "#F7931A" : "",
                  borderColor: timeRange === range ? "#F7931A" : "",
                  color: timeRange === range ? "white" : "",
                }}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="h-[300px] relative">
        <div ref={chartRef} className="w-full h-full"></div>
      </div>
    </div>
  )
} 