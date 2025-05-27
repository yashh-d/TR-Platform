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

interface EthereumMetricsChartProps {
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
  "Price & Market": [
    "price", "market_cap", "total_value_locked", "eth_burned_24h"
  ],
  "Network Activity": [
    "active_addresses", "new_addresses", "transaction_count", "average_transaction_fee"
  ],
  "Blockchain Stats": [
    "block_count", "gas_used", "average_gas_price", "difficulty"
  ],
  "Staking & Supply": [
    "staked_eth", "staking_yield", "total_supply", "circulating_supply"
  ],
  "DeFi & Usage": [
    "total_value_locked", "unique_addresses", "erc20_transfers", "erc721_transfers"
  ],
  "Layer 2 & Scaling": [
    "l2_tvl", "zk_rollup_tvl", "optimistic_rollup_tvl", "l2_transactions"
  ]
}

// Display names for metrics, with proper formatting
const METRIC_DISPLAY_NAMES: Record<string, string> = {
  "price": "ETH Price (USD)",
  "market_cap": "Market Cap",
  "total_value_locked": "Total Value Locked",
  "eth_burned_24h": "ETH Burned (24h)",
  "active_addresses": "Active Addresses",
  "new_addresses": "New Addresses",
  "transaction_count": "Transaction Count",
  "average_transaction_fee": "Average Transaction Fee",
  "block_count": "Block Count",
  "gas_used": "Gas Used",
  "average_gas_price": "Average Gas Price",
  "difficulty": "Mining Difficulty",
  "staked_eth": "Staked ETH",
  "staking_yield": "Staking Yield",
  "total_supply": "Total Supply",
  "circulating_supply": "Circulating Supply",
  "unique_addresses": "Unique Addresses",
  "erc20_transfers": "ERC-20 Transfers",
  "erc721_transfers": "NFT Transfers",
  "l2_tvl": "Layer 2 TVL",
  "zk_rollup_tvl": "ZK Rollup TVL",
  "optimistic_rollup_tvl": "Optimistic Rollup TVL",
  "l2_transactions": "Layer 2 Transactions"
}

// Units for different metrics to display on the y-axis
const METRIC_UNITS: Record<string, string> = {
  "price": "USD",
  "market_cap": "USD",
  "total_value_locked": "USD",
  "eth_burned_24h": "ETH",
  "active_addresses": "",
  "new_addresses": "",
  "transaction_count": "",
  "average_transaction_fee": "USD",
  "block_count": "",
  "gas_used": "gas",
  "average_gas_price": "gwei",
  "difficulty": "",
  "staked_eth": "ETH",
  "staking_yield": "%",
  "total_supply": "ETH",
  "circulating_supply": "ETH",
  "unique_addresses": "",
  "erc20_transfers": "",
  "erc721_transfers": "",
  "l2_tvl": "USD",
  "zk_rollup_tvl": "USD",
  "optimistic_rollup_tvl": "USD",
  "l2_transactions": ""
}

export function EthereumMetricsChart({ 
  title = "Ethereum Metrics", 
  height = "400px",
  defaultMetric = "price" 
}: EthereumMetricsChartProps) {
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
        startDate = new Date("2015-07-30") // Ethereum genesis block date
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
        // For now, just use the predefined metrics since we don't have an RPC for Ethereum metrics yet
        const allMetrics = Object.values(METRIC_CATEGORIES).flat()
        setMetricTypes(allMetrics)
        setLoading(false)
      } catch (err) {
        console.error("Failed to fetch metric types:", err)
        
        // Use predefined metrics on error
        const allMetrics = Object.values(METRIC_CATEGORIES).flat()
        setMetricTypes(allMetrics)
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

        // Since we don't have an Ethereum metrics RPC yet, generate sample data
        generateSampleData()
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
      case "price":
        baseValue = 3000
        break
      case "market_cap":
        baseValue = 400000000000
        break
      case "active_addresses":
        baseValue = 1000000
        break
      case "transaction_count":
        baseValue = 2000000
        break
      case "average_gas_price":
        baseValue = 40
        break
      case "total_value_locked":
        baseValue = 50000000000
        break
      case "staked_eth":
        baseValue = 25000000
        break
      case "total_supply":
        baseValue = 120000000
        break
      case "l2_tvl":
        baseValue = 15000000000
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
      
      // Add some volatility for price and market cap
      if (["price", "market_cap"].includes(selectedMetric)) {
        const volatility = 0.9 + Math.random() * 0.2
        value *= volatility
      }
      
      // Apply weekend factor for transaction metrics
      if (["transaction_count", "active_addresses", "gas_used"].includes(selectedMetric)) {
        value *= weekendFactor
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
    } else if (unit === "ETH") {
      return `${formatLargeNumber(value)} ETH`
    } else if (unit === "gwei") {
      return `${formatLargeNumber(value)} gwei`
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
    } else if (unit === "ETH") {
      return "%{y:,.2f} ETH<extra></extra>"
    } else if (unit === "gwei") {
      return "%{y:,.2f} gwei<extra></extra>"
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
          color: "#627EEA", // Ethereum blue
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
        tickformat: selectedMetric && METRIC_UNITS[selectedMetric] === "USD" ? "$,.2s" : ",.2s",
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
    link.setAttribute("download", `Ethereum_${metricName.replace(/ /g, "_")}_${timeRange}.csv`)
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
                    {metrics.map((metric) => (
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
                  backgroundColor: timeRange === range ? "#627EEA" : "",
                  borderColor: timeRange === range ? "#627EEA" : "",
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