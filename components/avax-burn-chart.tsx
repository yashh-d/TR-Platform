"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

interface AvaxBurnChartProps {
  network: string
}

export function AvaxBurnChart({ network }: AvaxBurnChartProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<"7D" | "30D" | "3M" | "6M" | "1Y" | "ALL">("30D")
  const [chartData, setChartData] = useState<any[]>([])

  // Get network-specific colors for the chart
  const getNetworkColors = (network: string) => {
    switch (network.toLowerCase()) {
      case "avalanche":
        return ["#E84142", "#FF6B6B", "#FF9B9B"]
      default:
        return ["#3B82F6", "#60A5FA", "#93C5FD"]
    }
  }

  // Fetch AVAX burn data
  useEffect(() => {
    async function fetchAvaxBurnData() {
      try {
        setLoading(true)
        setError(null)
        
        // Only fetch data for Avalanche network
        if (network !== "avalanche") {
          setData([])
          setChartData([])
          setLoading(false)
          return
        }

        console.log('[AvaxBurnChart] Fetching AVAX burn data from avalanche_burned_fees...')
        
        // Fetch all data with pagination from the new table
        let fetchedData: any[] = []
        let hasMore = true
        let page = 0
        const pageSize = 1000

        while (hasMore) {
          console.log(`[AvaxBurnChart] Fetching page ${page}...`)
          
          const { data: pageData, error } = await supabase
            .from('avalanche_burned_fees')
            .select('Date, Burned_Fees_AVAX')
            .order('Date', { ascending: true })
            .range(page * pageSize, (page + 1) * pageSize - 1)
          
          if (error) throw error
          
          if (pageData && pageData.length > 0) {
            fetchedData = [...fetchedData, ...pageData]
            page++
            
            if (pageData.length < pageSize) {
              hasMore = false
            }
          } else {
            hasMore = false
          }
        }
        
        console.log(`[AvaxBurnChart] Total rows fetched: ${fetchedData.length}`)
        setData(fetchedData)
        
        // Create initial chart
        updateChartForTimeRange(fetchedData, timeRange, network)
      } catch (err) {
        console.error('Error fetching AVAX burn data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch AVAX burn data')
      } finally {
        setLoading(false)
      }
    }
    
    fetchAvaxBurnData()
  }, [network])
  
  // Update chart when time range changes
  useEffect(() => {
    if (data && data.length > 0) {
      updateChartForTimeRange(data, timeRange, network)
    }
  }, [timeRange, data, network])
  
  // Helper function to filter data by time range and create chart
  function updateChartForTimeRange(burnData: any[], range: string, network: string) {
    if (!burnData || burnData.length === 0) {
      setChartData([])
      return
    }
    
    let filteredData = [...burnData]
    const now = new Date()
    
    // Filter by time range
    if (range === "7D") {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(now.getDate() - 7)
      filteredData = burnData.filter(item => {
        const itemDate = new Date(item.Date)
        return itemDate >= sevenDaysAgo
      })
    } else if (range === "30D") {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(now.getDate() - 30)
      filteredData = burnData.filter(item => {
        const itemDate = new Date(item.Date)
        return itemDate >= thirtyDaysAgo
      })
    } else if (range === "3M") {
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(now.getMonth() - 3)
      filteredData = burnData.filter(item => {
        const itemDate = new Date(item.Date)
        return itemDate >= threeMonthsAgo
      })
    } else if (range === "6M") {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(now.getMonth() - 6)
      filteredData = burnData.filter(item => {
        const itemDate = new Date(item.Date)
        return itemDate >= sixMonthsAgo
      })
    } else if (range === "1Y") {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(now.getFullYear() - 1)
      filteredData = burnData.filter(item => {
        const itemDate = new Date(item.Date)
        return itemDate >= oneYearAgo
      })
    }
    
    // Get network color for the chart line
    const lineColor = getNetworkColors(network)[0]
    
    // Create the trace for the chart with network-specific color
    if (filteredData.length > 0) {
      const trace = {
        type: "scatter",
        mode: "lines",
        name: "AVAX Burned",
        x: filteredData.map(item => item.Date),
        y: filteredData.map(item => parseFloat(item.Burned_Fees_AVAX || '0')),
        line: { 
          width: 2, 
          color: lineColor,
          shape: 'spline',
        },
        hovertemplate: '<b>%{y:.6f} AVAX</b><br>%{x}<extra></extra>',
        hoverlabel: {
          bgcolor: "white",
          bordercolor: lineColor,
          font: { color: "black", size: 12 },
          align: "left"
        }
      }
      
      setChartData([trace])
    } else {
      setChartData([])
    }
  }
  
  if (loading) return (
    <div className="h-[350px] flex items-center justify-center">
      <div className="animate-pulse text-gray-500">Loading AVAX burn data...</div>
    </div>
  )
  
  if (error) return (
    <div className="h-[350px] flex items-center justify-center text-red-500">
      Error: {error}
    </div>
  )

  // Don't render for non-Avalanche networks
  if (network !== "avalanche") {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Avalanche C-Chain AVAX Burned</h3>
        <div className="flex gap-2">
          <Button
            variant={timeRange === "7D" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange("7D")}
            className="text-xs"
          >
            7D
          </Button>
          <Button
            variant={timeRange === "30D" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange("30D")}
            className="text-xs"
          >
            30D
          </Button>
          <Button
            variant={timeRange === "3M" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange("3M")}
            className="text-xs"
          >
            3M
          </Button>
          <Button
            variant={timeRange === "6M" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange("6M")}
            className="text-xs"
          >
            6M
          </Button>
          <Button
            variant={timeRange === "1Y" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange("1Y")}
            className="text-xs"
          >
            1Y
          </Button>
          <Button
            variant={timeRange === "ALL" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange("ALL")}
            className="text-xs"
          >
            ALL
          </Button>
        </div>
      </div>
      
      <div className="h-[350px]">
        {chartData.length > 0 ? (
          <Plot
            data={chartData}
            layout={{
              showlegend: false,
              margin: { l: 60, r: 20, t: 40, b: 60 },
              plot_bgcolor: 'transparent',
              paper_bgcolor: 'transparent',
              xaxis: {
                showgrid: true,
                gridcolor: '#f1f5f9',
                zeroline: false,
                tickfont: { size: 11, color: '#64748b' },
              },
              yaxis: {
                showgrid: true,
                gridcolor: '#f1f5f9',
                zeroline: false,
                tickfont: { size: 11, color: '#64748b' },
                title: {
                  text: 'AVAX Burned',
                  font: { size: 12, color: '#64748b' }
                }
              },
              hovermode: 'closest',
              hoverdistance: 30,
              spikedistance: 30,
            }}
            config={{
              displayModeBar: false,
              responsive: true,
            }}
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            No data available for the selected time range
          </div>
        )}
      </div>
    </div>
  )
} 