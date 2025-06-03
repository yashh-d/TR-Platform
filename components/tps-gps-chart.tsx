"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

interface TpsGpsChartProps {
  network: string
}

// TPS & GPS specific metrics
const tpsGpsMetrics = [
  { id: "avgTps", label: "Avg TPS" },
  { id: "maxTps", label: "Max TPS" },
  { id: "avgGps", label: "Avg GPS" },
  { id: "maxGps", label: "Max GPS" }
]

export function TpsGpsChart({ network }: TpsGpsChartProps) {
  const [metricsData, setMetricsData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<"7D" | "30D" | "3M" | "6M" | "1Y" | "ALL">("30D")
  const [activeMetric, setActiveMetric] = useState<string>("avgTps")
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

  // Fetch metrics data
  useEffect(() => {
    async function fetchMetricsData() {
      try {
        setLoading(true)
        
        const selectColumns = ['date', 'avgTps', 'maxTps', 'avgGps', 'maxGps']
        
        let fetchedData: any[] = []
        let hasMore = true
        let page = 0
        const pageSize = 1000
        
        while (hasMore) {
          const { data, error } = await supabase
            .from('avalanche_core')
            .select(selectColumns.join(','))
            .order('date', { ascending: true })
            .range(page * pageSize, (page + 1) * pageSize - 1)
          
          if (error) throw error
          
          if (data && data.length > 0) {
            fetchedData = [...fetchedData, ...data]
            page++
            
            if (data.length < pageSize) {
              hasMore = false
            }
          } else {
            hasMore = false
          }
        }
        
        setMetricsData(fetchedData)
        updateChartForMetric(activeMetric, fetchedData, timeRange, network)
      } catch (err) {
        console.error('Error fetching TPS/GPS data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }
    
    fetchMetricsData()
  }, [network])
  
  // Update chart when time range or active metric changes
  useEffect(() => {
    if (metricsData.length > 0) {
      updateChartForMetric(activeMetric, metricsData, timeRange, network)
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
      filteredData = data.filter(item => new Date(item.date) >= sevenDaysAgo)
    } else if (range === "30D") {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(now.getDate() - 30)
      filteredData = data.filter(item => new Date(item.date) >= thirtyDaysAgo)
    } else if (range === "3M") {
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(now.getMonth() - 3)
      filteredData = data.filter(item => new Date(item.date) >= threeMonthsAgo)
    } else if (range === "6M") {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(now.getMonth() - 6)
      filteredData = data.filter(item => new Date(item.date) >= sixMonthsAgo)
    } else if (range === "1Y") {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(now.getFullYear() - 1)
      filteredData = data.filter(item => new Date(item.date) >= oneYearAgo)
    }
    
    // Find proper label for the metric
    const metricInfo = tpsGpsMetrics.find(m => m.id === metricName)
    const metricLabel = metricInfo ? metricInfo.label : metricName
    
    // Get network color for the chart line
    const lineColor = getNetworkColors(network)[0]
    
    // Create the trace for the chart
    if (filteredData.length > 0) {
      const yValues = filteredData.map(item => {
        const rawValue = item[metricName]
        if (rawValue === null || rawValue === undefined || rawValue === '') {
          return 0
        }
        
        if (typeof rawValue === 'number') {
          return rawValue
        }
        
        if (typeof rawValue === 'string') {
          const cleanValue = rawValue.replace(/,/g, '').trim()
          const parsed = parseFloat(cleanValue)
          return isNaN(parsed) ? 0 : parsed
        }
        
        return 0
      })

      const trace = {
        type: "scatter",
        mode: "lines",
        name: metricLabel,
        x: filteredData.map(item => item.date),
        y: yValues,
        line: { 
          width: 2, 
          color: lineColor,
          shape: 'spline',
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
      <div className="animate-pulse text-gray-500">Loading TPS & GPS data...</div>
    </div>
  )
  
  if (error) return (
    <div className="h-[350px] flex items-center justify-center text-red-500">
      <div>Error: {error}</div>
    </div>
  )
  
  if (!metricsData || metricsData.length === 0) return (
    <div className="h-[350px] flex items-center justify-center">
      <div className="text-gray-500">No TPS & GPS data available</div>
    </div>
  )
  
  return (
    <div className="border rounded-md bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">TPS + GPS</h2>
      </div>
      
      {/* Metric Pills */}
      <div className="mb-4">
        <div className="flex space-x-2">
          {tpsGpsMetrics.map(metric => (
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
        {/* Time range toggle buttons */}
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
      
      {/* Chart */}
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