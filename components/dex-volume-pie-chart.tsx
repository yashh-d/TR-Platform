"use client"

import { useState, useEffect, useRef } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

interface DexVolumePieChartProps {
  network: string
  height?: string
}

interface DexVolumeData {
  protocol: string
  volume: number
  percentage: number
  color: string
}

// Define a color palette for DEXes that matches the Avalanche branding
const DEX_COLOR_PALETTE = [
  '#E84142', // Pharaoh CL - Avalanche red (largest segment)
  '#FF6B6B', // Joe DEX - Light red
  '#FF9B9B', // Joe V2.2 - Lighter red  
  '#FFA500', // Joe V2.1 - Orange
  '#32CD32', // Pharaoh Legacy - Green
  '#1E90FF', // Dexalot DEX - Blue
  '#9370DB', // WOOFi Swap - Purple
  '#FFD700', // Arena DEX - Gold
  '#FF69B4', // DODO AMM - Pink
  '#00CED1', // Uniswap V3 - Dark turquoise
  '#87CEEB', // Other - Light blue
]

export function DexVolumePieChart({ 
  network, 
  height = "400px" 
}: DexVolumePieChartProps) {
  const [data, setData] = useState<DexVolumeData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [latestDate, setLatestDate] = useState<string | null>(null)
  const [totalVolume, setTotalVolume] = useState(0)

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

    async function fetchDexVolumeData() {
      setLoading(true)
      setError(null)
      
      try {
        // First, get the latest date
        const { data: latestDateData, error: dateError } = await supabase
          .from('avalanche_dex_volumes')
          .select('date')
          .order('date', { ascending: false })
          .limit(1)

        if (dateError) {
          throw new Error(`Error fetching latest date: ${dateError.message}`)
        }

        if (!latestDateData || latestDateData.length === 0) {
          setError("No DEX volume data available")
          setLoading(false)
          return
        }

        const latestDate = latestDateData[0].date
        setLatestDate(latestDate)

        // Now get all volumes for the latest date, grouped by protocol
        const { data: volumeData, error: volumeError } = await supabase
          .from('avalanche_dex_volumes')
          .select('protocol, volume')
          .eq('date', latestDate)
          .neq('protocol', 'total') // Exclude the total aggregate row
          .order('volume', { ascending: false })

        if (volumeError) {
          throw new Error(`Error fetching DEX volume data: ${volumeError.message}`)
        }

        if (volumeData && volumeData.length > 0) {
          // Group by protocol and sum volumes
          const protocolVolumes = volumeData.reduce((acc: Record<string, number>, item) => {
            acc[item.protocol] = (acc[item.protocol] || 0) + Number(item.volume)
            return acc
          }, {})

          // Calculate total volume
          const totalVolume = Object.values(protocolVolumes).reduce((sum, vol) => sum + vol, 0)
          setTotalVolume(totalVolume)

          // Create data array with percentages
          const allProtocolData: DexVolumeData[] = Object.entries(protocolVolumes)
            .map(([protocol, volume]) => ({
              protocol,
              volume,
              percentage: (volume / totalVolume) * 100,
              color: ''
            }))
            .sort((a, b) => b.volume - a.volume) // Sort by volume descending

          // Separate protocols with >= 1% and < 1%
          const significantProtocols = allProtocolData.filter(item => item.percentage >= 1)
          const smallProtocols = allProtocolData.filter(item => item.percentage < 1)

          // Create "Other" category if there are small protocols
          const processedData: DexVolumeData[] = [...significantProtocols]
          
          if (smallProtocols.length > 0) {
            const otherVolume = smallProtocols.reduce((sum, item) => sum + item.volume, 0)
            const otherPercentage = smallProtocols.reduce((sum, item) => sum + item.percentage, 0)
            
            processedData.push({
              protocol: 'Other',
              volume: otherVolume,
              percentage: otherPercentage,
              color: ''
            })
          }

          // Add colors to the data
          const dataWithColors = processedData.map((item, index) => ({
            ...item,
            color: DEX_COLOR_PALETTE[index % DEX_COLOR_PALETTE.length]
          }))

          setData(dataWithColors)
        }
      } catch (err) {
        console.error('Error fetching DEX volume data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchDexVolumeData()
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

  // Create Plotly chart data
  const createChartData = () => {
    if (!data.length) return null
    
    return {
      data: [{
        type: "pie" as const,
        values: data.map((item) => item.volume),
        labels: data.map((item) => item.protocol),
        text: data.map((item) => {
          return item.percentage >= 2 ? item.protocol : ''
        }),
        textinfo: "text" as const,
        textposition: "outside" as const,
        marker: {
          colors: data.map((item) => item.color),
        },
        hole: 0.4,
        hovertemplate: '<b>%{label}</b><br>' +
                       'Volume: $%{value:,.0f}<br>' +
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
        <h3 className="text-lg font-semibold mb-6">DEX Volume Distribution</h3>
        <div className="grid grid-cols-2 gap-8">
          {/* Left side - Top 10 Chart */}
          <div className="flex flex-col">
            <h4 className="text-md font-medium mb-4">Latest data: 2025-06-22</h4>
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
        <h3 className="text-lg font-semibold mb-6">DEX Volume Distribution</h3>
        <div className="text-red-500 text-center p-8">{error}</div>
      </div>
    )
  }

  if (network.toLowerCase() !== "avalanche") {
    return (
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-6">DEX Volume Distribution</h3>
        <div className="text-gray-500 text-center p-8">DEX volume distribution is only available for Avalanche.</div>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-6">DEX Volume Distribution</h3>
        <div className="text-gray-500 text-center p-8">No DEX volume data available.</div>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">DEX Volume Distribution</h3>
          <p className="text-sm text-gray-600">Latest data: {latestDate}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-8">
        {/* Left side - Top 10 Chart */}
        <div className="flex flex-col">
          <h4 className="text-md font-medium mb-4">Top DEXes by Volume</h4>
          <div className="space-y-3">
            {data.slice(0, 10).map((dex, index) => {
              const maxValue = data[0]?.volume || 1
              const barWidth = (dex.volume / maxValue) * 100
              
              return (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-8 text-sm font-medium text-gray-600">
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{dex.protocol}</span>
                      <span className="text-sm text-gray-600">{dex.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${barWidth}%`,
                          backgroundColor: dex.color 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatCurrency(dex.volume)}
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
          <div className="text-lg font-semibold mt-4">
            24H DEX Volume: {formatCurrency(totalVolume)}
          </div>
        </div>
      </div>
    </div>
  )
} 