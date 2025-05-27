"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { supabase, isSupabaseConfigured, USE_MOCK_DATA } from "@/lib/supabase"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts"

interface SubnetMetricsChartProps {
  subnet?: string
}

// Interface for subnet with associated blockchain
interface SubnetOption {
  id: string             // subnet_id 
  blockchainName: string // blockchain_name
  displayName: string    // What to show in the dropdown
}

// Interface for subnet metric data
interface SubnetMetric {
  date: string
  value: number
}

// Define the metrics to show in the tabs
const metricTabs = [
  { id: "active_addresses", label: "Active Addresses" },
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
];

// Map of metric IDs to their display labels
const metricLabels: Record<string, string> = metricTabs.reduce((acc, tab) => {
  acc[tab.id] = tab.label;
  return acc;
}, {} as Record<string, string>);

// Update the subnet metrics chart colors for Core as well
const getNetworkColor = (network: string) => {
  switch (network.toLowerCase()) {
    case "bitcoin":
      return "#F7931A"
    case "ethereum":
      return "#627EEA"
    case "solana":
      return "#14F195"
    case "avalanche":
      return "#E84142"
    case "polygon":
      return "#8247E5"
    case "core":
      return "#FF7700" // Primary bright orange
    default:
      return "#3B82F6"
  }
}

export function SubnetMetricsChart({ subnet }: SubnetMetricsChartProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availableSubnets, setAvailableSubnets] = useState<SubnetOption[]>([])
  const [selectedSubnetId, setSelectedSubnetId] = useState<string>(subnet || "")
  const [groupedSubnets, setGroupedSubnets] = useState<Record<string, SubnetOption[]>>({})
  const [availableMetrics, setAvailableMetrics] = useState<string[]>([])
  const [selectedMetric, setSelectedMetric] = useState<string>("")
  const [timeRange, setTimeRange] = useState<string>("1Y")
  const [metricData, setMetricData] = useState<SubnetMetric[]>([])
  const [metricLoading, setMetricLoading] = useState(false)
  const [metricError, setMetricError] = useState<string | null>(null)
  const [yAxisMode, setYAxisMode] = useState<string>("total")
  
  // Fetch all distinct subnet_id and blockchain_name pairs
  useEffect(() => {
    async function fetchDistinctSubnets() {
      setLoading(true)
      setError(null)
      
      try {
        // Check if Supabase is configured
        if (!isSupabaseConfigured()) {
          throw new Error("Supabase is not properly configured. Please check your environment variables.")
        }

        // Try to use RPC function first
        try {
          const { data: subnetPairs, error: subnetError } = await supabase
            .rpc('get_distinct_subnet_blockchain_pairs')
          
          if (!subnetError && subnetPairs && subnetPairs.length > 0) {
            processSubnetData(subnetPairs)
            return
          }
        } catch (rpcError) {
          console.error("RPC function error:", rpcError)
          // Continue to fallback
        }
        
        // Fallback to direct query
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("subnet_metrics")
          .select("subnet_id, blockchain_name")
          .limit(1000)
        
        if (fallbackError) {
          throw new Error(`Error fetching subnets: ${fallbackError.message}`)
        }
        
        if (!fallbackData || fallbackData.length === 0) {
          throw new Error("No subnets found in the database")
        }
        
        // Process the subnet data
        processSubnetData(fallbackData)
        
      } catch (err) {
        console.error("Failed to fetch subnets:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred")
      } finally {
        setLoading(false)
      }
    }
    
    // Process subnet data from either RPC or direct query
    function processSubnetData(data: any[]) {
      // Create a map for unique subnet_id + blockchain_name combinations
      const uniqueSubnetsMap = new Map<string, SubnetOption>()
      
      data.forEach(item => {
        const key = `${item.blockchain_name}_${item.subnet_id}`
        
        if (!uniqueSubnetsMap.has(key)) {
          uniqueSubnetsMap.set(key, {
            id: item.subnet_id,
            blockchainName: item.blockchain_name,
            displayName: item.blockchain_name.toLowerCase() === "avalanche" 
              ? item.subnet_id 
              : item.blockchain_name
          })
        }
      })
      
      // Convert to array and sort
      const subnetsData = Array.from(uniqueSubnetsMap.values())
        .sort((a, b) => {
          if (a.blockchainName !== b.blockchainName) {
            return a.blockchainName.localeCompare(b.blockchainName)
          }
          return a.id.localeCompare(b.id)
        })
      
      // Group by blockchain_name for organized dropdown
      const grouped: Record<string, SubnetOption[]> = {}
      
      subnetsData.forEach(subnet => {
        if (!grouped[subnet.blockchainName]) {
          grouped[subnet.blockchainName] = []
        }
        grouped[subnet.blockchainName].push(subnet)
      })
      
      setAvailableSubnets(subnetsData)
      setGroupedSubnets(grouped)
      
      // If no subnet is selected yet, select the first one
      if (!selectedSubnetId && subnetsData.length > 0) {
        setSelectedSubnetId(subnetsData[0].id)
      }
    }

    fetchDistinctSubnets()
  }, [])
  
  // When subnet is selected, fetch available metrics
  useEffect(() => {
    if (!selectedSubnetId) return
    
    async function fetchAvailableMetrics() {
      try {
        const { data, error } = await supabase
          .from("subnet_metrics")
          .select("metric")
          .eq("subnet_id", selectedSubnetId)
          .limit(100)
        
        if (error) {
          console.error("Error fetching metrics:", error)
          return
        }
        
        if (data && data.length > 0) {
          const uniqueMetrics = [...new Set(data.map(item => item.metric))]
          setAvailableMetrics(uniqueMetrics)
          
          // Set default selected metric from the metric tabs if available
          const firstAvailableTab = metricTabs.find(tab => uniqueMetrics.includes(tab.id))
          if (firstAvailableTab) {
            setSelectedMetric(firstAvailableTab.id)
          } else if (uniqueMetrics.length > 0) {
            setSelectedMetric(uniqueMetrics[0])
          }
        } else {
          setAvailableMetrics([])
          setSelectedMetric("")
        }
      } catch (err) {
        console.error("Failed to fetch metrics:", err)
      }
    }
    
    fetchAvailableMetrics()
  }, [selectedSubnetId])
  
  // Fetch metric data when subnet, metric, or time range changes
  useEffect(() => {
    if (!selectedSubnetId || !selectedMetric) return
    
    async function fetchMetricData() {
      setMetricLoading(true)
      setMetricError(null)
      
      try {
        // Calculate date range based on timeRange
        const endDate = new Date()
        let startDate = new Date()
        
        switch (timeRange) {
          case "1W":
            startDate.setDate(endDate.getDate() - 7)
            break
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
            startDate = new Date(0) // Beginning of time
            break
        }
        
        // Try to use the RPC function
        try {
          const { data, error } = await supabase
            .rpc('get_subnet_metric_history', {
              subnet_id_param: selectedSubnetId,
              metric_param: selectedMetric,
              start_date_param: startDate.toISOString(),
              end_date_param: endDate.toISOString()
            })
          
          if (!error && data) {
            processMetricData(data)
            return
          }
        } catch (rpcError) {
          console.error("RPC function error:", rpcError)
          // Continue to fallback
        }
        
        // Fallback to direct query
        const { data, error } = await supabase
          .from("subnet_metrics")
          .select("date, value")
          .eq("subnet_id", selectedSubnetId)
          .eq("metric", selectedMetric)
          .gte("date", startDate.toISOString())
          .lte("date", endDate.toISOString())
          .order("date", { ascending: true })
          .limit(500)
        
        if (error) {
          throw new Error(`Error fetching metric data: ${error.message}`)
        }
        
        processMetricData(data)
        
      } catch (err) {
        console.error("Failed to fetch metric data:", err)
        setMetricError(err instanceof Error ? err.message : "An unknown error occurred")
        setMetricData([])
      } finally {
        setMetricLoading(false)
      }
    }
    
    // Process and format metric data
    function processMetricData(data: any[]) {
      if (!data || data.length === 0) {
        setMetricData([])
        return
      }
      
      // Format the data for the chart
      const formattedData = data.map(item => ({
        date: typeof item.date === 'string' ? item.date : new Date(item.date).toISOString(),
        value: typeof item.value === 'string' ? parseFloat(item.value) : item.value
      }))
      
      // Downsample if needed for better performance
      let finalData = formattedData
      if (formattedData.length > 100) {
        const factor = Math.ceil(formattedData.length / 100)
        finalData = formattedData.filter((_, index) => index % factor === 0)
      }
      
      setMetricData(finalData)
    }
    
    fetchMetricData()
  }, [selectedSubnetId, selectedMetric, timeRange])
  
  // Handle subnet selection change
  const handleSubnetChange = (value: string) => {
    setSelectedSubnetId(value)
  }
  
  // Handle metric selection change
  const handleMetricChange = (value: string) => {
    setSelectedMetric(value)
  }
  
  // Handle time range selection
  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value)
  }
  
  // Handle Y-axis mode change
  const handleYAxisModeChange = (value: string) => {
    setYAxisMode(value)
  }
  
  // Format large numbers with commas
  const formatNumber = (value: number): string => {
    if (value === undefined || value === null) return "0"
    return value.toLocaleString(undefined, { 
      maximumFractionDigits: 2 
    })
  }
  
  // Format date for display
  const formatDate = (dateStr: string | number): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, { 
      month: 'short',
      year: 'numeric'
    })
  }
  
  // Calculate statistics from metric data
  const getMetricStats = () => {
    if (!metricData || metricData.length === 0) {
      return { latest: 0, average: 0, minimum: 0, maximum: 0 }
    }
    
    const values = metricData.map(d => d.value)
    return {
      latest: metricData[metricData.length - 1].value,
      average: values.reduce((sum, val) => sum + val, 0) / values.length,
      minimum: Math.min(...values),
      maximum: Math.max(...values)
    }
  }
  
  const stats = getMetricStats()
  const selectedSubnet = availableSubnets.find(s => s.id === selectedSubnetId)
  
  // Fallback for loading state
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
          <div className="animate-pulse text-gray-400">Loading subnets...</div>
        </div>
      </Card>
    )
  }

  // Display error message
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
          <div className="text-red-500">
            <p>Error loading subnets:</p>
            <p className="text-sm">{error}</p>
            <Button 
              onClick={() => fetchDistinctSubnets()}
              className="mt-4"
              variant="outline"
            >
              Retry
            </Button>
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

      {/* Subnet Selector */}
      <div className="mb-6">
        <label htmlFor="subnet-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select a subnet:
        </label>
        <Select 
          value={selectedSubnetId} 
          onValueChange={handleSubnetChange}
        >
          <SelectTrigger id="subnet-select" className="w-full">
            <SelectValue placeholder="Select a subnet" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(groupedSubnets).map(([blockchain, subnets]) => (
              <SelectGroup key={blockchain}>
                <SelectLabel>{blockchain}</SelectLabel>
                {subnets.map(subnet => (
                  <SelectItem key={subnet.id} value={subnet.id}>
                    {subnet.displayName}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Metric Selection Tabs - Display horizontally similar to the Avalanche metrics */}
      <div className="overflow-x-auto mb-6">
        <div className="whitespace-nowrap">
          {metricTabs.map(tab => {
            const isAvailable = availableMetrics.includes(tab.id)
            const isActive = selectedMetric === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => isAvailable && handleMetricChange(tab.id)}
                className={`mr-1 mb-1 px-4 py-2 text-sm rounded-md transition-colors ${
                  isActive 
                    ? 'bg-red-500 text-white' 
                    : isAvailable 
                      ? 'bg-white hover:bg-gray-100 border border-gray-300' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                disabled={!isAvailable}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>
      
      {/* Y-axis and Grouping Controls */}
      <div className="flex items-center mb-6">
        <div className="mr-6">
          <span className="text-sm text-gray-700 mr-2">Show Y-Axis:</span>
          <button 
            onClick={() => handleYAxisModeChange("total")}
            className={`text-sm px-2 py-1 ${yAxisMode === "total" ? "font-bold" : "text-gray-500"}`}
          >
            Total
          </button>
          <button 
            onClick={() => handleYAxisModeChange("change")}
            className={`text-sm px-2 py-1 ${yAxisMode === "change" ? "font-bold" : "text-gray-500"}`}
          >
            Change
          </button>
        </div>
        
        <div>
          <span className="text-sm text-gray-700 mr-2">Group By:</span>
          <button className="text-sm px-2 py-1 font-bold">
            Asset
          </button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex justify-end mb-4">
        <div className="flex">
          {["1W", "1M", "3M", "6M", "1Y", "ALL"].map(range => (
            <button
              key={range}
              onClick={() => handleTimeRangeChange(range)}
              className={`px-3 py-1 text-xs rounded-md ${
                timeRange === range 
                  ? 'bg-red-500 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[400px] w-full">
        {metricLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Loading chart data...</div>
          </div>
        ) : metricError ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-red-500">
              <p>Error loading chart data:</p>
              <p className="text-sm">{metricError}</p>
            </div>
          </div>
        ) : metricData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-gray-500">No data available for this metric</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={metricData}
              margin={{ top: 5, right: 20, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd" 
              />
              <YAxis 
                tickFormatter={(value) => formatNumber(value)}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value) => [formatNumber(Number(value)), metricLabels[selectedMetric] || selectedMetric]}
                labelFormatter={(label) => new Date(String(label)).toLocaleDateString()}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={getNetworkColor(selectedSubnet?.blockchainName || "")}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
                name={metricLabels[selectedMetric] || selectedMetric}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Statistics Cards */}
      {metricData.length > 0 && (
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="p-3">
            <div className="text-sm text-gray-500">Latest Value</div>
            <div className="text-xl font-bold">
              {formatNumber(stats.latest)}
            </div>
            <div className="text-xs text-gray-500">{metricLabels[selectedMetric] || selectedMetric}</div>
          </div>
          <div className="p-3">
            <div className="text-sm text-gray-500">Average</div>
            <div className="text-xl font-bold">
              {formatNumber(stats.average)}
            </div>
            <div className="text-xs text-gray-500">{metricLabels[selectedMetric] || selectedMetric}</div>
          </div>
          <div className="p-3">
            <div className="text-sm text-gray-500">Minimum</div>
            <div className="text-xl font-bold">
              {formatNumber(stats.minimum)}
            </div>
            <div className="text-xs text-gray-500">{metricLabels[selectedMetric] || selectedMetric}</div>
          </div>
          <div className="p-3">
            <div className="text-sm text-gray-500">Maximum</div>
            <div className="text-xl font-bold">
              {formatNumber(stats.maximum)}
            </div>
            <div className="text-xs text-gray-500">{metricLabels[selectedMetric] || selectedMetric}</div>
          </div>
        </div>
      )}
    </Card>
  )
}
