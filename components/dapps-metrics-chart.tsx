"use client"

import { useState, useEffect } from "react"
import { ChevronDown, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DAppsMetricsChartProps {
  network: string;
  metric: "tvl" | "transactions" | "users";
  title?: string;
}

export function DAppsMetricsChart({ network, metric, title }: DAppsMetricsChartProps) {
  const [timeRange, setTimeRange] = useState('1Y')
  const [activeMetricTab, setActiveMetricTab] = useState<string>(metric)
  const [showYAxis, setShowYAxis] = useState(true)
  
  // Get metric-specific title
  const getMetricTitle = (): string => {
    if (title) return title
    
    switch (metric) {
      case "tvl":
        return "Total Value Locked (TVL)"
      case "transactions":
        return "Daily Transactions"
      case "users":
        return "Active Users"
      default:
        return "Protocol Metrics"
    }
  }
  
  // Get network-specific colors
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
        return "#FF7700" // Bright orange
      default:
        return "#3B82F6"
    }
  }
  
  // Get y-axis label based on metric
  const getYAxisLabel = (): string => {
    switch (activeMetricTab) {
      case "tvl":
        return "Value Locked (USD)"
      case "transactions":
        return "Transactions per Day"
      case "users":
        return "Active Users"
      default:
        return "Value"
    }
  }
  
  // Format y-axis based on metric
  const getYAxisFormat = (): string => {
    switch (activeMetricTab) {
      case "tvl":
        return ".2s" // For dollar amounts with K, M, B suffixes
      case "transactions":
      case "users":
        return ",.0f" // For numbers with commas
      default:
        return ".2s"
    }
  }
  
  // Get y-axis prefix based on metric
  const getYAxisPrefix = (): string => {
    return activeMetricTab === "tvl" ? "$" : ""
  }
  
  // Generate mock data - in a real app, this would fetch from an API or database
  const generateMockData = () => {
    const now = new Date()
    const data: { date: Date; value: number }[] = []
    
    // Different data patterns for different metrics
    const baseValue = activeMetricTab === "tvl" ? 1000000 : 
                      activeMetricTab === "transactions" ? 20000 : 5000
    
    // Generate data points going back in time
    const days = timeRange === '1Y' ? 365 : 
                 timeRange === '6M' ? 180 :
                 timeRange === '3M' ? 90 : 30
    
    for (let i = 0; i < days; i++) {
      const date = new Date(now)
      date.setDate(now.getDate() - i)
      
      let value = baseValue
      
      // Add some trends and randomness based on the network and metric
      if (network === "ethereum") {
        value *= 2.5
      } else if (network === "solana") {
        value *= 1.8
      } else if (network === "polygon") {
        value *= 1.2
      }
      
      // Add growth trend
      const growthFactor = 1 + (i / days) * 0.3
      value /= growthFactor
      
      // Add some randomness
      const randomFactor = 0.9 + Math.random() * 0.2
      value *= randomFactor
      
      // Some spikes for visual interest
      if (i % 14 === 0) {
        value *= 1.2
      }
      
      data.push({ date, value })
    }
    
    // Sort by date ascending
    return data.sort((a, b) => a.date.getTime() - b.date.getTime())
  }
  
  // Create chart data in Plotly format
  const createChartData = () => {
    const mockData = generateMockData()
    
    const chartData = {
      data: [
        {
          x: mockData.map(d => d.date),
          y: mockData.map(d => d.value),
          type: 'scatter',
          mode: 'lines',
          line: {
            color: getNetworkColor(network),
            width: 2
          },
          name: getMetricTitle()
        }
      ],
      layout: {
        title: getMetricTitle(),
        showlegend: false,
        xaxis: {
          title: 'Date',
          showgrid: true,
          gridcolor: '#e5e5e5'
        },
        yaxis: {
          title: getYAxisLabel(),
          showgrid: true,
          gridcolor: '#e5e5e5',
          tickprefix: getYAxisPrefix(),
          tickformat: getYAxisFormat(),
          hoverformat: activeMetricTab === "tvl" ? ',.2f' : ',.0f',
          showticklabels: showYAxis,
          tickfont: {
            family: 'Arial, sans-serif',
            size: 12
          }
        },
        margin: {
          l: 60,
          r: 40,
          t: 50,
          b: 50
        },
        autosize: true,
        plot_bgcolor: 'white',
        paper_bgcolor: 'white',
      },
      config: {
        responsive: true,
        displayModeBar: false
      }
    }
    
    return chartData
  }
  
  const chartData = createChartData()
  
  // Handle metric tab switch
  const handleMetricTabChange = (newMetric: string) => {
    setActiveMetricTab(newMetric)
  }
  
  const handleDownload = () => {
    // Mock implementation - in a real app, this would download real data
    const mockData = generateMockData()
    const csv = [
      ['Date', 'Value'].join(','),
      ...mockData.map(row => [
        row.date.toISOString().split('T')[0],
        row.value.toString()
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${network}_${activeMetricTab}_data.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  return (
    <div className="border rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2">
          {/* Allow switching between related metrics */}
          {metric === "tvl" && (
            <>
              <Button
                variant={activeMetricTab === "tvl" ? "default" : "outline"}
                size="sm"
                onClick={() => handleMetricTabChange("tvl")}
              >
                TVL
              </Button>
              <Button
                variant={activeMetricTab === "deposits" ? "default" : "outline"}
                size="sm"
                onClick={() => handleMetricTabChange("deposits")}
              >
                Deposits
              </Button>
              <Button
                variant={activeMetricTab === "withdrawals" ? "default" : "outline"}
                size="sm"
                onClick={() => handleMetricTabChange("withdrawals")}
              >
                Withdrawals
              </Button>
            </>
          )}
          
          {metric === "transactions" && (
            <>
              <Button
                variant={activeMetricTab === "transactions" ? "default" : "outline"}
                size="sm"
                onClick={() => handleMetricTabChange("transactions")}
              >
                Transactions
              </Button>
              <Button
                variant={activeMetricTab === "fees" ? "default" : "outline"}
                size="sm"
                onClick={() => handleMetricTabChange("fees")}
              >
                Fees
              </Button>
            </>
          )}
          
          {metric === "users" && (
            <>
              <Button
                variant={activeMetricTab === "users" ? "default" : "outline"}
                size="sm"
                onClick={() => handleMetricTabChange("users")}
              >
                Users
              </Button>
              <Button
                variant={activeMetricTab === "new_users" ? "default" : "outline"}
                size="sm"
                onClick={() => handleMetricTabChange("new_users")}
              >
                New Users
              </Button>
              <Button
                variant={activeMetricTab === "active_users" ? "default" : "outline"}
                size="sm"
                onClick={() => handleMetricTabChange("active_users")}
              >
                Active Users
              </Button>
            </>
          )}
        </div>
        
        <div className="flex space-x-2">
          {/* Time range selector */}
          <div className="flex items-center space-x-1">
            {['1Y', '6M', '3M', '1M'].map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {range}
              </Button>
            ))}
          </div>
          
          {/* Download button */}
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        </div>
      </div>
      
      {/* Chart container */}
      <div className="h-[350px] w-full">
        {typeof window !== 'undefined' && (
          <div
            ref={(el) => {
              if (el && typeof window !== 'undefined') {
                // @ts-ignore
                if (window.Plotly) {
                  // @ts-ignore
                  window.Plotly.newPlot(el, chartData.data, chartData.layout, chartData.config)
                } else {
                  const script = document.createElement('script')
                  script.src = 'https://cdn.plot.ly/plotly-latest.min.js'
                  script.onload = () => {
                    // @ts-ignore
                    window.Plotly.newPlot(el, chartData.data, chartData.layout, chartData.config)
                  }
                  document.head.appendChild(script)
                }
              }
            }}
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </div>
    </div>
  )
} 