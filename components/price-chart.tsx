"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface PriceChartProps {
  network: string;
  title?: string;
  height?: string;
}

interface PriceData {
  timestamp: number;
  price: number;
}

interface StoredPriceData {
  date: string;
  price: number;
  blockchain: string;
  timestamp: number;
}

export function PriceChart({ 
  network, 
  title,
  height = "400px" 
}: PriceChartProps) {
  const [timeRange, setTimeRange] = useState('90')
  const [priceData, setPriceData] = useState<PriceData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  // Map network names to CoinGecko coin IDs
  const getCoinId = (network: string): string => {
    switch (network.toLowerCase()) {
      case "avalanche":
        return "avalanche-2"
      case "ethereum":
        return "ethereum"
      case "solana":
        return "solana"
      case "bitcoin":
        return "bitcoin"
      case "polygon":
        return "matic-network"
      case "core":
        return "coredaoorg"
      default:
        return "avalanche-2"
    }
  }

  // Get days parameter based on time range
  const getDaysParam = (range: string): string => {
    switch (range) {
      case "7":
        return "7"
      case "30":
        return "30"
      case "90":
        return "90"
      case "365":
        return "365"
      case "max":
        return "max"
      default:
        return "90"
    }
  }

  // Check if we have recent data in the database (within last 24 hours)
  const getLatestPriceTimestamp = async (blockchain: string): Promise<number | null> => {
    if (!isSupabaseConfigured()) return null

    try {
      const { data, error } = await supabase
        .from('price_data')
        .select('timestamp')
        .eq('blockchain', blockchain)
        .order('timestamp', { ascending: false })
        .limit(1)

      if (error) {
        console.warn('Error checking latest price timestamp:', error)
        return null
      }

      return data && data.length > 0 ? data[0].timestamp : null
    } catch (err) {
      console.warn('Exception checking latest price timestamp:', err)
      return null
    }
  }

  // Get price data from database
  const getPriceDataFromDB = async (blockchain: string): Promise<PriceData[]> => {
    if (!isSupabaseConfigured()) return []

    try {
      // Calculate date filter based on time range
      const currentTime = Date.now()
      let filterTime = currentTime

      switch (timeRange) {
        case '7':
          filterTime = currentTime - (7 * 24 * 60 * 60 * 1000)
          break
        case '30':
          filterTime = currentTime - (30 * 24 * 60 * 60 * 1000)
          break
        case '90':
          filterTime = currentTime - (90 * 24 * 60 * 60 * 1000)
          break
        case '365':
          filterTime = currentTime - (365 * 24 * 60 * 60 * 1000)
          break
        case 'max':
          filterTime = 0
          break
      }

      const { data, error } = await supabase
        .from('price_data')
        .select('date, price, timestamp')
        .eq('blockchain', blockchain)
        .gte('timestamp', filterTime)
        .order('timestamp', { ascending: true })

      if (error) {
        console.warn('Error fetching price data from DB:', error)
        return []
      }

      return data.map(item => ({
        timestamp: item.timestamp,
        price: item.price
      }))
    } catch (err) {
      console.warn('Exception fetching price data from DB:', err)
      return []
    }
  }

  // Save price data to database
  const savePriceDataToDB = async (blockchain: string, data: PriceData[]): Promise<void> => {
    if (!isSupabaseConfigured()) return

    try {
      const dataToInsert = data.map(item => ({
        blockchain,
        date: new Date(item.timestamp).toISOString(),
        price: item.price,
        timestamp: item.timestamp
      }))

      // Delete existing data for this blockchain to avoid duplicates
      await supabase
        .from('price_data')
        .delete()
        .eq('blockchain', blockchain)

      // Insert new data
      const { error } = await supabase
        .from('price_data')
        .insert(dataToInsert)

      if (error) {
        console.warn('Error saving price data to DB:', error)
      }
    } catch (err) {
      console.warn('Exception saving price data to DB:', err)
    }
  }

  // Fetch price data from CoinGecko API
  const fetchPriceFromAPI = async (coinId: string, days: string): Promise<PriceData[]> => {
    try {
      const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`
      const params = new URLSearchParams({
        vs_currency: "usd",
        days: days,
        interval: days === "1" ? "hourly" : "daily"
      })
      
      const response = await fetch(`${url}?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      const prices = data.prices || []
      
      return prices.map(([timestamp, price]: [number, number]) => ({
        timestamp,
        price
      }))
    } catch (err) {
      console.error('Error fetching price data from API:', err)
      throw err
    }
  }

  // Main function to fetch price data
  const fetchPriceData = async (blockchain: string, coinId: string) => {
    setLoading(true)
    setError(null)

    try {
      // Check if we have recent data (within last 24 hours)
      const latestTimestamp = await getLatestPriceTimestamp(blockchain)
      const currentTime = Date.now()
      const hasRecentData = latestTimestamp && (currentTime - latestTimestamp) < 86400000 // 24 hours in ms

      if (hasRecentData) {
        // Get data from database
        const dbData = await getPriceDataFromDB(blockchain)
        if (dbData.length > 0) {
          setPriceData(dbData)
          setLoading(false)
          return
        }
      }

      // If no recent data, fetch from API
      const days = getDaysParam(timeRange)
      const apiData = await fetchPriceFromAPI(coinId, days)
      
      // Save to database
      await savePriceDataToDB(blockchain, apiData)
      
      setPriceData(apiData)
    } catch (err) {
      console.error('Exception when fetching price data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      
      // Try to get whatever we have from the database
      const dbData = await getPriceDataFromDB(blockchain)
      setPriceData(dbData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const coinId = getCoinId(network)
    fetchPriceData(network, coinId)
  }, [network, timeRange])

  // Format price value for display
  const formatPrice = (value: number): string => {
    if (value >= 1000) {
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    } else if (value >= 1) {
      return `$${value.toFixed(2)}`
    } else if (value >= 0.01) {
      return `$${value.toFixed(4)}`
    } else {
      return `$${value.toFixed(6)}`
    }
  }

  // Calculate percentage change
  const calculatePriceChange = (): { change: number; percentage: number } => {
    if (priceData.length < 2) return { change: 0, percentage: 0 }
    
    const currentPrice = priceData[priceData.length - 1].price
    const previousPrice = priceData[0].price
    const change = currentPrice - previousPrice
    const percentage = (change / previousPrice) * 100
    
    return { change, percentage }
  }

  // Create Plotly chart data
  const createChartData = () => {
    const { percentage } = calculatePriceChange()
    const lineColor = percentage >= 0 ? '#10B981' : '#EF4444' // Green for positive, red for negative

    const traces = [{
      x: priceData.map(d => new Date(d.timestamp).toISOString()),
      y: priceData.map(d => d.price),
      type: 'scatter',
      mode: 'lines',
      name: 'Price',
      line: {
        color: lineColor,
        width: 3
      },
      fill: 'tonexty',
      fillcolor: `${lineColor}20`
    }]

    return {
      data: traces,
      layout: {
        title: title || `${network.charAt(0).toUpperCase() + network.slice(1)} Price`,
        showlegend: false,
        xaxis: {
          title: 'Date',
          showgrid: true,
          gridcolor: '#e5e5e5'
        },
        yaxis: {
          title: 'Price (USD)',
          showgrid: true,
          gridcolor: '#e5e5e5',
          tickprefix: '$',
          tickformat: ',.2f',
          hoverformat: ',.4f'
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
    if (!loading && !error && priceData.length > 0 && chartRef.current) {
      if (typeof window !== 'undefined' && window.Plotly) {
        const chartData = createChartData()
        window.Plotly.newPlot(
          chartRef.current,
          chartData.data,
          chartData.layout,
          chartData.config
        )
      }
    }
  }, [loading, error, priceData, timeRange])

  // Handle time range change
  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range)
  }

  if (loading) {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Price Chart</h2>
        </div>
        <div className="h-[350px] flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading price data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Price Chart</h2>
        </div>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-red-500">Error loading price data: {error}</div>
        </div>
      </div>
    )
  }

  if (!priceData.length) {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Price Chart</h2>
        </div>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-gray-500">No price data available.</div>
        </div>
      </div>
    )
  }

  // Get current price and change
  const currentPrice = priceData.length > 0 ? priceData[priceData.length - 1].price : 0
  const { change, percentage } = calculatePriceChange()

  return (
    <div className="border rounded-lg p-6" style={{ height }}>
      <div className="flex flex-wrap items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold">
            {title || `${network.charAt(0).toUpperCase() + network.slice(1)} Price`}
          </h2>
          <div className="flex items-center space-x-2 mt-1">
            <div className="text-2xl font-bold text-gray-900">
              {formatPrice(currentPrice)}
            </div>
            <div className={`text-sm font-medium ${percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {percentage >= 0 ? '+' : ''}{percentage.toFixed(2)}%
            </div>
            <div className={`text-sm ${percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ({percentage >= 0 ? '+' : ''}{formatPrice(Math.abs(change))})
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          {/* Time Range Selector */}
          <div className="flex space-x-1">
            <Button 
              variant={timeRange === "7" ? "default" : "outline"} 
              size="sm"
              onClick={() => handleTimeRangeChange("7")}
              className="text-xs"
            >
              7D
            </Button>
            <Button 
              variant={timeRange === "30" ? "default" : "outline"} 
              size="sm"
              onClick={() => handleTimeRangeChange("30")}
              className="text-xs"
            >
              30D
            </Button>
            <Button 
              variant={timeRange === "90" ? "default" : "outline"} 
              size="sm"
              onClick={() => handleTimeRangeChange("90")}
              className="text-xs"
            >
              90D
            </Button>
            <Button 
              variant={timeRange === "365" ? "default" : "outline"} 
              size="sm"
              onClick={() => handleTimeRangeChange("365")}
              className="text-xs"
            >
              1Y
            </Button>
            <Button 
              variant={timeRange === "max" ? "default" : "outline"} 
              size="sm"
              onClick={() => handleTimeRangeChange("max")}
              className="text-xs"
            >
              MAX
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