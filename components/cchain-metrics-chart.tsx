"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts"

interface CChainMetricsChartProps {
  network: string;
  height?: string;
}

interface CChainData {
  date: string;
  value: number;
  metric: string;
}

// Available metrics from the cchain table
const availableMetrics = [
  { id: "activeAddresses", label: "Active Addresses" },
  { id: "activeSenders", label: "Active Senders" },
  { id: "txCount", label: "Transaction Count" },
  { id: "cumulativeTxCount", label: "Cumulative Tx Count" },
  { id: "cumulativeAddresses", label: "Cumulative Addresses" },
  { id: "cumulativeContracts", label: "Cumulative Contracts" },
  { id: "cumulativeDeployers", label: "Cumulative Deployers" },
  { id: "gasUsed", label: "Gas Used" },
  { id: "avgGps", label: "Avg GPS" },
  { id: "maxGps", label: "Max GPS" },
  { id: "avgTps", label: "Avg TPS" },
  { id: "maxTps", label: "Max TPS" },
  { id: "maxGasPrice", label: "Max Gas Price" },
  { id: "feesPaid", label: "Fees Paid" },
  { id: "avgGasPrice", label: "Avg Gas Price" }
]

export function CChainMetricsChart({ 
  network, 
  height = "400px" 
}: CChainMetricsChartProps) {
  const [timeRange, setTimeRange] = useState<"7D" | "30D" | "3M" | "6M" | "1Y" | "ALL">("6M")
  const [activeMetric, setActiveMetric] = useState("activeAddresses")
  const [data, setData] = useState<CChainData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get network-specific colors
  const getNetworkColors = (network: string) => {
    switch (network.toLowerCase()) {
      case "bitcoin":
        return ["#F7931A", "#FFAD33", "#FFD700"]
      case "ethereum":
        return ["#627EEA", "#8A9EF5", "#B6C1F2"]
      case "avalanche":
        return ["#E84142", "#FF6B6B", "#FF9B9B"]
      default:
        return ["#3B82F6", "#60A5FA", "#93C5FD"]
    }
  }

  // Fetch C-Chain data based on selected metric and time range
  useEffect(() => {
    const fetchCChainData = async () => {
      if (!isSupabaseConfigured() || !activeMetric) {
        setError("Supabase not configured or no metric selected")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Calculate time filter
        const currentTime = new Date()
        let filterTime = new Date()

        switch (timeRange) {
          case '7D':
            filterTime.setDate(currentTime.getDate() - 7)
            break
          case '30D':
            filterTime.setDate(currentTime.getDate() - 30)
            break
          case '3M':
            filterTime.setDate(currentTime.getDate() - 90)
            break
          case '6M':
            filterTime.setDate(currentTime.getDate() - 180)
            break
          case '1Y':
            filterTime.setFullYear(currentTime.getFullYear() - 1)
            break
          case 'ALL':
            filterTime = new Date('2020-01-01')
            break
        }

        const { data: chainData, error: chainError } = await supabase
          .from('cchain')
          .select('date, value, metric')
          .eq('metric', activeMetric)
          .gte('date', filterTime.toISOString())
          .order('date', { ascending: true })

        if (chainError) throw chainError

        if (chainData && chainData.length > 0) {
          const formattedData = chainData.map(item => ({
            date: item.date,
            value: Number(item.value),
            metric: item.metric
          }))
          setData(formattedData)
        } else {
          setData([])
        }
      } catch (err) {
        console.error('Error fetching C-Chain data:', err)
        setError('Failed to load C-Chain data')
      } finally {
        setLoading(false)
      }
    }

    fetchCChainData()
  }, [activeMetric, timeRange])

  // Format numbers for display
  const formatNumber = (value: number): string => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toFixed(0)
  }

  // Format date for display
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short',
      day: 'numeric' 
    })
  }

  // Handle time range change
  const handleTimeRangeChange = (range: "7D" | "30D" | "3M" | "6M" | "1Y" | "ALL") => {
    setTimeRange(range)
  }

  if (loading) {
    return (
      <div className="border rounded-md bg-white p-4" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="animate-pulse text-gray-500">Loading C-Chain data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border rounded-md bg-white p-4" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="border rounded-md bg-white p-4" style={{ height }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">C-Chain Metrics</h2>
        <Button variant="outline" size="sm" className="text-xs flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Download
        </Button>
      </div>
      
      {/* Metric Pills - Horizontal scrolling */}
      <div className="mb-4 overflow-x-auto">
        <div className="flex space-x-2 pb-2">
          {availableMetrics.map(metric => (
            <Button
              key={metric.id}
              variant={activeMetric === metric.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveMetric(metric.id)}
              className="text-xs whitespace-nowrap"
              style={{
                backgroundColor: activeMetric === metric.id ? getNetworkColors(network)[0] : '',
                borderColor: activeMetric === metric.id ? getNetworkColors(network)[0] : '',
                color: activeMetric === metric.id ? 'white' : ''
              }}
            >
              {metric.label}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div>Show Y-Axis: Total</div>
          <div>Group By: Asset</div>
        </div>
        
        {/* Time range toggle buttons with network-specific colors */}
        <div className="flex space-x-1">
          {["7D", "30D", "3M", "6M", "1Y", "ALL"].map((range) => (
            <Button
              key={range}
              size="sm"
              variant={timeRange === range ? "default" : "outline"}
              onClick={() => handleTimeRangeChange(range as "7D" | "30D" | "3M" | "6M" | "1Y" | "ALL")}
              className="text-xs"
              style={{
                backgroundColor: timeRange === range ? getNetworkColors(network)[0] : '',
                borderColor: timeRange === range ? getNetworkColors(network)[0] : '',
                color: timeRange === range ? 'white' : ''
              }}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Chart */}
      <div className="h-[300px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                tick={{ fontSize: 12 }}
                interval={timeRange === "30D" ? Math.ceil(data.length / 2) - 1 : "preserveStartEnd"}
              />
              <YAxis 
                tickFormatter={formatNumber}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value) => [formatNumber(Number(value)), availableMetrics.find(m => m.id === activeMetric)?.label || activeMetric]}
                labelFormatter={(label) => new Date(String(label)).toLocaleDateString()}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={getNetworkColors(network)[0]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: getNetworkColors(network)[0] }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-gray-500">No data available for selected metric</div>
          </div>
        )}
      </div>
    </div>
  )
} 