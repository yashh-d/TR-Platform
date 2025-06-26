"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface StablecoinMetricsChartProps {
  network: string;
  metric?: "total" | "bridged";
  title?: string;
}

interface StablecoinData {
  date: string;
  total_circulating_usd_all: number;
  total_circulating_usd_usdt: number;
  total_circulating_usd_usdc: number;
  total_bridged_to_usd_all: number;
  total_bridged_to_usd_usdt: number;
  total_bridged_to_usd_usdc: number;
}

export function StablecoinMetricsChart({ 
  network, 
  metric = "total",
  title
}: StablecoinMetricsChartProps) {
  const [timeRange, setTimeRange] = useState('1Y')
  const [stablecoinData, setStablecoinData] = useState<StablecoinData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    // Only fetch for Avalanche network
    if (network.toLowerCase() !== "avalanche") {
      setLoading(false)
      return
    }

    if (!isSupabaseConfigured()) {
      setError("Supabase is not properly configured")
      setLoading(false)
      return
    }

    async function fetchStablecoinData() {
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
            // More reliable way to calculate 1 year ago
            filterDate = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), currentDate.getDate())
            break
        }
        
        // Format the date as YYYY-MM-DD
        const formattedFilterDate = filterDate.toISOString().split('T')[0]
        
        // Query the stablecoins table directly
        const { data, error } = await supabase
          .from('avalanche_stablecoins')
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
          throw new Error(`Error fetching stablecoin data: ${error.message}`)
        }
        
        if (data) {
          setStablecoinData(data as StablecoinData[])
        }
      } catch (err) {
        console.error('Error fetching stablecoin data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchStablecoinData()
  }, [network, timeRange])
  
  // Format value for display
  const formatValue = (value: number | null): string => {
    if (value === null || value === undefined) return '0'
    
    // Format to millions or billions with 2 decimal places
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
    if (title) return title
    return "Circulating Stablecoins on Avalanche"
  }
  
  // Create Plotly chart data
  const createChartData = () => {
    // Always show total circulating traces
    const traces = [
      {
        x: stablecoinData.map(d => d.date),
        y: stablecoinData.map(d => d.total_circulating_usd_all),
        type: 'scatter',
        mode: 'lines',
        name: 'Total Circulating',
        line: {
          color: '#E84142',
          width: 3
        }
      },
      {
        x: stablecoinData.map(d => d.date),
        y: stablecoinData.map(d => d.total_circulating_usd_usdt),
        type: 'scatter',
        mode: 'lines',
        name: 'USDT',
        line: {
          color: '#00D4AA',
          width: 2
        }
      },
      {
        x: stablecoinData.map(d => d.date),
        y: stablecoinData.map(d => d.total_circulating_usd_usdc),
        type: 'scatter',
        mode: 'lines',
        name: 'USDC',
        line: {
          color: '#2775CA',
          width: 2
        }
      }
    ]
    
    return {
      data: traces,
      layout: {
        title: getChartTitle(),
        showlegend: true,
        legend: {
          orientation: 'h',
          y: -0.2
        },
        xaxis: {
          title: 'Date',
          showgrid: true,
          gridcolor: '#e5e5e5'
        },
        yaxis: {
          title: 'Value (USD)',
          showgrid: true,
          gridcolor: '#e5e5e5',
          tickprefix: '$',
          tickformat: ',.2s',
          hoverformat: ',.2f'
        },
        margin: {
          l: 60,
          r: 40,
          t: 50,
          b: 50
        },
        hovermode: 'closest',
        autosize: true,
        plot_bgcolor: 'white',
        paper_bgcolor: 'white'
      },
      config: {
        responsive: true,
        displayModeBar: false
      }
    }
  }
  
  // Effect to render the chart when data is available
  useEffect(() => {
    if (!loading && !error && stablecoinData.length > 0 && chartRef.current) {
      // Check if Plotly is available
      if (typeof window !== 'undefined' && window.Plotly) {
        const chartData = createChartData()
        window.Plotly.newPlot(
          chartRef.current,
          chartData.data,
          chartData.layout,
          chartData.config
        ).then(() => {
          // Replace any "G" with "B" in the tick labels
          if (chartRef.current) {
            const yTicks = chartRef.current.querySelectorAll('.ytick text')
            yTicks.forEach((tick: any) => {
              if (tick.textContent && tick.textContent.includes('G')) {
                tick.textContent = tick.textContent.replace(/G/g, 'B')
              }
            })
          }
        })
      }
    }
  }, [loading, error, stablecoinData, timeRange])
  
  // Handle time range change
  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range)
  }

  if (loading) {
    return (
      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Stablecoin Metrics</h2>
        </div>
        <div className="h-[350px] flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading stablecoin data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Stablecoin Metrics</h2>
        </div>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    )
  }

  if (network.toLowerCase() !== "avalanche") {
    return (
      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Stablecoin Metrics</h2>
        </div>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-gray-500">Stablecoin metrics are only available for Avalanche.</div>
        </div>
      </div>
    )
  }

  if (!stablecoinData.length) {
    return (
      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Stablecoin Metrics</h2>
        </div>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-gray-500">No stablecoin data available.</div>
        </div>
      </div>
    )
  }

  // Get the most recent data for the summary section
  const latestData = stablecoinData[stablecoinData.length - 1]

  return (
    <div className="border rounded-lg p-6">
      <div className="flex flex-wrap items-center justify-between mb-4">
        <h2 className="text-lg font-bold">{getChartTitle()}</h2>
        
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          {/* Time Range Selector */}
          <div className="flex space-x-1">
            <Button 
              variant={timeRange === "1M" ? "default" : "outline"} 
              size="sm"
              onClick={() => handleTimeRangeChange("1M")}
              className="text-xs"
            >
              30D
            </Button>
            <Button 
              variant={timeRange === "3M" ? "default" : "outline"} 
              size="sm"
              onClick={() => handleTimeRangeChange("3M")}
              className="text-xs"
            >
              3M
            </Button>
            <Button 
              variant={timeRange === "6M" ? "default" : "outline"} 
              size="sm"
              onClick={() => handleTimeRangeChange("6M")}
              className="text-xs"
            >
              6M
            </Button>
            <Button 
              variant={timeRange === "1Y" ? "default" : "outline"} 
              size="sm"
              onClick={() => handleTimeRangeChange("1Y")}
              className="text-xs"
            >
              1Y
            </Button>
          </div>
        </div>
      </div>
      
      <div className="h-[350px] relative">
        <div ref={chartRef} className="w-full h-full"></div>
      </div>
      
      {/* Current Values Display */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>
    </div>
  )
} 