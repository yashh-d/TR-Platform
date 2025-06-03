"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface BitcoinMiningMetricsChartProps {
  network: string
  height?: string
}

interface MiningMetricsData {
  day: string
  hash_rate: number
  miner_revenue: number
  avg_difficulty: number
  puell_multiple: number
  total_mint: number
  total_fees: number
  miner_income: number
  fee_to_reward_ratio: number
  hash_price: number
}

export function BitcoinMiningMetricsChart({ 
  network, 
  height = "500px" 
}: BitcoinMiningMetricsChartProps) {
  const [timeRange, setTimeRange] = useState('1Y')
  const [data, setData] = useState<MiningMetricsData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeMetric, setActiveMetric] = useState<'hash_rate' | 'miner_revenue' | 'avg_difficulty' | 'puell_multiple' | 'total_mint' | 'total_fees' | 'miner_income' | 'fee_to_reward_ratio' | 'hash_price'>('hash_rate')
  const chartRef = useRef<HTMLDivElement>(null)

  // Available metrics for this chart
  const availableMetrics = [
    { id: 'hash_rate', label: 'Hash Rate' },
    { id: 'miner_revenue', label: 'Miner Revenue' },
    { id: 'avg_difficulty', label: 'Average Difficulty' },
    { id: 'puell_multiple', label: 'Puell Multiple' },
    { id: 'total_mint', label: 'Total Mint' },
    { id: 'total_fees', label: 'Total Fees' },
    { id: 'miner_income', label: 'Miner Income' },
    { id: 'fee_to_reward_ratio', label: 'Fee to Reward Ratio' },
    { id: 'hash_price', label: 'Hash Price' }
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

    async function fetchMiningMetricsData() {
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
            hash_rate,
            miner_revenue,
            avg_difficulty,
            puell_multiple,
            total_mint,
            total_fees,
            miner_income,
            fee_to_reward_ratio,
            hash_price
          `)
          .gte('day', formattedFilterDate)
          .order('day', { ascending: true })
        
        if (error) {
          throw new Error(`Error fetching Bitcoin mining metrics data: ${error.message}`)
        }
        
        if (data) {
          setData(data as MiningMetricsData[])
        }
      } catch (err) {
        console.error('Error fetching Bitcoin mining metrics data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchMiningMetricsData()
  }, [network, timeRange])

  // Format value for display
  const formatValue = (value: number | null): string => {
    if (value === null || value === undefined) return '0'
    
    if (activeMetric === 'hash_rate') {
      if (value >= 1000000000000000) {
        return `${(value / 1000000000000000).toFixed(2)} EH/s`
      } else if (value >= 1000000000000) {
        return `${(value / 1000000000000).toFixed(2)} TH/s`
      } else {
        return `${(value / 1000000000).toFixed(2)} GH/s`
      }
    } else if (activeMetric === 'miner_revenue' || activeMetric === 'miner_income' || activeMetric === 'total_fees' || activeMetric === 'hash_price') {
      if (value >= 1000000000) {
        return `$${(value / 1000000000).toFixed(2)}B`
      } else if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(2)}M`
      } else if (value >= 1000) {
        return `$${(value / 1000).toFixed(2)}K`
      } else {
        return `$${value.toFixed(2)}`
      }
    } else if (activeMetric === 'total_mint') {
      return `${value.toFixed(2)} BTC`
    } else if (activeMetric === 'puell_multiple' || activeMetric === 'fee_to_reward_ratio') {
      return value.toFixed(3)
    } else if (activeMetric === 'avg_difficulty') {
      if (value >= 1000000000000) {
        return `${(value / 1000000000000).toFixed(2)}T`
      } else if (value >= 1000000000) {
        return `${(value / 1000000000).toFixed(2)}B`
      } else {
        return `${(value / 1000000).toFixed(2)}M`
      }
    } else {
      return value.toFixed(2)
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
    if (activeMetric === 'miner_revenue' || activeMetric === 'miner_income' || activeMetric === 'total_fees' || activeMetric === 'hash_price') {
      tickFormat = '$,.2s'
    } else if (activeMetric === 'hash_rate') {
      tickFormat = '.2s'
    } else if (activeMetric === 'puell_multiple' || activeMetric === 'fee_to_reward_ratio') {
      tickFormat = '.3f'
    } else if (activeMetric === 'total_mint') {
      tickFormat = ',.2f'
    } else {
      tickFormat = '.2s'
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
          <div className="animate-pulse text-gray-400">Loading mining metrics data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-red-500">Error loading mining metrics data: {error}</div>
        </div>
      </div>
    )
  }

  if (network.toLowerCase() !== "bitcoin") {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-gray-500">Mining metrics are only available for Bitcoin.</div>
        </div>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-gray-500">No mining metrics data available.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-6 mb-6" style={{ height }}>
      <div className="flex flex-wrap items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold">Bitcoin Mining & Security Metrics</h2>
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