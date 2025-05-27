"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

interface PlotlyChartProps {
  network: string
  metric: string
}

// All available metrics from the avalanche_core table
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

export function PlotlyChart({ network, metric }: PlotlyChartProps) {
  // State for all metrics data
  const [metricsData, setMetricsData] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<"1Y" | "6M" | "3M" | "ALL">("1Y")
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
        return ["#FF7700", "#FF9500", "#FFB700"] // Updated bright orange colors
      default:
        return ["#3B82F6", "#60A5FA", "#93C5FD"]
    }
  }

  // Fetch all metrics data on initial load
  useEffect(() => {
    async function fetchAllMetricsData() {
      try {
        setLoading(true)
        
        // Map the incoming metric prop to actual column name
        const metricMap: Record<string, string> = {
          'active-addresses': 'activeAddresses',
          'active-senders': 'activeSenders',
          'cumulative-tx-count': 'cumulativeTxCount',
          'cumulative-addresses': 'cumulativeAddresses',
          'cumulative-contracts': 'cumulativeContracts',
          'cumulative-deployers': 'cumulativeDeployers',
          'gas-used': 'gasUsed',
          'tx-count': 'txCount',
          'avg-gps': 'avgGps',
          'max-gps': 'maxGps',
          'avg-tps': 'avgTps',
          'max-tps': 'maxTps',
          'max-gas-price': 'maxGasPrice',
          'fees-paid': 'feesPaid',
          'avg-gas-price': 'avgGasPrice'
        }
        
        // Initial active metric based on prop
        const initialMetric = metricMap[metric] || 'activeAddresses'
        setActiveMetric(initialMetric)
        
        // Fetch all data with pagination
        console.log(`[PlotlyChart] Fetching all metrics data...`)
        
        // Select all columns that we need
        const selectColumns = ['date', 'timestamp']
        availableMetrics.forEach(m => selectColumns.push(`"${m.id}"`))
        
        // Build the query with all columns
        let fetchedData: any[] = []
        let hasMore = true
        let page = 0
        const pageSize = 1000 // Max size per request
        
        while (hasMore) {
          console.log(`[PlotlyChart] Fetching page ${page}...`)
          
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
        
        console.log(`[PlotlyChart] Total rows fetched: ${fetchedData.length}`)
        
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
    if (range === "1Y") {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(now.getFullYear() - 1)
      filteredData = data.filter(item => {
        const itemDate = new Date(item.date)
        return itemDate >= oneYearAgo
      })
    } else if (range === "6M") {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(now.getMonth() - 6)
      filteredData = data.filter(item => {
        const itemDate = new Date(item.date)
        return itemDate >= sixMonthsAgo
      })
    } else if (range === "3M") {
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(now.getMonth() - 3)
      filteredData = data.filter(item => {
        const itemDate = new Date(item.date)
        return itemDate >= threeMonthsAgo
      })
    }
    
    // Find proper label for the metric
    const metricInfo = availableMetrics.find(m => m.id === metricName)
    const metricLabel = metricInfo ? metricInfo.label : metricName
    
    // Get network color for the chart line
    const lineColor = getNetworkColors(network)[0]
    
    // Create the trace for the chart with network-specific color
    if (filteredData.length > 0) {
      const trace = {
        type: "scatter",
        mode: "lines",
        name: metricLabel,
        x: filteredData.map(item => item.date),
        y: filteredData.map(item => parseFloat(item[metricName] || '0')),
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
      <div className="animate-pulse text-gray-500">Loading all metrics data...</div>
    </div>
  )
  
  if (error) return (
    <div className="h-[350px] flex items-center justify-center text-red-500">
      <div>Error: {error}</div>
    </div>
  )
  
  if (!metricsData.allData || metricsData.allData.length === 0) return (
    <div className="h-[350px] flex items-center justify-center">
      <div className="text-gray-500">No metrics data available</div>
    </div>
  )
  
  return (
    <div className="border rounded-md bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Avalanche Metrics</h2>
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
          {["1Y", "6M", "3M", "ALL"].map((range) => (
            <Button
              key={range}
              size="sm"
              variant={timeRange === range ? "default" : "outline"}
              onClick={() => setTimeRange(range as "1Y" | "6M" | "3M" | "ALL")}
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
