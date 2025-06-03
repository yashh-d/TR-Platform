"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts"

interface SubnetMetricsChartProps {
  subnet?: string
}

interface BlockchainMetric {
  date: string
  value: number
}

interface BlockchainOption {
  name: string
  subnetCount: number
  latestValue: number
}

// Available metrics that we know exist
const availableMetrics = [
  { id: "activeAddresses", label: "Active Addresses" },
  { id: "activeSenders", label: "Active Senders" },
  { id: "cumulativeTxCount", label: "Cumulative Tx Count" },
  { id: "cumulativeAddresses", label: "Cumulative Addresses" },
  { id: "cumulativeContracts", label: "Cumulative Contracts" },
  { id: "cumulativeDeployers", label: "Cumulative Deployers" },
  { id: "gasUsed", label: "Gas Used" },
  { id: "txCount", label: "Transaction Count" },
  { id: "avgGps", label: "Avg GPS" },
  { id: "maxGps", label: "Max GPS" },
  { id: "avgTps", label: "Avg TPS" },
  { id: "maxTps", label: "Max TPS" },
  { id: "maxGasPrice", label: "Max Gas Price" },
  { id: "feesPaid", label: "Fees Paid" },
  { id: "avgGasPrice", label: "Avg Gas Price" }
]

export function SubnetMetricsChart({ subnet }: SubnetMetricsChartProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availableBlockchains, setAvailableBlockchains] = useState<BlockchainOption[]>([])
  const [selectedBlockchain, setSelectedBlockchain] = useState<string>("")
  const [selectedMetric, setSelectedMetric] = useState<string>("activeAddresses")
  const [timeRange, setTimeRange] = useState<string>("1M")
  const [chartData, setChartData] = useState<BlockchainMetric[]>([])
  const [chartLoading, setChartLoading] = useState(false)
  const [aggregationMode, setAggregationMode] = useState<"sum" | "avg">("sum")
  
  // Fetch popular/active blockchains with aggregated data
  useEffect(() => {
    async function fetchActiveBlockchains() {
      setLoading(true)
      setError(null)
      
      try {
        if (!isSupabaseConfigured()) {
          throw new Error("Supabase is not properly configured")
        }

        // Get blockchains with recent activity and their subnet counts
        const { data: blockchainData, error: blockchainError } = await supabase
          .from('subnet_metrics')
          .select(`
            blockchain_name,
            subnet_id,
            value
          `)
          .eq('metric', 'activeAddresses')
          .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('value', { ascending: false })

        if (blockchainError) {
          throw new Error(`Error fetching blockchains: ${blockchainError.message}`)
        }

        if (!blockchainData || blockchainData.length === 0) {
          throw new Error("No recent blockchain activity found")
        }
        
        // Aggregate by blockchain_name
        const blockchainMap = new Map<string, { totalValue: number, subnetIds: Set<string> }>()
        
        blockchainData.forEach(item => {
          const existing = blockchainMap.get(item.blockchain_name) || { 
            totalValue: 0, 
            subnetIds: new Set() 
          }
          existing.totalValue += Number(item.value || 0)
          existing.subnetIds.add(item.subnet_id)
          blockchainMap.set(item.blockchain_name, existing)
        })

        // Convert to array and sort by total value
        const blockchains = Array.from(blockchainMap.entries())
          .map(([name, data]) => ({
            name,
            subnetCount: data.subnetIds.size,
            latestValue: data.totalValue
          }))
          .sort((a, b) => b.latestValue - a.latestValue)
          .slice(0, 20) // Top 20 most active blockchains

        setAvailableBlockchains(blockchains)
        
        // Set default blockchain
        if (blockchains.length > 0 && !selectedBlockchain) {
          setSelectedBlockchain(blockchains[0].name)
        }
        
      } catch (err) {
        console.error("Failed to fetch blockchains:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred")
      } finally {
        setLoading(false)
      }
    }
    
    fetchActiveBlockchains()
  }, [])
  
  // Fetch chart data when selections change
  useEffect(() => {
    async function fetchChartData() {
      if (!selectedBlockchain || !selectedMetric) return
    
      setChartLoading(true)
      
      try {
        // Calculate date filter
        const now = new Date()
        let startDate = new Date()
        
        switch (timeRange) {
          case "1W":
            startDate.setDate(now.getDate() - 7)
            break
          case "1M":
            startDate.setMonth(now.getMonth() - 1)
            break
          case "3M":
            startDate.setMonth(now.getMonth() - 3)
            break
          case "6M":
            startDate.setMonth(now.getMonth() - 6)
            break
          case "1Y":
            startDate.setFullYear(now.getFullYear() - 1)
            break
          case "ALL":
            startDate = new Date('2020-01-01')
            break
        }
        
        // Fetch aggregated data by date for the selected blockchain and metric
        const { data: metricsData, error: metricsError } = await supabase
          .from('subnet_metrics')
          .select('date, value')
          .eq('blockchain_name', selectedBlockchain)
          .eq('metric', selectedMetric)
          .gte('date', startDate.toISOString())
          .order('date', { ascending: true })
          
        if (metricsError) {
          throw new Error(`Error fetching chart data: ${metricsError.message}`)
        }

        if (!metricsData || metricsData.length === 0) {
          setChartData([])
            return
          }

        // Aggregate by date (sum or average all subnets for each date)
        const dateMap = new Map<string, { total: number, count: number }>()
        
        metricsData.forEach(item => {
          const dateKey = item.date.split('T')[0] // Get date part only
          const existing = dateMap.get(dateKey) || { total: 0, count: 0 }
          existing.total += Number(item.value || 0)
          existing.count += 1
          dateMap.set(dateKey, existing)
        })

        // Convert to chart format
        const chartData = Array.from(dateMap.entries())
          .map(([date, data]) => ({
            date,
            value: aggregationMode === "sum" ? data.total : data.total / data.count
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        setChartData(chartData)
        
      } catch (err) {
        console.error("Failed to fetch chart data:", err)
        setError(err instanceof Error ? err.message : "Failed to load chart data")
      } finally {
        setChartLoading(false)
      }
    }

    fetchChartData()
  }, [selectedBlockchain, selectedMetric, timeRange, aggregationMode])

  const formatNumber = (value: number): string => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toFixed(0)
  }

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short',
      day: 'numeric' 
    })
  }
  
  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Subnet Metrics</h2>
          <Button variant="outline" size="sm" className="text-xs">
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        </div>
        <div className="h-[400px] flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading blockchain data...</div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Subnet Metrics</h2>
          <Button variant="outline" size="sm" className="text-xs">
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        </div>
        <div className="h-[400px] flex items-center justify-center">
          <div className="text-red-500 text-center">
            <p>Error loading subnet data:</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Subnet Metrics</h2>
        <Button variant="outline" size="sm" className="text-xs">
          <Download className="h-3 w-3 mr-1" />
          Download
        </Button>
      </div>

      {/* Blockchain Selector */}
      <div className="mb-6">
        <label htmlFor="blockchain-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select a blockchain (Top 20 by activity):
        </label>
        <Select value={selectedBlockchain} onValueChange={setSelectedBlockchain}>
          <SelectTrigger id="blockchain-select" className="w-full">
            <SelectValue placeholder="Select a blockchain" />
          </SelectTrigger>
          <SelectContent>
            {availableBlockchains.map(blockchain => (
              <SelectItem key={blockchain.name} value={blockchain.name}>
                {blockchain.name} ({blockchain.subnetCount} subnets)
                  </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Metric Selection Buttons */}
      <div className="overflow-x-auto mb-6">
        <div className="flex space-x-2 pb-2">
          {availableMetrics.map(metric => (
            <Button
              key={metric.id}
              variant={selectedMetric === metric.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedMetric(metric.id)}
              className="text-xs whitespace-nowrap"
              style={{
                backgroundColor: selectedMetric === metric.id ? "#E84142" : '',
                borderColor: selectedMetric === metric.id ? "#E84142" : '',
                color: selectedMetric === metric.id ? 'white' : ''
              }}
              >
              {metric.label}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div>Show Y-Axis: 
          <button 
              onClick={() => setAggregationMode("sum")}
              className={`ml-2 px-2 py-1 ${aggregationMode === "sum" ? "font-bold" : "text-gray-500"}`}
          >
            Total
          </button>
          <button 
              onClick={() => setAggregationMode("avg")}
              className={`px-2 py-1 ${aggregationMode === "avg" ? "font-bold" : "text-gray-500"}`}
          >
              Average
          </button>
        </div>
          <div>Group By: <span className="font-bold">Blockchain</span></div>
      </div>

      {/* Time Range Selector */}
        <div className="flex space-x-1">
          {["1W", "1M", "3M", "6M", "1Y", "ALL"].map(range => (
            <Button
              key={range}
              size="sm"
              variant={timeRange === range ? "default" : "outline"}
              onClick={() => setTimeRange(range)}
              className="text-xs"
              style={{
                backgroundColor: timeRange === range ? "#E84142" : '',
                borderColor: timeRange === range ? "#E84142" : '',
                color: timeRange === range ? 'white' : ''
              }}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[400px] w-full">
        {chartLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Loading chart data...</div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-gray-500">No data available for this blockchain and metric</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tickFormatter={formatNumber}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value) => [formatNumber(Number(value)), availableMetrics.find(m => m.id === selectedMetric)?.label || selectedMetric]}
                labelFormatter={(label) => new Date(String(label)).toLocaleDateString()}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#E84142"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#E84142" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary Stats */}
      {chartData.length > 0 && (
        <div className="mt-4 grid grid-cols-4 gap-4 pt-4 border-t">
          <div>
            <div className="text-sm text-gray-500">Latest Value</div>
            <div className="font-bold">{formatNumber(chartData[chartData.length - 1]?.value || 0)}</div>
            <div className="text-xs text-gray-500">{availableMetrics.find(m => m.id === selectedMetric)?.label}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Average</div>
            <div className="font-bold">{formatNumber(chartData.reduce((sum, item) => sum + item.value, 0) / chartData.length)}</div>
            <div className="text-xs text-gray-500">{availableMetrics.find(m => m.id === selectedMetric)?.label}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Minimum</div>
            <div className="font-bold">{formatNumber(Math.min(...chartData.map(item => item.value)))}</div>
            <div className="text-xs text-gray-500">{availableMetrics.find(m => m.id === selectedMetric)?.label}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Maximum</div>
            <div className="font-bold">{formatNumber(Math.max(...chartData.map(item => item.value)))}</div>
            <div className="text-xs text-gray-500">{availableMetrics.find(m => m.id === selectedMetric)?.label}</div>
          </div>
        </div>
      )}
    </Card>
  )
}
