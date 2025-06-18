"use client"

import { useState, useEffect, useRef } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface DexVolumePieChartProps {
  network: string
  height?: string
}

interface DexVolumeData {
  protocol: string
  volume: number
  percentage: number
}

export function DexVolumePieChart({ 
  network, 
  height = "400px" 
}: DexVolumePieChartProps) {
  const [data, setData] = useState<DexVolumeData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [latestDate, setLatestDate] = useState<string | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)

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

          // Create data array with percentages
          const allProtocolData: DexVolumeData[] = Object.entries(protocolVolumes)
            .map(([protocol, volume]) => ({
              protocol,
              volume,
              percentage: (volume / totalVolume) * 100
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
              percentage: otherPercentage
            })
          }

          setData(processedData)
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

  // Create Plotly pie chart data
  const createChartData = () => {
    if (!data.length) return null

    // Avalanche color palette
    const colors = [
      "#E84142", // Avalanche red
      "#FF6B6B", // Light red
      "#FF9B9B", // Lighter red
      "#FFA500", // Orange
      "#32CD32", // Green
      "#1E90FF", // Blue
      "#9370DB", // Purple
      "#FFD700", // Gold
      "#FF69B4", // Pink
      "#00CED1"  // Dark turquoise
    ]

    const traces: any[] = [{
      type: 'pie',
      labels: data.map(d => d.protocol),
      values: data.map(d => d.volume),
      textinfo: 'label+percent',
      textposition: 'outside',
      marker: {
        colors: colors.slice(0, data.length),
        line: {
          color: 'white',
          width: 2
        }
      },
      hovertemplate: '<b>%{label}</b><br>' +
                    'Volume: $%{value:,.0f}<br>' +
                    'Percentage: %{percent}<br>' +
                    '<extra></extra>',
      showlegend: true
    }]

    return {
      data: traces,
      layout: {
        title: `DEX Volume Distribution - ${latestDate}`,
        autosize: true,
        margin: { l: 60, r: 60, t: 60, b: 60 },
        legend: {
          orientation: 'v',
          x: 1.02,
          y: 0.5,
          font: { size: 10 }
        },
        plot_bgcolor: "white",
        paper_bgcolor: "white"
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
  }, [loading, error, data, latestDate])

  if (loading) {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading DEX volume distribution...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-red-500">Error loading DEX volume data: {error}</div>
        </div>
      </div>
    )
  }

  if (network.toLowerCase() !== "avalanche") {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-gray-500">DEX volume distribution is only available for Avalanche.</div>
        </div>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-gray-500">No DEX volume data available.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-6" style={{ height }}>
      <div className="flex flex-wrap items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold">DEX Volume Distribution</h2>
          <p className="text-sm text-gray-600">Latest data: {latestDate}</p>
        </div>
        
        <div className="text-sm text-gray-600">
          Total: ${data.reduce((sum, item) => sum + item.volume, 0).toLocaleString()}
        </div>
      </div>
      
      <div className="h-[350px] relative">
        <div ref={chartRef} className="w-full h-full"></div>
      </div>
    </div>
  )
} 