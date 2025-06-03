"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface EthereumSupplyMetricsChartProps {
  network: string
  height?: string
}

interface SupplyMetricsData {
  dt: string
  circulating_supply: number
  daily_issuance: number
  daily_burn: number
  daily_supply_change: number
}

export function EthereumSupplyMetricsChart({ 
  network, 
  height = "400px" 
}: EthereumSupplyMetricsChartProps) {
  const [timeRange, setTimeRange] = useState('1Y')
  const [data, setData] = useState<SupplyMetricsData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeMetric, setActiveMetric] = useState<'circulating_supply' | 'daily_issuance' | 'daily_burn' | 'daily_supply_change'>('circulating_supply')
  const chartRef = useRef<HTMLDivElement>(null)

  // Available metrics for this chart
  const availableMetrics = [
    { id: 'circulating_supply', label: 'Circulating Supply' },
    { id: 'daily_issuance', label: 'Daily Issuance' },
    { id: 'daily_burn', label: 'Daily Burn' },
    { id: 'daily_supply_change', label: 'Daily Supply Change' }
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

    async function fetchSupplyMetricsData() {
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
            filterDate = new Date('2015-07-01') // Ethereum mainnet launch
            break
        }
        
        const formattedFilterDate = filterDate.toISOString()
        
        const { data, error } = await supabase
          .from('ethereum')
          .select(`
            dt,
            circulating_supply,
            daily_issuance,
            daily_burn,
            daily_supply_change
          `)
          .gte('dt', formattedFilterDate)
          .order('dt', { ascending: true })
        
        if (error) {
          throw new Error(`Error fetching Ethereum supply metrics data: ${error.message}`)
        }
        
        if (data) {
          setData(data as SupplyMetricsData[])
        }
      } catch (err) {
        console.error('Error fetching Ethereum supply metrics data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchSupplyMetricsData()
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
          tickformat: activeMetric === 'circulating_supply' ? ',.0f' : ',.2f'
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
          <div className="animate-pulse text-gray-400">Loading supply metrics data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-red-500">Error loading supply metrics data: {error}</div>
        </div>
      </div>
    )
  }

  if (network.toLowerCase() !== "ethereum") {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-gray-500">Supply metrics are only available for Ethereum.</div>
        </div>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-gray-500">No supply metrics data available.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-6" style={{ height }}>
      <div className="flex flex-wrap items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold">Ethereum Supply Metrics</h2>
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