"use client"

import { useState, useEffect } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Clock, Shield, Hash } from "lucide-react"

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

interface BitcoinHashBlockChartProps {
  title?: string
  height?: string
  defaultMetric?: string
}

interface HashBlockData {
  date: string
  value: number
}

// Available metrics from btc_hashblock table with icons
const HASH_BLOCK_METRICS = [
  {
    id: "average_block_time_14ma",
    label: "Avg Block Time",
    icon: Clock,
    category: "Block Timing"
  },
  {
    id: "difficulty_14ma", 
    label: "Mining Difficulty",
    icon: Shield,
    category: "Security"
  },
  {
    id: "hash_rate_14ma",
    label: "Hash Rate",
    icon: Hash,
    category: "Computing Power"
  }
]

// Display names for metrics, with proper formatting
const METRIC_DISPLAY_NAMES: Record<string, string> = {
  "average_block_time_14ma": "Average Block Time (14-day MA)",
  "difficulty_14ma": "Mining Difficulty (14-day MA)",
  "hash_rate_14ma": "Hash Rate (14-day MA)"
}

// Units for different metrics to display on the y-axis
const METRIC_UNITS: Record<string, string> = {
  "average_block_time_14ma": "minutes",
  "difficulty_14ma": "",
  "hash_rate_14ma": "H/s"
}

export function BitcoinHashBlockChart({ 
  title = "Bitcoin Hash & Block Metrics", 
  height = "500px",
  defaultMetric = "average_block_time_14ma" 
}: BitcoinHashBlockChartProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metricTypes, setMetricTypes] = useState<string[]>([])
  const [selectedMetric, setSelectedMetric] = useState<string>(defaultMetric)
  const [hashBlockData, setHashBlockData] = useState<HashBlockData[]>([])
  const [timeRange, setTimeRange] = useState<"1M" | "3M" | "6M" | "1Y" | "ALL">("6M")

  // Format large numbers with appropriate suffixes (K, M, B, T)
  const formatLargeNumber = (num: number): string => {
    if (num >= 1e15) {
      return (num / 1e15).toFixed(2) + "P"
    } else if (num >= 1e12) {
      return (num / 1e12).toFixed(2) + "T"
    } else if (num >= 1e9) {
      return (num / 1e9).toFixed(2) + "G"
    } else if (num >= 1e6) {
      return (num / 1e6).toFixed(2) + "M"
    } else if (num >= 1e3) {
      return (num / 1e3).toFixed(2) + "K"
    } else {
      return num.toFixed(2)
    }
  }

  // Helper function to calculate date range based on selected timeRange
  const getDateRange = (): { startDate: Date; endDate: Date } => {
    const endDate = new Date()
    let startDate = new Date()

    switch (timeRange) {
      case "1M":
        startDate.setMonth(endDate.getMonth() - 1)
        break
      case "3M":
        startDate.setMonth(endDate.getMonth() - 3)
        break
      case "6M":
        startDate.setMonth(endDate.getMonth() - 6)
        break
      case "1Y":
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
      case "ALL":
        startDate = new Date("2010-01-01") // Bitcoin hash data start date
        break
    }

    return { startDate, endDate }
  }

  // Get appropriate interval based on time range for better performance
  const getInterval = (): string => {
    switch (timeRange) {
      case "1M":
        return "day"
      case "3M":
        return "day"
      case "6M":
        return "day"
      case "1Y":
        return "week"
      case "ALL":
        return "month"
      default:
        return "day"
    }
  }

  // Fetch available metric types on component mount
  useEffect(() => {
    async function fetchMetricTypes() {
      if (!isSupabaseConfigured()) {
        return
      }

      try {
        // Get all available metrics from the HASH_BLOCK_METRICS array
        const availableMetrics = HASH_BLOCK_METRICS.map(m => m.id)
        setMetricTypes(availableMetrics)
      } catch (err) {
        console.error("Failed to fetch metric types:", err)
      }
    }

    fetchMetricTypes()
  }, [])

  // Fetch hash block data when selected metric or time range changes
  useEffect(() => {
    async function fetchHashBlockData() {
      if (!isSupabaseConfigured() || !selectedMetric) {
        return
      }

      try {
        setLoading(true)
        setError(null)

        const { startDate, endDate } = getDateRange()
        const interval = getInterval()

        // Adjust query based on time range for better performance
        let query = supabase
          .from("btc_hashblock")
          .select(`day, ${selectedMetric}`)
          .gte('day', startDate.toISOString())
          .lte('day', endDate.toISOString())
          .order('day', { ascending: true })

        // For longer time ranges, potentially sample data to improve performance
        if (timeRange === "ALL") {
          // For ALL time range, we might want to sample every nth day
          query = query.limit(1000)
        }

        const { data, error } = await query

        if (error) throw error

        if (data && data.length > 0) {
          // Format the data for the chart
          const formattedData = data
            .filter((item: any) => item[selectedMetric] !== null && item[selectedMetric] !== undefined)
            .map((item: any) => ({
              date: new Date(item.day).toISOString().split('T')[0],
              value: Number(item[selectedMetric])
            }))
          
          setHashBlockData(formattedData)
        } else {
          setHashBlockData([])
        }
      } catch (err) {
        console.error("Failed to fetch hash block data:", err)
        setError("Failed to load hash block data. Please try again later.")
        
        // Generate sample data in case of failure
        generateSampleData()
      } finally {
        setLoading(false)
      }
    }

    fetchHashBlockData()
  }, [selectedMetric, timeRange])

  // Generate sample data for demonstration
  const generateSampleData = () => {
    const { startDate, endDate } = getDateRange()
    const sampleData: HashBlockData[] = []
    
    const current = new Date(startDate)
    const end = new Date(endDate)
    
    // Base value depends on the selected metric
    let baseValue = 0
    let multiplier = 1
    
    if (selectedMetric === "average_block_time_14ma") {
      baseValue = 9.5 // ~9.5 minutes average (close to the 10 minute target)
      multiplier = 0.1 // Small variations
    } else if (selectedMetric === "difficulty_14ma") {
      baseValue = 75000000000000 // 75T difficulty (realistic 2024/2025 range)
      multiplier = 0.05 // Small difficulty adjustments
    } else if (selectedMetric === "hash_rate_14ma") {
      baseValue = 600000000000000000000 // 600 EH/s (realistic current range)
      multiplier = 0.1 // Hash rate variations
    }
    
    // Generate data points based on time range
    const dayIncrement = timeRange === "ALL" ? 7 : 1 // Weekly for ALL, daily for others
    
    while (current <= end) {
      const randomVariation = (Math.random() - 0.5) * multiplier
      const value = baseValue * (1 + randomVariation)
      
      sampleData.push({
        date: current.toISOString().split('T')[0],
        value: Math.max(0, value) // Ensure no negative values
      })
      
      current.setDate(current.getDate() + dayIncrement)
    }
    
    setHashBlockData(sampleData)
  }

  // Get metric display name
  const getMetricDisplayName = (metric: string): string => {
    return METRIC_DISPLAY_NAMES[metric] || metric
  }

  // Get y-axis label with proper units
  const getYAxisLabel = (): string => {
    const unit = METRIC_UNITS[selectedMetric] || ""
    if (selectedMetric === "difficulty_14ma") {
      return "Mining Difficulty (14-day MA) (T)" // Show T in the axis label
    }
    return unit ? `${getMetricDisplayName(selectedMetric)} (${unit})` : getMetricDisplayName(selectedMetric)
  }

  // Format y-axis values for display
  const formatYValue = (value: number): string => {
    const unit = METRIC_UNITS[selectedMetric] || ""
    
    if (unit === "minutes") {
      return value.toFixed(2)
    } else if (selectedMetric === "difficulty_14ma") {
      // For difficulty, convert to trillions
      return (value / 1e12).toFixed(1) + " T"
    } else if (unit === "H/s") {
      // For hash rate, use scientific notation for very large numbers
      if (value >= 1e18) {
        return (value / 1e18).toFixed(2) + " EH/s"
      } else if (value >= 1e15) {
        return (value / 1e15).toFixed(2) + " PH/s"
      } else if (value >= 1e12) {
        return (value / 1e12).toFixed(2) + " TH/s"
      } else if (value >= 1e9) {
        return (value / 1e9).toFixed(2) + " GH/s"
      } else {
        return value.toExponential(2)
      }
    } else {
      return formatLargeNumber(value)
    }
  }

  // Get hover template for different metrics
  const getHoverTemplate = (): string => {
    const unit = METRIC_UNITS[selectedMetric] || ""
    
    if (unit === "minutes") {
      return "%{y:.2f} min<extra></extra>"
    } else if (selectedMetric === "difficulty_14ma") {
      return "%{y:.1f}T<extra></extra>"
    } else if (unit === "H/s") {
      return "%{y:.2e} H/s<extra></extra>"
    } else {
      return "%{y:.2f}<extra></extra>"
    }
  }

  // Create Plotly chart data
  const createChartData = () => {
    if (!hashBlockData.length) return []

    // Sort data by date
    const sortedData = [...hashBlockData].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    // Transform Y values based on metric type for proper display
    const transformedYValues = sortedData.map(d => {
      if (selectedMetric === "difficulty_14ma") {
        // Convert difficulty from raw value to trillions for chart display
        return d.value / 1e12
      }
      return d.value
    })
    
    return [
      {
        x: sortedData.map(d => d.date),
        y: transformedYValues,
        type: 'scatter',
        mode: 'lines',
        name: getMetricDisplayName(selectedMetric || ""),
        line: {
          width: 2,
          color: "#F7931A", // Bitcoin orange
          shape: 'spline'
        },
        hovertemplate: getHoverTemplate(),
      }
    ]
  }

  // Create chart layout
  const createChartLayout = () => {
    // Determine appropriate tick format based on metric and typical value ranges
    let tickFormat = ",.0f" // Default format
    let tickSuffix = ""
    
    if (selectedMetric === "average_block_time_14ma") {
      // Block time is typically around 10 minutes, use decimal format
      tickFormat = ",.2f"
    } else if (selectedMetric === "difficulty_14ma") {
      // Difficulty values are converted to trillions, add T suffix
      tickFormat = ".1f"
      tickSuffix = "T"
    } else if (selectedMetric === "hash_rate_14ma") {
      // Hash rate values are extremely large, use custom format
      tickFormat = "~s" // This will show proper suffixes
    }

    return {
      autosize: true,
      margin: { l: 60, r: 20, t: 60, b: 50 },
      xaxis: {
        title: "Date",
        type: "date",
        gridcolor: "#e5e7eb",
        showgrid: true
      },
      yaxis: {
        title: getYAxisLabel(),
        titlefont: { color: "#F7931A" },
        gridcolor: "#e5e7eb",
        showgrid: true,
        tickformat: tickFormat,
        ticksuffix: tickSuffix, // Add T suffix for difficulty values
        // Custom tick formatting function for better control
        tickmode: 'auto',
        nticks: 8
      },
      plot_bgcolor: "white",
      paper_bgcolor: "white",
      hovermode: "closest",
      colorway: ["#F7931A"],
      showlegend: false
    }
  }

  if (loading) {
    return (
      <div className="border rounded-lg p-6 mb-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading hash block data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border rounded-lg p-6 mb-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-red-500">Error loading hash block data: {error}</div>
        </div>
      </div>
    )
  }

  if (!hashBlockData.length) {
    return (
      <div className="border rounded-lg p-6 mb-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-gray-500">No hash block data available.</div>
        </div>
      </div>
    )
  }

  const chartData = createChartData()
  const chartLayout = createChartLayout()

  return (
    <div className="border rounded-lg p-6 mb-6" style={{ height }}>
      <div className="flex flex-wrap items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
        </div>
        
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          {/* Metric Selector */}
          <div className="flex flex-wrap space-x-1 gap-1">
            {HASH_BLOCK_METRICS.map((metric) => {
              const IconComponent = metric.icon
              return (
                <Button
                  key={metric.id}
                  variant={selectedMetric === metric.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedMetric(metric.id)}
                  className="text-xs"
                  style={{
                    backgroundColor: selectedMetric === metric.id ? "#F7931A" : "",
                    borderColor: selectedMetric === metric.id ? "#F7931A" : "",
                    color: selectedMetric === metric.id ? "white" : "",
                  }}
                >
                  <IconComponent className="h-4 w-4 mr-2" />
                  {metric.label}
                </Button>
              )
            })}
          </div>
          
          {/* Time Range Selector */}
          <div className="flex space-x-1">
            {(["1M", "3M", "6M", "1Y", "ALL"] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(range)}
                className="text-xs"
                style={{
                  backgroundColor: timeRange === range ? "#F7931A" : "",
                  borderColor: timeRange === range ? "#F7931A" : "",
                  color: timeRange === range ? "white" : "",
                }}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="h-[300px] relative">
        {chartData.length > 0 ? (
          <Plot
            data={chartData}
            layout={chartLayout}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-gray-500 text-center">
              <p>No data available for {getMetricDisplayName(selectedMetric || "")}.</p>
              <p>Please select a different metric or time range.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 