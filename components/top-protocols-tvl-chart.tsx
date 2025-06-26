"use client"

import { useState, useEffect } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TopProtocolsTVLChartProps {
  network: string
}

interface ProtocolTVL {
  protocol: string
  tvl: number
  rank: number
  color: string
}

// Define a color palette for protocols
const PROTOCOL_COLOR_PALETTE = [
  '#E84142', // Avalanche red
  '#627EEA', // Ethereum blue  
  '#14F195', // Solana green
  '#F7931A', // Bitcoin orange
  '#8247E5', // Polygon purple
  '#FFB700', // Amber
  '#2196F3', // Blue
  '#4CAF50', // Green
  '#9C27B0', // Purple
  '#FF5722', // Deep Orange
  '#00BCD4', // Cyan
  '#795548', // Brown
  '#607D8B', // Blue Grey
  '#FF9800', // Orange
  '#CDDC39', // Lime
  '#E91E63', // Pink
  '#9E9E9E', // Grey
  '#3F51B5', // Indigo
  '#009688', // Teal
  '#8BC34A', // Light Green
]

export function TopProtocolsTVLChart({ network }: TopProtocolsTVLChartProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [protocols, setProtocols] = useState<ProtocolTVL[]>([])
  const [totalTVL, setTotalTVL] = useState(0)

  // Get the normalized network name for the database
  const getNormalizedNetwork = (network: string): string => {
    switch (network.toLowerCase()) {
      case "avalanche":
        return "Avalanche"
      case "ethereum":
        return "Ethereum"
      case "solana":
        return "Solana"
      case "bitcoin":
        return "Bitcoin"
      case "polygon":
        return "Polygon"
      case "core":
        return "Core"
      default:
        return "Avalanche" // Default to Avalanche
    }
  }

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

  // Fetch top 10 protocols by TVL
  useEffect(() => {
    async function fetchTopProtocols() {
      if (!isSupabaseConfigured()) {
        setError("Supabase is not properly configured")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const normalizedNetwork = getNormalizedNetwork(network)
        
        // Generate sample data for now
        const sampleData = generateSampleData(network)
        
        // Add colors to the data
        const protocolsWithColors = sampleData.map((protocol, index) => ({
          ...protocol,
          color: PROTOCOL_COLOR_PALETTE[index % PROTOCOL_COLOR_PALETTE.length]
        }))
        
        setProtocols(protocolsWithColors)
        setTotalTVL(protocolsWithColors.reduce((sum, protocol) => sum + protocol.tvl, 0))
      } catch (err) {
        const normalizedNetwork = getNormalizedNetwork(network)
        console.error("Failed to fetch top protocols:", {
          error: err,
          message: err instanceof Error ? err.message : 'Unknown error',
          network: normalizedNetwork
        })
        setError("Failed to load top protocols. Please try again later.")
        
        // Generate sample data for demonstration if there's an error
        const sampleData = generateSampleData(network)
        const protocolsWithColors = sampleData.map((protocol, index) => ({
          ...protocol,
          color: PROTOCOL_COLOR_PALETTE[index % PROTOCOL_COLOR_PALETTE.length]
        }))
        setProtocols(protocolsWithColors)
        setTotalTVL(protocolsWithColors.reduce((sum, protocol) => sum + protocol.tvl, 0))
      } finally {
        setLoading(false)
      }
    }

    fetchTopProtocols()
  }, [network])

  // Generate sample data for demonstration
  const generateSampleData = (network: string): ProtocolTVL[] => {
    const baseProtocols = [
      { protocol: "AAVE", tvl: 625820000, rank: 1, color: "" },
      { protocol: "Benqi", tvl: 372680000, rank: 2, color: "" },
      { protocol: "Euler", tvl: 132000000, rank: 3, color: "" },
      { protocol: "LFJ", tvl: 106690000, rank: 4, color: "" },
      { protocol: "Pharaoh Exchange", tvl: 55990000, rank: 5, color: "" },
      { protocol: "BlackRock BUIDL", tvl: 52820000, rank: 6, color: "" },
      { protocol: "OpenTrade", tvl: 43240000, rank: 7, color: "" },
      { protocol: "GMX", tvl: 35980000, rank: 8, color: "" },
      { protocol: "Franklin Templeton", tvl: 34260000, rank: 9, color: "" },
      { protocol: "GoGoPool", tvl: 21580000, rank: 10, color: "" }
    ]
    
    return baseProtocols
  }

  // Handle CSV download
  const handleDownload = () => {
    if (protocols.length === 0) return
    
    let csvContent = "data:text/csv;charset=utf-8,"
    
    // Add headers
    csvContent += "Rank,Protocol,TVL\n"
    
    // Add data rows
    protocols.forEach(item => {
      csvContent += `${item.rank},${item.protocol},${item.tvl}\n`
    })
    
    // Create download link
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${network}_top_protocols_by_tvl.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Create Plotly chart data
  const createChartData = () => {
    if (!protocols.length) return null
    
    return {
      data: [{
        type: "pie" as const,
        values: protocols.map((protocol) => protocol.tvl),
        labels: protocols.map((protocol) => protocol.protocol),
        text: protocols.map((protocol) => {
          const percentage = (protocol.tvl / totalTVL) * 100
          return percentage >= 2 ? protocol.protocol : ''
        }),
        textinfo: "text" as const,
        textposition: "outside" as const,
        marker: {
          colors: protocols.map((protocol) => protocol.color),
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
    if (typeof window !== 'undefined' && (window as any).Plotly && protocols.length > 0) {
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
        <h3 className="text-lg font-semibold mb-6">Top Protocols by TVL</h3>
        <div className="grid grid-cols-2 gap-8">
          {/* Left side - Top 10 Chart */}
          <div className="flex flex-col">
            <h4 className="text-md font-medium mb-4">Top 10 Protocols</h4>
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

  if (error && protocols.length === 0) {
    return (
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-6">Top Protocols by TVL</h3>
        <div className="text-red-500 text-center p-8">{error}</div>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Top Protocols by TVL</h3>
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
      
      <div className="grid grid-cols-2 gap-8">
        {/* Left side - Top 10 Chart */}
        <div className="flex flex-col">
          <h4 className="text-md font-medium mb-4">Top 10 Protocols</h4>
          <div className="space-y-3">
            {protocols.slice(0, 10).map((protocol, index) => {
              const percentage = ((protocol.tvl / totalTVL) * 100).toFixed(1)
              const maxValue = protocols[0]?.tvl || 1
              const barWidth = (protocol.tvl / maxValue) * 100
              
              return (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-8 text-sm font-medium text-gray-600">
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{protocol.protocol}</span>
                      <span className="text-sm text-gray-600">{percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${barWidth}%`,
                          backgroundColor: protocol.color 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatCurrency(protocol.tvl)}
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