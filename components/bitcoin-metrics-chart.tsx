"use client"

import { useState, useEffect } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Download } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

interface BitcoinMetricsChartProps {
  title?: string
  height?: string
  defaultMetric?: string
}

interface MetricData {
  date: string
  value: number
}

// Categorized metrics for better organization in the dropdown
const METRIC_CATEGORIES = {
  "Price Metrics": [
    "close_price", "open_price", "high_price", "low_price", 
    "ma50", "ma100", "ma200", "sma50", "sma100", "sma200"
  ],
  "Network Activity": [
    "active_address", "txn_count", "txn_volume_in_btc", 
    "avg_txn_size", "avg_txn_fee_in_dollar"
  ],
  "Mining & Hash Rate": [
    "hash_rate", "avg_difficulty", "miner_income", 
    "miner_revenue", "miner_revenue_365ma"
  ],
  "Supply & Inflation": [
    "circulating", "issuance", "annualized_inflation"
  ],
  "Fees & Revenue": [
    "fee", "total_fees", "fee_to_reward_ratio", "total_mint", "output_value"
  ],
  "Volume & Volatility": [
    "volume", "volume_in_dollar", "volatility_30d", 
    "volatility_90d", "volatility_200d", "puell_multiple"
  ]
}

// Display names for metrics, with proper formatting
const METRIC_DISPLAY_NAMES: Record<string, string> = {
  "active_address": "Active Addresses",
  "annualized_inflation": "Annualized Inflation",
  "avg_difficulty": "Average Difficulty",
  "avg_txn_fee_in_dollar": "Average Transaction Fee (USD)",
  "avg_txn_size": "Average Transaction Size (bytes)",
  "circulating": "Circulating Supply (BTC)",
  "close_price": "Close Price (USD)",
  "fee": "Fee Rate",
  "fee_to_reward_ratio": "Fee to Reward Ratio",
  "hash_rate": "Hash Rate (TH/s)",
  "high_price": "High Price (USD)",
  "issuance": "Issuance (BTC)",
  "low_price": "Low Price (USD)",
  "ma50": "Moving Average (50-day)",
  "ma100": "Moving Average (100-day)",
  "ma200": "Moving Average (200-day)",
  "miner_income": "Miner Income (USD)",
  "miner_revenue": "Miner Revenue (USD)",
  "miner_revenue_365ma": "Miner Revenue (365-day MA)",
  "open_price": "Open Price (USD)",
  "output_value": "Output Value (BTC)",
  "puell_multiple": "Puell Multiple",
  "sma50": "Simple Moving Average (50-day)",
  "sma100": "Simple Moving Average (100-day)",
  "sma200": "Simple Moving Average (200-day)",
  "total_fees": "Total Fees (BTC)",
  "total_mint": "Total Mint (BTC)",
  "txn_count": "Transaction Count",
  "txn_volume_in_btc": "Transaction Volume (BTC)",
  "volatility_30d": "Volatility (30-day)",
  "volatility_90d": "Volatility (90-day)",
  "volatility_200d": "Volatility (200-day)",
  "volume": "Volume (BTC)",
  "volume_in_dollar": "Volume (USD)"
}

// Units for different metrics to display on the y-axis
const METRIC_UNITS: Record<string, string> = {
  "active_address": "Addresses",
  "annualized_inflation": "%",
  "avg_difficulty": "",
  "avg_txn_fee_in_dollar": "USD",
  "avg_txn_size": "bytes",
  "circulating": "BTC",
  "close_price": "USD",
  "fee": "BTC",
  "fee_to_reward_ratio": "",
  "hash_rate": "TH/s",
  "high_price": "USD",
  "issuance": "BTC",
  "low_price": "USD",
  "ma50": "USD",
  "ma100": "USD",
  "ma200": "USD",
  "miner_income": "USD",
  "miner_revenue": "USD",
  "miner_revenue_365ma": "USD",
  "open_price": "USD",
  "output_value": "BTC",
  "puell_multiple": "",
  "sma50": "USD",
  "sma100": "USD",
  "sma200": "USD",
  "total_fees": "BTC",
  "total_mint": "BTC",
  "txn_count": "Transactions",
  "txn_volume_in_btc": "BTC",
  "volatility_30d": "%",
  "volatility_90d": "%",
  "volatility_200d": "%",
  "volume": "BTC",
  "volume_in_dollar": "USD"
}

export function BitcoinMetricsChart({ 
  title = "Bitcoin Metrics", 
  height = "400px",
  defaultMetric = "close_price" 
}: BitcoinMetricsChartProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metricTypes, setMetricTypes] = useState<string[]>([])
  const [selectedMetric, setSelectedMetric] = useState<string>(defaultMetric)
  const [metricData, setMetricData] = useState<MetricData[]>([])
  const [timeRange, setTimeRange] = useState<"1M" | "3M" | "6M" | "1Y" | "ALL">("6M")

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
        startDate = new Date("2009-01-03") // Bitcoin genesis block date
        break
    }

    return { startDate, endDate }
  }

  // Get appropriate interval based on time range
  const getInterval = (): string => {
    switch (timeRange) {
      case "1M":
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

  // Fetch available metric types
  useEffect(() => {
    async function fetchMetricTypes() {
      if (!isSupabaseConfigured()) {
        setError("Supabase is not properly configured")
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase.rpc("get_btc_metric_types")

        if (error) throw error

        if (data && data.length > 0) {
          const metrics = data.map((item: { metric_name: string }) => item.metric_name)
          setMetricTypes(metrics)
        } else {
          // If RPC fails, use the predefined categories
          const allMetrics = Object.values(METRIC_CATEGORIES).flat()
          setMetricTypes(allMetrics)
        }
      } catch (err) {
        console.error("Failed to fetch metric types:", err)
        
        // Use predefined metrics on error
        const allMetrics = Object.values(METRIC_CATEGORIES).flat()
        setMetricTypes(allMetrics)
      } finally {
        setLoading(false)
      }
    }

    fetchMetricTypes()
  }, [])

  // Fetch metric data when selected metric or time range changes
  useEffect(() => {
    async function fetchMetricData() {
      if (!isSupabaseConfigured() || !selectedMetric) {
        return
      }

      try {
        setLoading(true)
        setError(null)

        const { startDate, endDate } = getDateRange()
        const interval = getInterval()

        const { data, error } = await supabase.rpc("get_btc_metric_time_series", {
          metric_name_param: selectedMetric,
          start_date_param: startDate.toISOString(),
          end_date_param: endDate.toISOString(),
          interval_param: interval
        })

        if (error) throw error

        if (data) {
          // Format the data for the chart
          const formattedData = data.map((item: any) => ({
            date: new Date(item.date).toISOString().split('T')[0],
            value: Number(item.value)
          }))
          
          setMetricData(formattedData)
        } else {
          setMetricData([])
        }
      } catch (err) {
        console.error("Failed to fetch metric data:", err)
        setError("Failed to load metric data. Please try again later.")
        
        // Generate sample data in case of failure
        generateSampleData()
      } finally {
        setLoading(false)
      }
    }

    fetchMetricData()
  }, [selectedMetric, timeRange])

  // Generate sample data for demonstration
  const generateSampleData = () => {
    const { startDate, endDate } = getDateRange()
    const sampleData: MetricData[] = []
    
    const current = new Date(startDate)
    const end = new Date(endDate)
    
    // Base value depends on the selected metric
    let baseValue = 0
    switch (selectedMetric) {
      case "close_price":
      case "open_price":
      case "high_price":
      case "low_price":
        baseValue = 30000
        break
      case "active_address":
        baseValue = 1000000
        break
      case "hash_rate":
        baseValue = 300000000
        break
      case "txn_count":
        baseValue = 300000
        break
      case "circulating":
        baseValue = 19000000
        break
      default:
        baseValue = 1000
    }
    
    // Generate daily data points
    while (current <= end) {
      const date = current.toISOString().split('T')[0]
      
      // Add some randomness and trend
      const daysSinceStart = Math.floor((current.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const trend = 1 + (daysSinceStart * 0.001) // Small upward trend
      const randomFactor = 0.95 + Math.random() * 0.1 // Random between 0.95 and 1.05
      
      // Weekend effect for some metrics
      const day = current.getDay()
      const weekendFactor = (day === 0 || day === 6) ? 0.9 : 1
      
      // Apply modifiers based on metric type
      let value = baseValue * trend * randomFactor
      
      // For price metrics, add some volatility
      if (["close_price", "open_price", "high_price", "low_price"].includes(selectedMetric)) {
        const volatility = 0.85 + Math.random() * 0.3
        value *= volatility
      }
      
      // For txn_count, apply weekend factor
      if (["txn_count", "active_address"].includes(selectedMetric)) {
        value *= weekendFactor
      }
      
      // For circulating supply, make it more predictable
      if (selectedMetric === "circulating") {
        value = baseValue + (daysSinceStart * 75) // About 75 new BTC per day
      }
      
      sampleData.push({ date, value })
      
      // Move to next day
      current.setDate(current.getDate() + 1)
    }
    
    setMetricData(sampleData)
  }

  // Format metric name for display
  const getMetricDisplayName = (metric: string): string => {
    return METRIC_DISPLAY_NAMES[metric] || metric
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Get y-axis label based on the selected metric
  const getYAxisLabel = (): string => {
    if (!selectedMetric) return "Value"
    
    const unit = METRIC_UNITS[selectedMetric] || ""
    return unit ? `${getMetricDisplayName(selectedMetric)} (${unit})` : getMetricDisplayName(selectedMetric)
  }

  // Format y-axis values based on the selected metric
  const formatYValue = (value: number): string => {
    if (!selectedMetric) return formatLargeNumber(value)
    
    const unit = METRIC_UNITS[selectedMetric] || ""
    
    if (unit === "USD") {
      return `$${formatLargeNumber(value)}`
    } else if (unit === "%") {
      return `${value.toFixed(2)}%`
    } else if (unit === "BTC") {
      return `${formatLargeNumber(value)} ₿`
    } else {
      return formatLargeNumber(value)
    }
  }

  // Format tooltip values
  const getHoverTemplate = (): string => {
    const unit = METRIC_UNITS[selectedMetric] || ""
    
    if (unit === "USD") {
      return "$%{y:,.2f}<extra></extra>"
    } else if (unit === "%") {
      return "%{y:.2f}%<extra></extra>"
    } else if (unit === "BTC") {
      return "%{y:,.8f} ₿<extra></extra>"
    } else {
      return "%{y:,.2f}<extra></extra>"
    }
  }

  // Create Plotly chart data
  const createChartData = () => {
    if (!metricData.length) return []

    // Sort data by date
    const sortedData = [...metricData].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    return [
      {
        x: sortedData.map(d => d.date),
        y: sortedData.map(d => d.value),
        type: 'scatter',
        mode: 'lines',
        name: getMetricDisplayName(selectedMetric || ""),
        line: {
          width: 3,
          color: "#F7931A", // Bitcoin orange
        },
        hovertemplate: getHoverTemplate(),
      }
    ]
  }

  // Create chart layout
  const createChartLayout = () => {
    return {
      title: getMetricDisplayName(selectedMetric || ""),
      xaxis: {
        title: "Date",
        type: "date",
      },
      yaxis: {
        title: getYAxisLabel(),
        tickformat: selectedMetric && METRIC_UNITS[selectedMetric] === "USD" ? "$,.0s" : ",.0s",
      },
      hovermode: "closest",
      autosize: true,
      margin: {
        l: 60,
        r: 50,
        b: 60,
        t: 40,
        pad: 4,
      },
    }
  }

  // Handle CSV download
  const handleDownload = () => {
    if (metricData.length === 0 || !selectedMetric) return
    
    const metricName = getMetricDisplayName(selectedMetric)
    
    let csvContent = "data:text/csv;charset=utf-8,"
    
    // Add headers
    csvContent += "Date,Value\n"
    
    // Add data rows
    metricData.forEach(item => {
      csvContent += `${item.date},${item.value}\n`
    })
    
    // Create download link
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Bitcoin_${metricName.replace(/ /g, "_")}_${timeRange}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading && metricTypes.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">{title}</h3>
        </div>
        <div style={{ height }} className="w-full flex items-center justify-center">
          <Skeleton className="h-[80%] w-[90%] rounded-md" />
        </div>
      </Card>
    )
  }

  if (error && metricData.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">{title}</h3>
        </div>
        <div style={{ height }} className="w-full flex items-center justify-center">
          <div className="text-red-500 text-center">{error}</div>
        </div>
      </Card>
    )
  }

  const chartData = createChartData()
  const chartLayout = createChartLayout()

  return (
    <Card className="p-4">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">{title}</h3>
          
          <div className="flex items-center space-x-2">
            {/* Metric selector */}
            <Select
              value={selectedMetric}
              onValueChange={(value) => setSelectedMetric(value)}
            >
              <SelectTrigger className="min-w-[220px]">
                <SelectValue placeholder="Select Metric" />
              </SelectTrigger>
              <SelectContent className="max-h-[400px]">
                {Object.entries(METRIC_CATEGORIES).map(([category, metrics]) => (
                  <div key={category} className="pb-2">
                    <div className="px-2 py-1.5 text-sm font-semibold bg-muted/50">
                      {category}
                    </div>
                    {metrics.filter(m => metricTypes.includes(m)).map((metric) => (
                      <SelectItem key={metric} value={metric}>
                        {getMetricDisplayName(metric)}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          {/* Time range selector */}
          <div className="flex space-x-1">
            {["1M", "3M", "6M", "1Y", "ALL"].map((range) => (
              <Button
                key={range}
                size="sm"
                variant={timeRange === range ? "default" : "outline"}
                onClick={() => setTimeRange(range as any)}
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

          {/* Download button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={metricData.length === 0}
            className="text-xs"
          >
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
        </div>

        {/* Chart area */}
        <div style={{ height }} className="w-full relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10">
              <div className="animate-pulse text-gray-400">Loading data...</div>
            </div>
          )}
          
          {chartData.length > 0 ? (
            <Plot
              data={chartData}
              layout={chartLayout}
              config={{ responsive: true, displayModeBar: true, displaylogo: false }}
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
    </Card>
  )
} 