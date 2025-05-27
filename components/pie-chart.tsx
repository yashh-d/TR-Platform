"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

interface PieChartProps {
  network: string
}

interface AssetClassData {
  asset_class: string
  value: number
  color: string
}

export function PieChartComponent({ network }: PieChartProps) {
  const [chartData, setChartData] = useState<AssetClassData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalValue, setTotalValue] = useState(0)

  useEffect(() => {
    async function fetchPieData() {
      setLoading(true)
      setError(null)

      try {
        // Check if Supabase is configured
        if (!isSupabaseConfigured()) {
          throw new Error("Supabase is not properly configured. Please check your environment variables.")
        }

        // Generate mock data if in development or if requested
        if (process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true") {
          const mockData = generateMockPieData()
          setChartData(mockData)
          setTotalValue(mockData.reduce((sum, item) => sum + item.value, 0))
          setLoading(false)
          return
        }

        // Fetch asset class distribution data
        const { data, error } = await supabase
          .from("asset_class_distribution")
          .select("*")
          .eq("network", network.toLowerCase())

        if (error) {
          throw new Error(`Error fetching pie chart data: ${error.message}`)
        }

        if (data && data.length > 0) {
          // Transform data for the pie chart
          const assetClasses = data.map((item) => ({
            asset_class: item.asset_class,
            value: item.value,
            color: getColorForAssetClass(item.asset_class),
          }))

          // Calculate total value
          const total = assetClasses.reduce((sum, item) => sum + item.value, 0)

          setChartData(assetClasses)
          setTotalValue(total)
        } else {
          // If no data, use mock data
          const mockData = generateMockPieData()
          setChartData(mockData)
          setTotalValue(mockData.reduce((sum, item) => sum + item.value, 0))
        }
      } catch (err) {
        console.error("Failed to fetch pie chart data:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred")

        // Use mock data on error
        const mockData = generateMockPieData()
        setChartData(mockData)
        setTotalValue(mockData.reduce((sum, item) => sum + item.value, 0))
      } finally {
        setLoading(false)
      }
    }

    fetchPieData()
  }, [network])

  // Generate mock pie chart data for development or fallback
  function generateMockPieData(): AssetClassData[] {
    return [
      { asset_class: "Institutional", value: 144.4, color: "#10b981" },
      { asset_class: "Real Estate", value: 16.9, color: "#f59e0b" },
      { asset_class: "Other", value: 8.0, color: "#ef4444" },
    ]
  }

  // Helper function to assign colors to asset classes
  const getColorForAssetClass = (assetClass: string): string => {
    const colorMap: Record<string, string> = {
      Institutional: "#10b981",
      "Real Estate": "#f59e0b",
      "Private Equity": "#3b82f6",
      Commodities: "#8b5cf6",
      "Fixed Income": "#ec4899",
      Other: "#ef4444",
    }

    return colorMap[assetClass] || "#6b7280"
  }

  // Format currency for display
  const formatCurrency = (value: number): string => {
    if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`
    } else {
      return `$${value.toFixed(2)}M`
    }
  }

  // Fallback for loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-pulse text-gray-400">Loading chart data...</div>
      </div>
    )
  }

  // Display error message
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-red-500">
          <p>Error loading chart data:</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <div className="w-[200px] h-[200px]">
        <Plot
          data={[
            {
              type: "pie",
              values: chartData.map((item) => item.value),
              labels: chartData.map((item) => item.asset_class),
              marker: {
                colors: chartData.map((item) => item.color),
              },
              hole: 0.4,
              textinfo: "none",
              hoverinfo: "label+percent",
              showlegend: false,
            },
          ]}
          layout={{
            autosize: true,
            margin: { l: 0, r: 0, t: 0, b: 0 },
            showlegend: false,
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: "rgba(0,0,0,0)",
          }}
          config={{
            displayModeBar: false,
            responsive: true,
          }}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
      <div className="mt-4 text-center">
        <div className="text-sm text-gray-500">Total value of {network} Funds</div>
        <div className="font-bold">{formatCurrency(totalValue)}</div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 w-full">
        {chartData.map((item, index) => (
          <div key={index} className="text-xs">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: item.color }}></div>
              <span>{item.asset_class}</span>
            </div>
            <div className="font-medium">{formatCurrency(item.value)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
