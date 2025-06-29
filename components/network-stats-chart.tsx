"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

interface NetworkStatsChartProps {
  network: string
  metric?: string
}

// Network Stats metrics - only including the specified ones
const networkStatsMetrics = [
  { id: "avgGps", label: "Avg GPS" },
  { id: "maxGps", label: "Max GPS" },
  { id: "avgTps", label: "Avg TPS" },
  { id: "maxTps", label: "Max TPS" },
  { id: "maxGasPrice", label: "Max Gas Price" },
  { id: "feesPaid", label: "Fees Paid" },
  { id: "avgGasPrice", label: "Avg Gas Price" },
  { id: "gasUsed", label: "Gas Used" },
  { id: "cumulativeContracts", label: "Cumulative Contracts" },
  { id: "cumulativeDeployers", label: "Cumulative Deployers" }
]

export function NetworkStatsChart({ network, metric }: NetworkStatsChartProps) {
  // State for all metrics data
  const [metricsData, setMetricsData] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<"7D" | "30D" | "3M" | "6M" | "1Y" | "ALL">("30D")
  const [activeMetric, setActiveMetric] = useState<string>("")
  const [chartData, setChartData] = useState<any[]>([])

  // Get network-specific colors for the chart line
  const getNetworkColors = (network: string) => {
    switch (network.toLowerCase()) {
      case "bitcoin":
        return ["#F7931A", "#FFAD33", "#FFD700"]
      case "ethereum":
        return ["#627EEA", "#8A9EF5", "#B6C1F2"]
      case "solana":
        return ["#14F195", "#00C4A2", "#9945FF"] 
      case "avalanche":
        return ["#E84142", "#FF6B6B", "#FF9B9B"]
      case "polygon":
        return ["#8247E5", "#A277FF", "#C4A7FF"]
      case "core":
        return ["#FF7700", "#FF9500", "#FFB700"]
      default:
        return ["#3B82F6", "#60A5FA", "#93C5FD"]
    }
  }

  // Fetch all metrics data on initial load
  useEffect(() => {
    async function fetchAllMetricsData() {
      try {
        setLoading(true)
        
        // Initial active metric based on prop or default
        const initialMetric = metric || networkStatsMetrics[0].id
        setActiveMetric(initialMetric)
        
        // Fetch all data with pagination
        console.log(`[NetworkStatsChart] Fetching all metrics data...`)
        
        // Select all columns that we need
        const selectColumns = ['date', 'timestamp']
        networkStatsMetrics.forEach(m => selectColumns.push(`"${m.id}"`))
        
        // Build the query with all columns
        let fetchedData: any[] = []
        let hasMore = true
        let page = 0
        const pageSize = 1000 // Max size per request
        
        while (hasMore) {
          console.log(`[NetworkStatsChart] Fetching page ${page}...`)
          
          const { data, error } = await supabase
            .from('avalanche_core')
            .select(selectColumns.join(','))
            .order('date', { ascending: true })
            .range(page * pageSize, (page + 1) * pageSize - 1)
          
          if (error) throw error
          
          if (data && data.length > 0) {
            fetchedData = [...fetchedData, ...data]
            page++
            
            // Check if we've received less than the page size, meaning no more data
            if (data.length < pageSize) {
              hasMore = false
            }
          } else {
            hasMore = false
          }
        }
        
        console.log(`[NetworkStatsChart] Total rows fetched: ${fetchedData.length}`)
        
        // Store all fetched data
        setMetricsData({ allData: fetchedData })
        
        // Create initial chart for the active metric
        updateChartForMetric(initialMetric, fetchedData, timeRange, network)
      } catch (err) {
        console.error('Error fetching metrics data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics data')
      } finally {
        setLoading(false)
      }
    }
    
    fetchAllMetricsData()
  }, [network, metric])
  
  // Update chart when time range, active metric, or network changes
  useEffect(() => {
    if (metricsData.allData && metricsData.allData.length > 0) {
      updateChartForMetric(activeMetric, metricsData.allData, timeRange, network)
    }
  }, [timeRange, activeMetric, network, metricsData])
  
  // Helper function to filter data by time range and create chart
  function updateChartForMetric(metricName: string, data: any[], range: string, network: string) {
    if (!data || data.length === 0) {
      setChartData([])
      return
    }
    
    let filteredData = [...data]
    const now = new Date()
    
    // Filter by time range
    if (range === "7D") {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(now.getDate() - 7)
      filteredData = data.filter(item => {
        const itemDate = new Date(item.date)
        return itemDate >= sevenDaysAgo
      })
    } else if (range === "30D") {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(now.getDate() - 30)
      filteredData = data.filter(item => {
        const itemDate = new Date(item.date)
        return itemDate >= thirtyDaysAgo
      })
    } else if (range === "3M") {
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(now.getMonth() - 3)
      filteredData = data.filter(item => {
        const itemDate = new Date(item.date)
        return itemDate >= threeMonthsAgo
      })
    } else if (range === "6M") {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(now.getMonth() - 6)
      filteredData = data.filter(item => {
        const itemDate = new Date(item.date)
        return itemDate >= sixMonthsAgo
      })
    } else if (range === "1Y") {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(now.getFullYear() - 1)
      filteredData = data.filter(item => {
        const itemDate = new Date(item.date)
        return itemDate >= oneYearAgo
      })
    }
    
    // Find proper label for the metric
    const metricInfo = networkStatsMetrics.find(m => m.id === metricName)
    const metricLabel = metricInfo ? metricInfo.label : metricName
    
    // Get network color for the chart line
    const lineColor = getNetworkColors(network)[0]
    
    // Create the trace for the chart with network-specific color
    if (filteredData.length > 0) {
      // Better parsing for text values - handle various formats
      const yValues = filteredData.map(item => {
        const rawValue = item[metricName]
        if (rawValue === null || rawValue === undefined || rawValue === '') {
          return 0
        }
        
        // If it's already a number, use it
        if (typeof rawValue === 'number') {
          return rawValue
        }
        
        // If it's a string, try to parse it
        if (typeof rawValue === 'string') {
          // Remove any commas or whitespace and try to parse
          const cleanValue = rawValue.replace(/,/g, '').trim()
          const parsed = parseFloat(cleanValue)
          return isNaN(parsed) ? 0 : parsed
        }
        
        return 0
      })

      console.log(`[NetworkStatsChart] Metric: ${metricName}, Sample values:`, yValues.slice(0, 5))

      const trace = {
        type: "scatter",
        mode: "lines",
        name: metricLabel,
        x: filteredData.map(item => item.date),
        y: yValues,
        line: { 
          width: 2, 
          color: lineColor,
          shape: 'spline', // Smoother line
        },
        hoverinfo: 'y+x',
      }
      
      setChartData([trace])
    } else {
      setChartData([])
    }
  }
  
  if (loading) return (
    <div className="h-[350px] flex items-center justify-center">
      <div className="animate-pulse text-gray-500">Loading network stats data...</div>
    </div>
  )
  
  if (error) return (
    <div className="h-[350px] flex items-center justify-center text-red-500">
      <div>Error: {error}</div>
    </div>
  )
  
  if (!metricsData.allData || metricsData.allData.length === 0) return (
    <div className="h-[350px] flex items-center justify-center">
      <div className="text-gray-500">No network stats data available</div>
    </div>
  )
  
  return (
    <div className="border rounded-md bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Network Stats</h2>
      </div>
      
      {/* Metric Pills - Horizontal scrolling */}
      <div className="mb-4 overflow-x-auto">
        <div className="flex space-x-2 pb-2">
          {networkStatsMetrics.map(metric => (
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
              onClick={() => setTimeRange(range as "7D" | "30D" | "3M" | "6M" | "1Y" | "ALL")}
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
      
      {/* Chart with network-colored line */}
      <div className="h-[300px]">
        {chartData.length > 0 ? (
          <Plot
            data={chartData}
            layout={{
              autosize: true,
              margin: { l: 50, r: 20, t: 20, b: 50 },
              xaxis: { 
                gridcolor: "#e5e7eb",
                type: 'date' 
              },
              yaxis: { 
                title: chartData[0]?.name || '',
                gridcolor: "#e5e7eb",
                titlefont: { color: getNetworkColors(network)[0] }
              },
              plot_bgcolor: "white",
              paper_bgcolor: "white",
              hovermode: "closest",
              colorway: [getNetworkColors(network)[0]]
            }}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-gray-500">No data available for selected metric</div>
          </div>
        )}
      </div>
    </div>
  )
} 