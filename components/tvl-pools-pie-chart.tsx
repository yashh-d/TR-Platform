"use client"

import { useState, useEffect, useRef } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { Skeleton } from "@/components/ui/skeleton"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TVLPoolsPieChartProps {
  network: string
  height?: string
}

interface TVLPoolData {
  project: string
  pool: string
  tvl_usd: number
  percentage: number
  color: string
  symbol: string
}

// Define a color palette for pools that matches the Avalanche branding
const POOL_COLOR_PALETTE = [
  '#E84142', // Avalanche red (largest segment)
  '#FF6B6B', // Light red
  '#FF9B9B', // Lighter red  
  '#FFA500', // Orange
  '#32CD32', // Green
  '#1E90FF', // Blue
  '#9370DB', // Purple
  '#FFD700', // Gold
  '#FF69B4', // Pink
  '#00CED1', // Dark turquoise
  '#87CEEB', // Light blue
  '#20B2AA', // Light sea green
  '#DDA0DD', // Plum
  '#98FB98', // Pale green
  '#F0E68C', // Khaki
]

export function TVLPoolsPieChart({ 
  network, 
  height = "400px" 
}: TVLPoolsPieChartProps) {
  const [data, setData] = useState<TVLPoolData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalTVL, setTotalTVL] = useState(0)

  useEffect(() => {
    if (network.toLowerCase() !== "avalanche") {
      setLoading(false)
      return
    }

    if (!isSupabaseConfigured()) {
      setError("Supabase is not properly configured")
      setLoading(false)
      return
    }

    async function fetchTVLPoolsData() {
      setLoading(true)
      setError(null)
      
      try {
        // Get pools with TVL data, ordered by TVL descending
        const { data: poolsData, error: poolsError } = await supabase
          .from('avalanche_yield_metrics')
          .select('project, symbol, pool, tvl_usd')
          .not('tvl_usd', 'is', null)
          .gt('tvl_usd', 0)
          .order('tvl_usd', { ascending: false })

        if (poolsError) {
          throw new Error(`Error fetching TVL pools data: ${poolsError.message}`)
        }

        if (poolsData && poolsData.length > 0) {
          // Calculate total TVL
          const totalTVL = poolsData.reduce((sum, pool) => sum + Number(pool.tvl_usd), 0)
          setTotalTVL(totalTVL)

          // Create data array with percentages
          const allPoolData: TVLPoolData[] = poolsData.map((pool) => ({
            project: pool.project,
            pool: `${pool.project} ${pool.symbol}`,
            tvl_usd: Number(pool.tvl_usd),
            percentage: (Number(pool.tvl_usd) / totalTVL) * 100,
            color: '',
            symbol: pool.symbol
          }))

          // Separate pools with >= 2% and < 2%
          const significantPools = allPoolData.filter(item => item.percentage >= 2)
          const smallPools = allPoolData.filter(item => item.percentage < 2)

          // Create "Other" category if there are small pools
          const processedData: TVLPoolData[] = [...significantPools]
          
          if (smallPools.length > 0) {
            const otherTVL = smallPools.reduce((sum, item) => sum + item.tvl_usd, 0)
            const otherPercentage = smallPools.reduce((sum, item) => sum + item.percentage, 0)
            
            processedData.push({
              project: 'Other',
              pool: 'Other Pools',
              tvl_usd: otherTVL,
              percentage: otherPercentage,
              color: '',
              symbol: ''
            })
          }

          // Add colors to the data
          const dataWithColors = processedData.map((item, index) => ({
            ...item,
            color: POOL_COLOR_PALETTE[index % POOL_COLOR_PALETTE.length]
          }))

          setData(dataWithColors)
        }
      } catch (err) {
        console.error('Error fetching TVL pools data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchTVLPoolsData()
  }, [network])

  // Format large numbers with appropriate suffixes (K, M, B, T)
  const formatLargeNumber = (num: number): string => {
    if (num >= 1e12) {
      return (num / 1e12).toFixed(2) + "T"
    } else if (num >= 1e9) {
      return (num / 1e9).toFixed(2) + "B"
    } else if (num >= 1e6) {
      return (num / 1e6).toFixed(2) + "M"
    } else if (num >= 1e3) {
      return (num / 1e3).toFixed(2) + "K"
    } else {
      return num.toFixed(2)
    }
  }

  // Format currency
  const formatCurrency = (amount: number): string => {
    return `$${formatLargeNumber(amount)}`
  }

  // Handle CSV download
  const handleDownload = () => {
    if (data.length === 0) return
    
    let csvContent = "data:text/csv;charset=utf-8,"
    
    // Add headers
    csvContent += "Rank,Project,Pool,TVL_USD,Percentage\n"
    
    // Add data rows
    data.forEach((item, index) => {
      csvContent += `${index + 1},${item.project},${item.pool},${item.tvl_usd},${item.percentage.toFixed(2)}%\n`
    })
    
    // Create download link
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${network}_tvl_pools_distribution.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Create Plotly chart data
  const createChartData = () => {
    if (!data.length) return null
    
    return {
      data: [{
        type: "pie" as const,
        values: data.map((item) => item.tvl_usd),
        labels: data.map((item) => item.pool),
        text: data.map((item) => {
          return item.percentage >= 3 ? item.project : ''
        }),
        textinfo: "text" as const,
        textposition: "outside" as const,
        marker: {
          colors: data.map((item) => item.color),
        },
        hole: 0.4,
        hovertemplate: '<b>%{label}</b><br>' +
                       'Project: ' + data.map(item => item.project) + '<br>' +
                       'TVL: $%{value:,.0f}<br>' +
                       'Percentage: %{percent}<br>' +
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
    if (typeof window !== 'undefined' && (window as any).Plotly && data.length > 0) {
      const chartConfig = createChartData()
      
      if (chartConfig) {
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

  if (loading) {
    return (
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-6">TVL Distribution by Pools</h3>
        <div className="grid grid-cols-2 gap-8">
          {/* Left side - Top 10 Chart */}
          <div className="flex flex-col">
            <h4 className="text-md font-medium mb-4">Top Pools by TVL</h4>
            <div className="space-y-3">
              {Array(10).fill(0).map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-8 text-sm font-medium text-gray-600">
                    #{i + 1}
                  </div>
                  <div className="flex-1">
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Right side - Pie Chart */}
          <div className="flex flex-col items-center">
            <div className="w-[500px] h-[500px]">
              <Skeleton className="w-full h-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error && data.length === 0) {
    return (
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-6">TVL Distribution by Pools</h3>
        <div className="text-red-500 text-center p-8">{error}</div>
      </div>
    )
  }

  if (network.toLowerCase() !== "avalanche") {
    return (
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-6">TVL Distribution by Pools</h3>
        <div className="text-gray-500 text-center p-8">TVL pool distribution is only available for Avalanche.</div>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-6">TVL Distribution by Pools</h3>
        <div className="text-gray-500 text-center p-8">No TVL pool data available.</div>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">TVL Distribution by Pools</h3>
          <p className="text-sm text-gray-600">Total Value Locked in DeFi Pools</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-600">
            Total: {formatCurrency(totalTVL)}
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDownload}
            className="text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            CSV
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-8">
        {/* Left side - Top 10 Chart */}
        <div className="flex flex-col">
          <h4 className="text-md font-medium mb-4">Top Pools by TVL</h4>
          <div className="space-y-3">
            {data.slice(0, 10).map((pool, index) => {
              const maxValue = data[0]?.tvl_usd || 1
              const barWidth = (pool.tvl_usd / maxValue) * 100
              
              return (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-8 text-sm font-medium text-gray-600">
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{pool.project}</span>
                      <span className="text-sm text-gray-600">{pool.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="text-xs text-gray-500 mb-1">{pool.symbol}</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${barWidth}%`,
                          backgroundColor: pool.color 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatCurrency(pool.tvl_usd)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Right side - Pie Chart */}
        <div className="flex flex-col items-center">
          <div className="w-[500px] h-[500px]">
            {renderChart()}
          </div>
        </div>
      </div>
    </div>
  )
} 