"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface TVLChartProps {
  network: string;
  title?: string;
  height?: string;
}

interface TVLData {
  date: number;
  tvl: number;
}

interface StoredTVLData {
  date: string;
  tvl: number;
  blockchain: string;
  timestamp: number;
}

export function TVLChart({ 
  network, 
  title,
  height = "400px" 
}: TVLChartProps) {
  const [timeRange, setTimeRange] = useState('1Y')
  const [tvlData, setTvlData] = useState<TVLData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  // Map network names to DeFiLlama chain IDs
  const getChainId = (network: string): string => {
    switch (network.toLowerCase()) {
      case "avalanche":
        return "avalanche"
      case "ethereum":
        return "ethereum"
      case "solana":
        return "solana"
      case "bitcoin":
        return "bitcoin"
      case "polygon":
        return "polygon"
      case "core":
        return "core"
      default:
        return "avalanche"
    }
  }

  // Check if we have recent data in the database (within last 24 hours)
  const getLatestTVLTimestamp = async (blockchain: string): Promise<number | null> => {
    if (!isSupabaseConfigured()) return null

    try {
      const { data, error } = await supabase
        .from('tvl_data')
        .select('timestamp')
        .eq('blockchain', blockchain)
        .order('timestamp', { ascending: false })
        .limit(1)

      if (error) {
        console.warn('Error checking latest TVL timestamp:', error)
        return null
      }

      return data && data.length > 0 ? data[0].timestamp : null
    } catch (err) {
      console.warn('Exception checking latest TVL timestamp:', err)
      return null
    }
  }

  // Get TVL data from database
  const getTVLDataFromDB = async (blockchain: string): Promise<TVLData[]> => {
    if (!isSupabaseConfigured()) return []

    try {
      // Calculate date filter based on time range
      const currentTime = Date.now() / 1000
      let filterTime = currentTime

      switch (timeRange) {
        case '1M':
          filterTime = currentTime - (30 * 24 * 60 * 60)
          break
        case '3M':
          filterTime = currentTime - (90 * 24 * 60 * 60)
          break
        case '6M':
          filterTime = currentTime - (180 * 24 * 60 * 60)
          break
        case '1Y':
          filterTime = currentTime - (365 * 24 * 60 * 60)
          break
        case 'ALL':
          filterTime = 0
          break
      }

      const { data, error } = await supabase
        .from('tvl_data')
        .select('date, tvl')
        .eq('blockchain', blockchain)
        .gte('timestamp', filterTime)
        .order('timestamp', { ascending: true })

      if (error) {
        console.warn('Error fetching TVL data from DB:', error)
        return []
      }

      return data.map(item => ({
        date: new Date(item.date).getTime() / 1000,
        tvl: item.tvl
      }))
    } catch (err) {
      console.warn('Exception fetching TVL data from DB:', err)
      return []
    }
  }

  // Save TVL data to database
  const saveTVLDataToDB = async (blockchain: string, data: TVLData[]): Promise<void> => {
    if (!isSupabaseConfigured()) return

    try {
      const dataToInsert = data.map(item => ({
        blockchain,
        date: new Date(item.date * 1000).toISOString(),
        tvl: item.tvl,
        timestamp: item.date
      }))

      // Delete existing data for this blockchain to avoid duplicates
      await supabase
        .from('tvl_data')
        .delete()
        .eq('blockchain', blockchain)

      // Insert new data
      const { error } = await supabase
        .from('tvl_data')
        .insert(dataToInsert)

      if (error) {
        console.warn('Error saving TVL data to DB:', error)
      }
    } catch (err) {
      console.warn('Exception saving TVL data to DB:', err)
    }
  }

  // Fetch TVL data from DeFiLlama API
  const fetchTVLFromAPI = async (chainId: string): Promise<TVLData[]> => {
    try {
      const url = `https://api.llama.fi/v2/historicalChainTvl/${chainId}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      return data as TVLData[]
    } catch (err) {
      console.error('Error fetching TVL data from API:', err)
      throw err
    }
  }

  // Main function to fetch TVL data
  const fetchTVLData = async (blockchain: string, chainId: string) => {
    setLoading(true)
    setError(null)

    try {
      // Check if we have recent data (within last 24 hours)
      const latestTimestamp = await getLatestTVLTimestamp(blockchain)
      const currentTime = Date.now() / 1000
      const hasRecentData = latestTimestamp && (currentTime - latestTimestamp) < 86400

      if (hasRecentData) {
        // Get data from database
        const dbData = await getTVLDataFromDB(blockchain)
        if (dbData.length > 0) {
          setTvlData(dbData)
          setLoading(false)
          return
        }
      }

      // If no recent data, fetch from API
      const apiData = await fetchTVLFromAPI(chainId)
      
      // Save to database
      await saveTVLDataToDB(blockchain, apiData)
      
      // Filter data based on time range
      const currentTimestamp = Date.now() / 1000
      let filterTimestamp = currentTimestamp

      switch (timeRange) {
        case '1M':
          filterTimestamp = currentTimestamp - (30 * 24 * 60 * 60)
          break
        case '3M':
          filterTimestamp = currentTimestamp - (90 * 24 * 60 * 60)
          break
        case '6M':
          filterTimestamp = currentTimestamp - (180 * 24 * 60 * 60)
          break
        case '1Y':
          filterTimestamp = currentTimestamp - (365 * 24 * 60 * 60)
          break
        case 'ALL':
          filterTimestamp = 0
          break
      }

      const filteredData = apiData.filter(item => item.date >= filterTimestamp)
      setTvlData(filteredData)
    } catch (err) {
      console.error('Exception when fetching TVL data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      
      // Try to get whatever we have from the database
      const dbData = await getTVLDataFromDB(blockchain)
      setTvlData(dbData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const chainId = getChainId(network)
    fetchTVLData(network, chainId)
  }, [network, timeRange])

  // Format value for display
  const formatValue = (value: number): string => {
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

  // Create Plotly chart data
  const createChartData = () => {
    const traces = [{
      x: tvlData.map(d => new Date(d.date * 1000).toISOString().split('T')[0]),
      y: tvlData.map(d => d.tvl),
      type: 'scatter',
      mode: 'lines',
      name: 'TVL',
      line: {
        color: getNetworkColor(network),
        width: 3
      },
      fill: 'tonexty',
      fillcolor: `${getNetworkColor(network)}20`
    }]

    return {
      data: traces,
      layout: {
        title: title || `${network.charAt(0).toUpperCase() + network.slice(1)} Total Value Locked`,
        showlegend: false,
        xaxis: {
          title: 'Date',
          showgrid: true,
          gridcolor: '#e5e5e5'
        },
        yaxis: {
          title: 'TVL (USD)',
          showgrid: true,
          gridcolor: '#e5e5e5',
          tickprefix: '$',
          tickformat: '.2s',
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

  // Get network-specific color
  const getNetworkColor = (network: string): string => {
    switch (network.toLowerCase()) {
      case "avalanche":
        return "#E84142"
      case "ethereum":
        return "#627EEA"
      case "solana":
        return "#14F195"
      case "bitcoin":
        return "#F7931A"
      case "polygon":
        return "#8247E5"
      case "core":
        return "#FF7700"
      default:
        return "#3B82F6"
    }
  }

  // Effect to render the chart when data is available
  useEffect(() => {
    if (!loading && !error && tvlData.length > 0 && chartRef.current) {
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
  }, [loading, error, tvlData, timeRange])

  // Handle time range change
  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range)
  }

  if (loading) {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">TVL Chart</h2>
        </div>
        <div className="h-[350px] flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading TVL data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">TVL Chart</h2>
        </div>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-red-500">Error loading TVL data: {error}</div>
        </div>
      </div>
    )
  }

  if (!tvlData.length) {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">TVL Chart</h2>
        </div>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-gray-500">No TVL data available.</div>
        </div>
      </div>
    )
  }

  // Get current TVL value
  const currentTVL = tvlData.length > 0 ? tvlData[tvlData.length - 1].tvl : 0

  return (
    <div className="border rounded-lg p-6" style={{ height }}>
      <div className="flex flex-wrap items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold">
            {title || `${network.charAt(0).toUpperCase() + network.slice(1)} TVL`}
          </h2>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {formatValue(currentTVL)}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          {/* Time Range Selector */}
          <div className="flex space-x-1">
            <Button 
              variant={timeRange === "1M" ? "default" : "outline"} 
              size="sm"
              onClick={() => handleTimeRangeChange("1M")}
              className="text-xs"
            >
              1M
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
            <Button 
              variant={timeRange === "ALL" ? "default" : "outline"} 
              size="sm"
              onClick={() => handleTimeRangeChange("ALL")}
              className="text-xs"
            >
              ALL
            </Button>
          </div>
        </div>
      </div>
      
      <div className="h-[350px] relative">
        <div ref={chartRef} className="w-full h-full"></div>
      </div>
    </div>
  )
} 