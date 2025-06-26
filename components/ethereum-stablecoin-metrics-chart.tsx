"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface EthereumStablecoinMetricsChartProps {
  network: string
  height?: string
}

interface StablecoinMetricsData {
  date: string
  total_circulating_usd_all: number
  total_circulating_usd_usdt: number
  total_circulating_usd_usdc: number
  total_bridged_to_usd_all: number
  total_bridged_to_usd_usdt: number
  total_bridged_to_usd_usdc: number
}

export function EthereumStablecoinMetricsChart({ 
  network, 
  height = "500px" 
}: EthereumStablecoinMetricsChartProps) {
  const [timeRange, setTimeRange] = useState('1Y')
  const [data, setData] = useState<StablecoinMetricsData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartType, setChartType] = useState<"circulating" | "bridged">("circulating")
  const chartRef = useRef<HTMLDivElement>(null)

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

    async function fetchStablecoinMetricsData() {
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
        }
        
        const formattedFilterDate = filterDate.toISOString().split('T')[0]
        
        const { data, error } = await supabase
          .from('ethereum_stablecoins')
          .select(`
            date,
            total_circulating_usd_all,
            total_circulating_usd_usdt,
            total_circulating_usd_usdc,
            total_bridged_to_usd_all,
            total_bridged_to_usd_usdt,
            total_bridged_to_usd_usdc
          `)
          .gte('date', formattedFilterDate)
          .order('date', { ascending: true })
        
        if (error) {
          throw new Error(`Error fetching Ethereum stablecoin metrics data: ${error.message}`)
        }
        
        if (data) {
          setData(data as StablecoinMetricsData[])
        }
      } catch (err) {
        console.error('Error fetching Ethereum stablecoin metrics data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchStablecoinMetricsData()
  }, [network, timeRange])

  // Format value for display
  const formatValue = (value: number | null): string => {
    if (value === null || value === undefined) return '0'
    
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(2)}B`
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`
    } else {
      return `$${value.toFixed(2)}`
    }
  }

  // Get title based on chart type
  const getChartTitle = (): string => {
    switch (chartType) {
      case "circulating":
        return "Total Circulating Stablecoins on Ethereum"
      case "bridged":
        return "Total Bridged Stablecoins to Ethereum"
      default:
        return "Ethereum Stablecoin Metrics"
    }
  }

  // Create Plotly chart data
  const createChartData = () => {
    if (!data.length) return null

    const traces: any[] = []
    
    if (chartType === "circulating") {
      // Add circulating traces with Ethereum colors
      traces.push({
        x: data.map(d => d.date),
        y: data.map(d => d.total_circulating_usd_all),
        type: 'scatter',
        mode: 'lines',
        name: 'Total Circulating',
        line: {
          color: '#627EEA', // Ethereum blue
          width: 3
        }
      })
      
      traces.push({
        x: data.map(d => d.date),
        y: data.map(d => d.total_circulating_usd_usdt),
        type: 'scatter',
        mode: 'lines',
        name: 'USDT',
        line: {
          color: '#00D4AA', // Cyan/turquoise
          width: 2
        }
      })
      
      traces.push({
        x: data.map(d => d.date),
        y: data.map(d => d.total_circulating_usd_usdc),
        type: 'scatter',
        mode: 'lines',
        name: 'USDC',
        line: {
          color: '#2775CA', // Blue
          width: 2
        }
      })
    } else {
      // Add bridged traces
      traces.push({
        x: data.map(d => d.date),
        y: data.map(d => d.total_bridged_to_usd_all),
        type: 'scatter',
        mode: 'lines',
        name: 'Total Bridged',
        line: {
          color: '#627EEA', // Ethereum blue
          width: 3
        }
      })
      
      traces.push({
        x: data.map(d => d.date),
        y: data.map(d => d.total_bridged_to_usd_usdt),
        type: 'scatter',
        mode: 'lines',
        name: 'Bridged USDT',
        line: {
          color: '#00D4AA', // Cyan/turquoise
          width: 2
        }
      })
      
      traces.push({
        x: data.map(d => d.date),
        y: data.map(d => d.total_bridged_to_usd_usdc),
        type: 'scatter',
        mode: 'lines',
        name: 'Bridged USDC',
        line: {
          color: '#2775CA', // Blue
          width: 2
        }
      })
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
          gridcolor: "#e5e7eb",
          showgrid: true,
          tickformat: '$,.2s'
        },
        plot_bgcolor: "white",
        paper_bgcolor: "white",
        hovermode: "x unified",
        showlegend: true,
        legend: {
          orientation: "h",
          yanchor: "top",
          y: -0.1,
          xanchor: "center",
          x: 0.5,
          bgcolor: "rgba(255,255,255,0.8)",
          bordercolor: "rgba(0,0,0,0.1)",
          borderwidth: 1
        }
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
  }, [loading, error, data, timeRange, chartType, network])

  if (loading) {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading stablecoin metrics data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-red-500">Error loading stablecoin metrics data: {error}</div>
        </div>
      </div>
    )
  }

  if (network.toLowerCase() !== "ethereum") {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-gray-500">Stablecoin metrics are only available for Ethereum.</div>
        </div>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-gray-500">No stablecoin metrics data available.</div>
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
          <h2 className="text-lg font-bold">{getChartTitle()}</h2>
        </div>
        
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          {/* Chart Type Toggle */}
          <div className="flex space-x-1">
            <Button
              variant={chartType === "circulating" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType("circulating")}
              className="text-xs"
              style={{
                backgroundColor: chartType === "circulating" ? "#627EEA" : "",
                borderColor: "#627EEA",
                color: chartType === "circulating" ? "white" : "#627EEA",
              }}
            >
              Circulating
            </Button>
            <Button
              variant={chartType === "bridged" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType("bridged")}
              className="text-xs"
              style={{
                backgroundColor: chartType === "bridged" ? "#627EEA" : "",
                borderColor: "#627EEA",
                color: chartType === "bridged" ? "white" : "#627EEA",
              }}
            >
              Bridged
            </Button>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex space-x-1">
            {['30D', '3M', '6M', '1Y'].map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(range)}
                className="text-xs"
                style={{
                  backgroundColor: timeRange === range ? "#627EEA" : "",
                  borderColor: "#627EEA",
                  color: timeRange === range ? "white" : "#627EEA",
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
      
      {/* Summary Cards */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {chartType === "circulating" ? (
          <>
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">Total Circulating</div>
              <div className="text-lg font-bold">
                {formatValue(latestData?.total_circulating_usd_all || 0)}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">USDT Circulating</div>
              <div className="text-lg font-bold">
                {formatValue(latestData?.total_circulating_usd_usdt || 0)}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">USDC Circulating</div>
              <div className="text-lg font-bold">
                {formatValue(latestData?.total_circulating_usd_usdc || 0)}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">Total Bridged</div>
              <div className="text-lg font-bold">
                {formatValue(latestData?.total_bridged_to_usd_all || 0)}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">Total Bridged</div>
              <div className="text-lg font-bold">
                {formatValue(latestData?.total_bridged_to_usd_all || 0)}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">Bridged USDT</div>
              <div className="text-lg font-bold">
                {formatValue(latestData?.total_bridged_to_usd_usdt || 0)}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">Bridged USDC</div>
              <div className="text-lg font-bold">
                {formatValue(latestData?.total_bridged_to_usd_usdc || 0)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
} 