"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface ConsolidatedMetricsChartProps {
  network: string;
  height?: string;
}

interface PriceData {
  timestamp: number;
  price: number;
}

interface TVLData {
  date: number;
  tvl: number;
}

type MetricType = 'price' | 'tvl'

export function ConsolidatedMetricsChart({ 
  network, 
  height = "400px" 
}: ConsolidatedMetricsChartProps) {
  const [timeRange, setTimeRange] = useState('90')
  const [metricType, setMetricType] = useState<MetricType>('tvl')
  const [priceData, setPriceData] = useState<PriceData[]>([])
  const [tvlData, setTvlData] = useState<TVLData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forceRender, setForceRender] = useState(0)
  const chartRef = useRef<HTMLDivElement>(null)

  // Map network names to API identifiers
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
      case "180":
        return "180"
      case "365":
        return "365"
      case "max":
        return "max"
      default:
        return "90"
    }
  }

  // Fetch price data
  const fetchPriceData = async (): Promise<PriceData[]> => {
    try {
      // Validate network parameter
      if (!network || typeof network !== 'string') {
        throw new Error('Invalid network parameter')
      }
      
      // Try database first
      if (isSupabaseConfigured()) {
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
          case '180':
            filterTime = currentTime - (180 * 24 * 60 * 60 * 1000)
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
          .select('price, timestamp')
          .eq('blockchain', network)
          .gte('timestamp', filterTime)
          .order('timestamp', { ascending: true })

        if (!error && data && data.length > 0) {
          return data.map(item => ({
            timestamp: item.timestamp,
            price: item.price
          }))
        }
      }

      // Fallback to API
      const coinId = getCoinId(network)
      const days = getDaysParam(timeRange)
      
      // Add validation
      if (!coinId || !days) {
        throw new Error('Invalid coinId or days parameter')
      }
      
      const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`
      const params = new URLSearchParams({
        vs_currency: "usd",
        days: days,
        interval: days === "1" ? "hourly" : "daily"
      })
      
      console.log('Fetching from URL:', `${url}?${params.toString()}`) // Debug log
      
      const response = await fetch(`${url}?${params.toString()}`)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      
      const data = await response.json()
      const prices = data.prices || []
      
      return prices.map(([timestamp, price]: [number, number]) => ({
        timestamp,
        price
      }))
    } catch (err) {
      console.error('Error fetching price data:', err)
      return []
    }
  }

  // Fetch TVL data with improved filtering
  const fetchTVLData = async (): Promise<TVLData[]> => {
    try {
      // Try database first
      if (isSupabaseConfigured()) {
        const currentTime = Date.now() / 1000 // Convert to seconds for TVL data
        let filterTime = currentTime

        switch (timeRange) {
          case '7':
            filterTime = currentTime - (7 * 24 * 60 * 60)
            break
          case '30':
            filterTime = currentTime - (30 * 24 * 60 * 60)
            break
          case '90':
            filterTime = currentTime - (90 * 24 * 60 * 60)
            break
          case '180':
            filterTime = currentTime - (180 * 24 * 60 * 60)
            break
          case '270':
            filterTime = currentTime - (270 * 24 * 60 * 60)
            break
          case '365':
            filterTime = currentTime - (365 * 24 * 60 * 60)
            break
          case 'max':
            filterTime = 0
            break
        }

        const { data, error } = await supabase
          .from('tvl_data')
          .select('date, tvl, timestamp')
          .eq('blockchain', network)
          .gte('timestamp', filterTime)
          .order('timestamp', { ascending: true })

        if (!error && data && data.length > 0) {
          return data.map(item => ({
            date: item.timestamp, // Use timestamp directly since it's already in seconds
            tvl: item.tvl
          }))
        }
      }

      // Fallback to API with proper filtering
      const chainId = getChainId(network)
      const response = await fetch(`https://api.llama.fi/v2/historicalChainTvl/${chainId}`)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      
      const apiData = await response.json() as TVLData[]
      
      // Apply time filtering to API data
      if (timeRange !== 'max') {
        const currentTime = Date.now() / 1000
        let filterTime = currentTime

        switch (timeRange) {
          case '7':
            filterTime = currentTime - (7 * 24 * 60 * 60)
            break
          case '30':
            filterTime = currentTime - (30 * 24 * 60 * 60)
            break
          case '90':
            filterTime = currentTime - (90 * 24 * 60 * 60)
            break
          case '180':
            filterTime = currentTime - (180 * 24 * 60 * 60)
            break
          case '270':
            filterTime = currentTime - (270 * 24 * 60 * 60)
            break
          case '365':
            filterTime = currentTime - (365 * 24 * 60 * 60)
            break
        }

        return apiData.filter(item => item.date >= filterTime)
      }

      return apiData
    } catch (err) {
      console.error('Error fetching TVL data:', err)
      return []
    }
  }

  // Fetch data based on metric type
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        if (metricType === 'price') {
          const data = await fetchPriceData()
          setPriceData(data)
        } else {
          const data = await fetchTVLData()
          setTvlData(data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [network, timeRange, metricType])

  // Force chart render after data loads
  useEffect(() => {
    if (!loading && !error) {
      // Small delay to ensure DOM is ready, then force re-render
      setTimeout(() => {
        setForceRender(prev => prev + 1)
      }, 50)
    }
  }, [loading, error])

  // Format values for display
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

  const formatTVL = (value: number): string => {
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

  // Calculate percentage change
  const calculateChange = (): { change: number; percentage: number } => {
    const data = metricType === 'price' ? priceData : tvlData
    if (data.length < 2) return { change: 0, percentage: 0 }
    
    const currentValue = metricType === 'price' ? 
      (data as PriceData[])[data.length - 1].price : 
      (data as TVLData[])[data.length - 1].tvl
    const previousValue = metricType === 'price' ? 
      (data as PriceData[])[0].price : 
      (data as TVLData[])[0].tvl
    
    const change = currentValue - previousValue
    const percentage = (change / previousValue) * 100
    
    return { change, percentage }
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

  // Create Plotly chart data
  const createChartData = () => {
    const { percentage } = calculateChange()
    
    let traces: any[] = []
    let leftMargin = 60 // Default margin
    let tickFormat = ',.2f' // Default format

    if (metricType === 'price') {
      // Calculate price range for smart formatting
      const prices = priceData.map(d => d.price)
      const maxPrice = Math.max(...prices)
      
      // Adjust margin and format based on price range
      if (maxPrice >= 100000) {
        leftMargin = 100 // Much more space for 6-digit prices
        tickFormat = ',.0f' // No decimals for very large prices
      } else if (maxPrice >= 10000) {
        leftMargin = 90 // More space for 5-digit prices
        tickFormat = ',.0f'
      } else if (maxPrice >= 1000) {
        leftMargin = 80 // Space for 4-digit prices
        tickFormat = ',.2f'
      } else if (maxPrice >= 1) {
        leftMargin = 70
        tickFormat = ',.4f'
      } else {
        leftMargin = 70
        tickFormat = ',.6f'
      }

      const lineColor = percentage >= 0 ? '#10B981' : '#EF4444'
      traces = [{
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
    } else {
      const lineColor = getNetworkColor(network)
      traces = [{
        x: tvlData.map(d => new Date(d.date * 1000).toISOString().split('T')[0]),
        y: tvlData.map(d => d.tvl),
        type: 'scatter',
        mode: 'lines',
        name: 'TVL',
        line: {
          color: lineColor,
          width: 3
        },
        fill: 'tonexty',
        fillcolor: `${lineColor}20`
      }]
    }

    return {
      data: traces,
      layout: {
        title: `${network.charAt(0).toUpperCase() + network.slice(1)} ${metricType === 'price' ? 'Price' : 'TVL'}`,
        showlegend: false,
        xaxis: {
          title: 'Date',
          showgrid: true,
          gridcolor: '#e5e5e5'
        },
        yaxis: {
          title: metricType === 'price' ? 'Price (USD)' : 'TVL (USD)',
          showgrid: true,
          gridcolor: '#e5e5e5',
          tickprefix: '$',
          tickformat: metricType === 'price' ? tickFormat : '.2s',
          ticksuffix: metricType === 'tvl' ? '' : '',
          hoverformat: metricType === 'price' ? ',.4f' : ',.2f',
          tickmode: metricType === 'tvl' ? 'auto' : 'auto',
          nticks: 8 // Ensure proper tick spacing
        },
        margin: {
          l: leftMargin, // Dynamic left margin based on data range
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

  // Effect to render the chart
  useEffect(() => {
    if (!loading && !error && chartRef.current) {
      const hasData = metricType === 'price' ? priceData.length > 0 : tvlData.length > 0
      if (hasData && typeof window !== 'undefined' && window.Plotly) {
        const chartData = createChartData()
        window.Plotly.newPlot(
          chartRef.current,
          chartData.data,
          chartData.layout,
          chartData.config
        ).then(() => {
          // Replace any "G" with "B" in the tick labels for TVL charts
          if (chartRef.current && metricType === 'tvl') {
            const yTicks = chartRef.current.querySelectorAll('.ytick text')
            yTicks.forEach((tick: any) => {
              if (tick.textContent && tick.textContent.includes('G')) {
                tick.textContent = tick.textContent.replace(/G/g, 'B')
              }
            })
          }
        })
      } else if (hasData && typeof window !== 'undefined') {
        // If Plotly isn't ready yet, retry after a short delay
        setTimeout(() => {
          if (window.Plotly && chartRef.current) {
            const chartData = createChartData()
            window.Plotly.newPlot(
              chartRef.current,
              chartData.data,
              chartData.layout,
              chartData.config
            ).then(() => {
              if (chartRef.current && metricType === 'tvl') {
                const yTicks = chartRef.current.querySelectorAll('.ytick text')
                yTicks.forEach((tick: any) => {
                  if (tick.textContent && tick.textContent.includes('G')) {
                    tick.textContent = tick.textContent.replace(/G/g, 'B')
                  }
                })
              }
            })
          }
        }, 100)
      }
    }
  }, [loading, error, priceData, tvlData, timeRange, metricType, forceRender])

  // Handle time range change
  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range)
  }

  if (loading) {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading {metricType} data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-red-500">Error loading {metricType} data: {error}</div>
        </div>
      </div>
    )
  }

  const currentData = metricType === 'price' ? priceData : tvlData
  if (!currentData.length) {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-gray-500">No {metricType} data available.</div>
        </div>
      </div>
    )
  }

  // Get current value and change
  const currentValue = metricType === 'price' ? 
    priceData[priceData.length - 1]?.price || 0 : 
    tvlData[tvlData.length - 1]?.tvl || 0
  const { change, percentage } = calculateChange()

  return (
    <div className="border rounded-lg p-6" style={{ height }}>
      <div className="flex flex-wrap items-center justify-between mb-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <h2 className="text-lg font-bold">
              {network.charAt(0).toUpperCase() + network.slice(1)} {metricType === 'price' ? 'Price' : 'TVL'}
            </h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {metricType === 'price' ? 'Price' : 'TVL'}
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setMetricType('tvl')}>
                  TVL
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMetricType('price')}>
                  Price
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-2xl font-bold text-gray-900">
              {metricType === 'price' ? formatPrice(currentValue) : formatTVL(currentValue)}
            </div>
            <div className={`text-sm font-medium ${percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {percentage >= 0 ? '+' : ''}{percentage.toFixed(2)}%
            </div>
            <div className={`text-sm ${percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ({percentage >= 0 ? '+' : ''}{metricType === 'price' ? formatPrice(Math.abs(change)) : formatTVL(Math.abs(change))})
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
              3M
            </Button>
            <Button 
              variant={timeRange === "180" ? "default" : "outline"} 
              size="sm"
              onClick={() => handleTimeRangeChange("180")}
              className="text-xs"
            >
              6M
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