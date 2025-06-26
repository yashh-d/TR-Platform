"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface CoreDaoStablecoinMetricsChartProps {
  network: string;
  metric?: "circulating" | "bridged";
  title?: string;
}

interface CoreDaoStablecoinData {
  date: string;
  stablecoin: string;
  circulating_supply: number;
  price: number;
}

interface ProcessedData {
  date: string;
  total_circulating: number;
  usdt_circulating: number;
  usdc_circulating: number;
  usdb_circulating: number;
  total_bridged: number;
  usdt_bridged: number;
  usdc_bridged: number;
  usdb_bridged: number;
}

export function CoreDaoStablecoinMetricsChart({ 
  network, 
  metric = "circulating",
  title
}: CoreDaoStablecoinMetricsChartProps) {
  const [timeRange, setTimeRange] = useState('1Y')
  const [stablecoinData, setStablecoinData] = useState<ProcessedData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartType, setChartType] = useState<"circulating" | "bridged">(metric)
  const chartRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    // Only fetch for Core network
    if (network.toLowerCase() !== "core") {
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
            filterDate.setFullYear(currentDate.getFullYear() - 1)
            break
        }
        
        // Format the date as YYYY-MM-DD
        const formattedFilterDate = filterDate.toISOString().split('T')[0]
        
        // Query the core_dao_stablecoins table
        const { data, error } = await supabase
          .from('core_dao_stablecoins')
          .select(`
            date,
            stablecoin,
            circulating_supply,
            price
          `)
          .gte('date', formattedFilterDate)
          .order('date', { ascending: true })
        
        if (error) {
          throw new Error(`Error fetching Core DAO stablecoin data: ${error.message}`)
        }
        
        if (data) {
          // Process the data to group by date and stablecoin type
          const processedData = processStablecoinData(data as CoreDaoStablecoinData[])
          setStablecoinData(processedData)
        }
      } catch (err) {
        console.error('Error fetching Core DAO stablecoin data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchStablecoinData()
  }, [network, timeRange])

  // Process the raw data to create aggregated data by date
  const processStablecoinData = (rawData: CoreDaoStablecoinData[]): ProcessedData[] => {
    const dataByDate: Record<string, ProcessedData> = {}
    
    // First, only create entries for dates that actually have data in the database
    rawData.forEach(item => {
      const supply = Number(item.circulating_supply)
      
      // Only process actual database records with real values
      if (supply && supply > 0) {
        // Only initialize if we don't have this date yet
        if (!dataByDate[item.date]) {
          dataByDate[item.date] = {
            date: item.date,
            total_circulating: 0,
            usdt_circulating: 0,
            usdc_circulating: 0,
            usdb_circulating: 0,
            total_bridged: 0,
            usdt_bridged: 0,
            usdc_bridged: 0,
            usdb_bridged: 0
          }
        }
        
        // Map the actual database values to our structure
        if (item.stablecoin === 'peggedUSD') {
          dataByDate[item.date].total_circulating = supply
        } else if (item.stablecoin === 'peggedUSD_bridged') {
          dataByDate[item.date].total_bridged = supply
        } else if (item.stablecoin === 'USDT') {
          dataByDate[item.date].usdt_circulating = supply
        } else if (item.stablecoin === 'USDC') {
          dataByDate[item.date].usdc_circulating = supply
        } else if (item.stablecoin === 'USDB') {
          dataByDate[item.date].usdb_circulating = supply
        } else if (item.stablecoin === 'USDT_bridged') {
          dataByDate[item.date].usdt_bridged = supply
        } else if (item.stablecoin === 'USDC_bridged') {
          dataByDate[item.date].usdc_bridged = supply
        } else if (item.stablecoin === 'USDB_bridged') {
          dataByDate[item.date].usdb_bridged = supply
        }
      }
    })
    
    // Return only dates that have actual data from the database
    return Object.values(dataByDate)
      .filter(data => {
        // Only include dates that have at least one real value from the database
        return data.total_circulating > 0 || 
               data.usdt_circulating > 0 || 
               data.usdc_circulating > 0 || 
               data.usdb_circulating > 0 ||
               data.total_bridged > 0 ||
               data.usdt_bridged > 0 ||
               data.usdc_bridged > 0 ||
               data.usdb_bridged > 0
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  }
  
  // Format value for display
  const formatValue = (value: number | null): string => {
    if (value === null || value === undefined || value === 0) return 'N/A'
    
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
    
    switch (chartType) {
      case "circulating":
        return "Total Circulating Stablecoins on Core DAO"
      case "bridged":
        return "Total Bridged Stablecoins to Core DAO"
      default:
        return "Stablecoin Metrics"
    }
  }
  
  // Create Plotly chart data
  const createChartData = () => {
    // Base trace configuration
    const traces = []
    
    if (chartType === "circulating") {
      // Add total circulating trace - only where we have data
      const totalData = stablecoinData.filter(d => d.total_circulating > 0)
      if (totalData.length > 0) {
        traces.push({
          x: totalData.map(d => d.date),
          y: totalData.map(d => d.total_circulating),
          type: 'scatter',
          mode: 'lines',
          name: 'Total Circulating',
          line: {
            color: '#FF7700',
            width: 3
          }
        })
      }
      
      // Add individual stablecoin traces - only where we have data
      const usdtData = stablecoinData.filter(d => d.usdt_circulating > 0)
      if (usdtData.length > 0) {
        traces.push({
          x: usdtData.map(d => d.date),
          y: usdtData.map(d => d.usdt_circulating),
          type: 'scatter',
          mode: 'lines',
          name: 'USDT',
          line: {
            color: '#00D4AA',
            width: 2
          }
        })
      }
      
      const usdcData = stablecoinData.filter(d => d.usdc_circulating > 0)
      if (usdcData.length > 0) {
        traces.push({
          x: usdcData.map(d => d.date),
          y: usdcData.map(d => d.usdc_circulating),
          type: 'scatter',
          mode: 'lines',
          name: 'USDC',
          line: {
            color: '#2775CA',
            width: 2
          }
        })
      }
      
      const usdbData = stablecoinData.filter(d => d.usdb_circulating > 0)
      if (usdbData.length > 0) {
        traces.push({
          x: usdbData.map(d => d.date),
          y: usdbData.map(d => d.usdb_circulating),
          type: 'scatter',
          mode: 'lines',
          name: 'USDB',
          line: {
            color: '#9333EA',
            width: 2
          }
        })
      }
    }
    
    if (chartType === "bridged") {
      // Add total bridged trace - only where we have data
      const totalBridgedData = stablecoinData.filter(d => d.total_bridged > 0)
      if (totalBridgedData.length > 0) {
        traces.push({
          x: totalBridgedData.map(d => d.date),
          y: totalBridgedData.map(d => d.total_bridged),
          type: 'scatter',
          mode: 'lines',
          name: 'Total Bridged',
          line: {
            color: '#FF7700',
            width: 3
          }
        })
      }
      
      // Add individual bridged traces - only where we have data
      const usdtBridgedData = stablecoinData.filter(d => d.usdt_bridged > 0)
      if (usdtBridgedData.length > 0) {
        traces.push({
          x: usdtBridgedData.map(d => d.date),
          y: usdtBridgedData.map(d => d.usdt_bridged),
          type: 'scatter',
          mode: 'lines',
          name: 'USDT Bridged',
          line: {
            color: '#00D4AA',
            width: 2
          }
        })
      }
      
      const usdcBridgedData = stablecoinData.filter(d => d.usdc_bridged > 0)
      if (usdcBridgedData.length > 0) {
        traces.push({
          x: usdcBridgedData.map(d => d.date),
          y: usdcBridgedData.map(d => d.usdc_bridged),
          type: 'scatter',
          mode: 'lines',
          name: 'USDC Bridged',
          line: {
            color: '#2775CA',
            width: 2
          }
        })
      }
      
      const usdbBridgedData = stablecoinData.filter(d => d.usdb_bridged > 0)
      if (usdbBridgedData.length > 0) {
        traces.push({
          x: usdbBridgedData.map(d => d.date),
          y: usdbBridgedData.map(d => d.usdb_bridged),
          type: 'scatter',
          mode: 'lines',
          name: 'USDB Bridged',
          line: {
            color: '#9333EA',
            width: 2
          }
        })
      }
    }
    
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
        height: 350,
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
      if (typeof window !== 'undefined' && (window as any).Plotly) {
        const chartData = createChartData()
        ;(window as any).Plotly.newPlot(
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
  }, [loading, error, stablecoinData, chartType, timeRange])
  
  // Handle time range change
  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range)
  }
  
  // Handle chart type change
  const handleChartTypeChange = (type: "circulating" | "bridged") => {
    setChartType(type)
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

  if (network.toLowerCase() !== "core") {
    return (
      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Stablecoin Metrics</h2>
        </div>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-gray-500">Stablecoin metrics are only available for Core DAO.</div>
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
  const getLatestValue = (getValue: (data: ProcessedData) => number) => {
    for (let i = stablecoinData.length - 1; i >= 0; i--) {
      const value = getValue(stablecoinData[i])
      if (value > 0) {
        return value
      }
    }
    return 0
  }

  const latestValues = {
    total_circulating: getLatestValue(d => d.total_circulating),
    usdt_circulating: getLatestValue(d => d.usdt_circulating),
    usdc_circulating: getLatestValue(d => d.usdc_circulating),
    usdb_circulating: getLatestValue(d => d.usdb_circulating),
    total_bridged: getLatestValue(d => d.total_bridged),
    usdt_bridged: getLatestValue(d => d.usdt_bridged),
    usdc_bridged: getLatestValue(d => d.usdc_bridged),
    usdb_bridged: getLatestValue(d => d.usdb_bridged)
  }

  return (
    <div className="border rounded-lg p-6">
      <div className="flex flex-wrap items-center justify-between mb-4">
        <h2 className="text-lg font-bold">{getChartTitle()}</h2>
        
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          {/* Chart Type Selector */}
          <div className="flex space-x-1">
            <Button 
              variant={chartType === "circulating" ? "default" : "outline"} 
              size="sm"
              onClick={() => handleChartTypeChange("circulating")}
              className="text-xs"
            >
              Circulating
            </Button>
            <Button 
              variant={chartType === "bridged" ? "default" : "outline"} 
              size="sm"
              onClick={() => handleChartTypeChange("bridged")}
              className="text-xs"
            >
              Bridged
            </Button>
          </div>
          
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
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="text-sm text-gray-500">Total Circulating</div>
          <div className="text-lg font-bold">
            {formatValue(latestValues.total_circulating)}
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="text-sm text-gray-500">USDT Circulating</div>
          <div className="text-lg font-bold">
            {formatValue(latestValues.usdt_circulating)}
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="text-sm text-gray-500">USDC Circulating</div>
          <div className="text-lg font-bold">
            {formatValue(latestValues.usdc_circulating)}
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="text-sm text-gray-500">USDB Circulating</div>
          <div className="text-lg font-bold">
            {formatValue(latestValues.usdb_circulating)}
          </div>
        </div>
      </div>
    </div>
  )
} 