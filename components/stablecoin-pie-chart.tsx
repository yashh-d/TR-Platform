"use client"

import { useEffect, useState } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface StablecoinPieChartProps {
  network: string
}

interface StablecoinData {
  symbol: string
  name: string
  value: number
  color: string
}

const COLOR_PALETTE = [
  '#E84142', '#2775CA', '#26A17B', '#F7931A', '#8247E5', '#FFB700', '#8B5CF6', '#43e97b', '#f357a8', '#FFD700',
  '#b721ff', '#00c6fb', '#f7797d', '#4e54c8', '#e1eec3', '#f857a6', '#ff5858', '#43cea2', '#185a9d', '#f953c6',
]

// Specific color mapping for major stablecoins to match the design
function getStablecoinColor(symbol: string, index: number): string {
  const stablecoinColors: Record<string, string> = {
    "USDT": "#00D4AA", // Cyan/turquoise color for USDT
    "USDC": "#2775CA", // Blue color for USDC
    "DAI": "#F7931A",  // Orange for DAI
    "FRAX": "#8247E5", // Purple for FRAX
    "USP": "#9333EA",  // Purple for USP
    "avUSD": "#10B981", // Green for avUSD
    "BUIDL": "#EF4444", // Red for BUIDL
    "DEUSD": "#8B5CF6", // Purple for DEUSD
    "BENJI": "#F59E0B", // Amber for BENJI
    "AUSD": "#EC4899", // Pink for AUSD
    "USDS": "#6366F1", // Indigo for USDS
  }
  
  return stablecoinColors[symbol] || COLOR_PALETTE[index % COLOR_PALETTE.length]
}

export function StablecoinPieChart({ network }: StablecoinPieChartProps) {
  const [chartData, setChartData] = useState<StablecoinData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalValue, setTotalValue] = useState(0)

  useEffect(() => {
    async function fetchStablecoinData() {
      setLoading(true)
      setError(null)

      try {
        if (network.toLowerCase() !== "avalanche") {
          // For non-Avalanche networks, show mock data or empty state
          const mockData = generateMockStablecoinData()
          setChartData(mockData)
          setTotalValue(mockData.reduce((sum, item) => sum + item.value, 0))
          setLoading(false)
          return
        }

        // Check if Supabase is configured
        if (!isSupabaseConfigured()) {
          throw new Error("Supabase is not properly configured.")
        }

        // Fetch the latest stablecoin data from avastables
        const { data, error } = await supabase
          .from("avastables")
          .select("stablecoin_symbol, stablecoin_name, circulating_usd, date")
          .order('date', { ascending: false })
          .limit(100) // Get recent data to find the latest for each stablecoin

        if (error) {
          throw new Error(`Error fetching stablecoin data: ${error.message}`)
        }

        if (data && data.length > 0) {
          // Get the latest data for each stablecoin
          const latestBySymbol: Record<string, { name: string; value: number; date: string }> = {}
          
          for (const row of data) {
            const symbol = row.stablecoin_symbol
            const currentDate = row.date
            
            if (!latestBySymbol[symbol] || currentDate > latestBySymbol[symbol].date) {
              latestBySymbol[symbol] = {
                name: row.stablecoin_name,
                value: Number(row.circulating_usd),
                date: currentDate
              }
            }
          }

          // Transform data for the pie chart
          const stablecoins = Object.entries(latestBySymbol)
            .map(([symbol, data], index) => ({
              symbol,
              name: data.name,
              value: data.value,
              color: getStablecoinColor(symbol, index),
            }))
            .filter(item => item.value > 0) // Only include stablecoins with positive value
            .sort((a, b) => b.value - a.value) // Sort by value descending

          // Calculate total value
          const total = stablecoins.reduce((sum, item) => sum + item.value, 0)

          setChartData(stablecoins)
          setTotalValue(total)
        } else {
          // If no data, use mock data
          const mockData = generateMockStablecoinData()
          setChartData(mockData)
          setTotalValue(mockData.reduce((sum, item) => sum + item.value, 0))
        }
      } catch (err) {
        console.error("Failed to fetch stablecoin data:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred")

        // Use mock data on error
        const mockData = generateMockStablecoinData()
        setChartData(mockData)
        setTotalValue(mockData.reduce((sum, item) => sum + item.value, 0))
      } finally {
        setLoading(false)
      }
    }

    fetchStablecoinData()
  }, [network])

  // Generate mock stablecoin data for development or fallback
  function generateMockStablecoinData(): StablecoinData[] {
    if (network.toLowerCase() === "avalanche") {
      return [
        { symbol: "USDT", name: "Tether USD", value: 493.63, color: "#00D4AA" }, // Cyan/turquoise
        { symbol: "USDC", name: "USD Coin", value: 491.47, color: "#2775CA" }, // Blue
        { symbol: "DAI", name: "Dai Stablecoin", value: 13.81, color: "#F7931A" },
        { symbol: "FRAX", name: "Frax", value: 2.42, color: "#8247E5" },
      ]
    } else {
      return [
        { symbol: "USDT", name: "Tether USD", value: 100, color: "#00D4AA" }, // Cyan/turquoise
        { symbol: "USDC", name: "USD Coin", value: 80, color: "#2775CA" }, // Blue
        { symbol: "DAI", name: "Dai Stablecoin", value: 20, color: "#F7931A" },
      ]
    }
  }

  // Format currency for display
  const formatCurrency = (value: number): string => {
    if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`
    } else if (value >= 1e3) {
      return `$${(value / 1e3).toFixed(2)}K`
    } else {
      return `$${value.toFixed(2)}`
    }
  }

  // Create Plotly chart data
  const createChartData = () => {
    const totalValue = chartData.reduce((sum, item) => sum + item.value, 0)
    
    return {
      data: [{
        type: "pie" as const,
        values: chartData.map((item) => item.value),
        labels: chartData.map((item) => item.symbol),
        text: chartData.map((item) => {
          const percentage = (item.value / totalValue) * 100
          return percentage >= 2 ? item.symbol : ''
        }),
        textinfo: "text" as const,
        textposition: "outside" as const,
        marker: {
          colors: chartData.map((item) => item.color),
        },
        hole: 0.4,
        hovertemplate: '<b>%{label}</b><br>' +
                       '%{value}<br>' +
                       '%{percent}<br>' +
                       '<extra></extra>',
        showlegend: false,
      }],
      layout: {
        autosize: true,
        margin: { l: 80, r: 80, t: 40, b: 40 },
        showlegend: false,
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
      },
      config: {
        displayModeBar: false,
        responsive: true,
      }
    }
  }

  // Render chart using Plotly directly
  const renderChart = () => {
    if (typeof window !== 'undefined' && (window as any).Plotly && chartData.length > 0) {
      const chartConfig = createChartData()
      
      return (
        <div 
          ref={(el) => {
            if (el && (window as any).Plotly) {
              (window as any).Plotly.newPlot(el, chartConfig.data, chartConfig.layout, chartConfig.config)
            }
          }}
          style={{ width: "100%", height: "100%" }}
        />
      )
    }
    
    // Fallback for when Plotly is not available
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-100 rounded-lg">
        <div className="text-gray-500">Loading chart...</div>
      </div>
    )
  }

  // Load Plotly script
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).Plotly) {
      const script = document.createElement('script')
      script.src = 'https://cdn.plot.ly/plotly-latest.min.js'
      script.onload = () => {
        // Force re-render after Plotly loads
        setLoading(false)
      }
      document.head.appendChild(script)
    }
  }, [])

  // Fallback for loading state
  if (loading) {
    return (
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-6">Stablecoin Market Share</h3>
        <div className="grid grid-cols-2 gap-8">
          {/* Left side - Top 10 Chart */}
          <div className="flex flex-col">
            <h4 className="text-md font-medium mb-4">Top 10 Stablecoins</h4>
            <div className="space-y-3">
              {chartData.slice(0, 10).map((item, index) => {
                const totalValue = chartData.reduce((sum, data) => sum + data.value, 0)
                const percentage = ((item.value / totalValue) * 100).toFixed(1)
                const maxValue = chartData[0]?.value || 1
                const barWidth = (item.value / maxValue) * 100
                
                return (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-8 text-sm font-medium text-gray-600">
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{item.symbol}</span>
                        <span className="text-sm text-gray-600">{percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${barWidth}%`,
                            backgroundColor: item.color 
                          }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatCurrency(item.value)}M
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Right side - Pie Chart */}
          <div className="flex flex-col items-center">
            <div className="w-[600px] h-[600px]">
              {renderChart()}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Display error message
  if (error) {
    return (
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-6">Stablecoin Market Share</h3>
        <div className="grid grid-cols-2 gap-8">
          {/* Left side - Top 10 Chart */}
          <div className="flex flex-col">
            <h4 className="text-md font-medium mb-4">Top 10 Stablecoins</h4>
            <div className="space-y-3">
              {chartData.slice(0, 10).map((item, index) => {
                const totalValue = chartData.reduce((sum, data) => sum + data.value, 0)
                const percentage = ((item.value / totalValue) * 100).toFixed(1)
                const maxValue = chartData[0]?.value || 1
                const barWidth = (item.value / maxValue) * 100
                
                return (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-8 text-sm font-medium text-gray-600">
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{item.symbol}</span>
                        <span className="text-sm text-gray-600">{percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${barWidth}%`,
                            backgroundColor: item.color 
                          }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatCurrency(item.value)}M
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Right side - Pie Chart */}
          <div className="flex flex-col items-center">
            <div className="w-[600px] h-[600px]">
              {renderChart()}
            </div>
          </div>
        </div>
        <div className="text-red-500">
          <p>Error loading stablecoin data:</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-6">Stablecoin Market Share</h3>
      <div className="grid grid-cols-2 gap-8">
        {/* Left side - Top 10 Chart */}
        <div className="flex flex-col">
          <h4 className="text-md font-medium mb-4">Top 10 Stablecoins</h4>
          <div className="space-y-3">
            {chartData.slice(0, 10).map((item, index) => {
              const totalValue = chartData.reduce((sum, data) => sum + data.value, 0)
              const percentage = ((item.value / totalValue) * 100).toFixed(1)
              const maxValue = chartData[0]?.value || 1
              const barWidth = (item.value / maxValue) * 100
              
              return (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-8 text-sm font-medium text-gray-600">
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{item.symbol}</span>
                      <span className="text-sm text-gray-600">{percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${barWidth}%`,
                          backgroundColor: item.color 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatCurrency(item.value)}M
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Right side - Pie Chart */}
        <div className="flex flex-col items-center">
          <div className="w-[600px] h-[600px]">
            {renderChart()}
          </div>
        </div>
      </div>
    </div>
  )
} 