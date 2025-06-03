"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface EthereumStakingMetricsChartProps {
  network: string
  height?: string
}

interface StakingMetricsData {
  dt: string
  eth_staked: number
  staking_ratio_percent: number
  validators: number
}

export function EthereumStakingMetricsChart({ 
  network, 
  height = "400px" 
}: EthereumStakingMetricsChartProps) {
  const [timeRange, setTimeRange] = useState('1Y')
  const [data, setData] = useState<StakingMetricsData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeMetric, setActiveMetric] = useState<'eth_staked' | 'staking_ratio_percent' | 'validators'>('eth_staked')
  const chartRef = useRef<HTMLDivElement>(null)

  // Available metrics for this chart
  const availableMetrics = [
    { id: 'eth_staked', label: 'ETH Staked' },
    { id: 'staking_ratio_percent', label: 'Staking Ratio %' },
    { id: 'validators', label: 'Validators' }
  ]

  useEffect(() => {
    if (network.toLowerCase() !== "ethereum") {
      setLoading(false)
      return
    }

    if (!isSupabaseConfigured()) {
      setError("Supabase is not properly configured")
      setLoading(false)
      return
    }

    async function fetchStakingMetricsData() {
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
          case 'ALL':
            filterDate = new Date('2020-12-01') // Ethereum 2.0 beacon chain launch
            break
        }
        
        const formattedFilterDate = filterDate.toISOString()
        
        const { data, error } = await supabase
          .from('ethereum')
          .select(`
            dt,
            eth_staked,
            staking_ratio_percent,
            validators
          `)
          .gte('dt', formattedFilterDate)
          .order('dt', { ascending: true })
        
        if (error) {
          throw new Error(`Error fetching Ethereum staking metrics data: ${error.message}`)
        }
        
        if (data) {
          setData(data as StakingMetricsData[])
        }
      } catch (err) {
        console.error('Error fetching Ethereum staking metrics data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchStakingMetricsData()
  }, [network, timeRange])

  // Create Plotly chart data
  const createChartData = () => {
    if (!data.length) return null

    const lineColor = "#627EEA" // Ethereum blue
    const metricInfo = availableMetrics.find(m => m.id === activeMetric)
    const metricLabel = metricInfo ? metricInfo.label : activeMetric
    
    const traces: any[] = [{
      x: data.map(d => d.dt),
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

    return {
      data: traces,
      layout: {
        title: `Ethereum ${metricLabel}`,
        autosize: true,
        margin: { l: 60, r: 20, t: 40, b: 50 },
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
          tickformat: activeMetric === 'staking_ratio_percent' ? '.2f' : 
                     activeMetric === 'eth_staked' ? ',.2s' : 
                     ',.0f',
          ticksuffix: activeMetric === 'staking_ratio_percent' ? '%' : ''
        },
        plot_bgcolor: "white",
        paper_bgcolor: "white",
        hovermode: "closest",
        colorway: [lineColor]
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
          <div className="animate-pulse text-gray-400">Loading staking metrics data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-red-500">Error loading staking metrics data: {error}</div>
        </div>
      </div>
    )
  }

  if (network.toLowerCase() !== "ethereum") {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-gray-500">Staking metrics are only available for Ethereum.</div>
        </div>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-gray-500">No staking metrics data available.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-6" style={{ height }}>
      <div className="flex flex-wrap items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold">Ethereum Staking Metrics</h2>
        </div>
        
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          {/* Metric Selector */}
          <div className="flex space-x-1">
            {availableMetrics.map((metric) => (
              <Button
                key={metric.id}
                variant={activeMetric === metric.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveMetric(metric.id as any)}
                className="text-xs"
                style={{
                  backgroundColor: activeMetric === metric.id ? "#627EEA" : "",
                  borderColor: activeMetric === metric.id ? "#627EEA" : "",
                  color: activeMetric === metric.id ? "white" : "",
                }}
              >
                {metric.label}
              </Button>
            ))}
          </div>
          
          {/* Time Range Selector */}
          <div className="flex space-x-1">
            {['1M', '3M', '6M', '1Y', 'ALL'].map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(range)}
                className="text-xs"
                style={{
                  backgroundColor: timeRange === range ? "#627EEA" : "",
                  borderColor: timeRange === range ? "#627EEA" : "",
                  color: timeRange === range ? "white" : "",
                }}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="h-[350px] relative">
        <div ref={chartRef} className="w-full h-full"></div>
      </div>
    </div>
  )
} 