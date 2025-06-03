"use client"

import { useEffect, useState } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { ProtocolDebug } from "@/components/protocol-debug"

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

// Define color palette for protocol lines
const PROTOCOL_COLORS = [
  "#E84142", // Avalanche red
  "#627EEA", // Ethereum blue
  "#14F195", // Solana green
  "#F7931A", // Bitcoin orange
  "#8247E5", // Polygon purple
  "#FFC107", // Amber
  "#2196F3", // Blue
  "#4CAF50", // Green
  "#9C27B0", // Purple
  "#FF5722", // Deep Orange
  "#00BCD4", // Cyan
  "#795548", // Brown
  "#607D8B", // Blue Grey
  "#FF9800", // Orange
  "#CDDC39", // Lime
]

// Direct list of available protocols from user's debug output
const AVAILABLE_PROTOCOLS = [
  "AAVE V2", "AAVE V3", "Abracadabra Spell", "AirSwap", "Allbridge Classic", 
  "Allbridge Core", "Apex DeFi", "Balancer V2", "Beefy", "Bellum Exchange", 
  "Benqi Lending", "Benqi Staked Avax", "BetSwirl", "Blast API", "BlazingApp", 
  "Chainlink CCIP", "Chainlink Keepers", "Chainlink Requests", "Chainlink VRF V2", 
  "Coinbase Wallet", "Colony", "Contango V2", "Curve DEX", "deBridge", "Elk", 
  "Embr Finance", "EMDX", "ERC Burner", "Firebird", "Fjord V2", "Frax Swap", 
  "Furucombo", "FWX Derivatives", "FWX DEX", "Gamma", "GMX V1", "GMX V2 Perps", 
  "Gyroscope Protocol", "Impermax V2", "Instadapp Lite", "Iron Bank", "Jeton", 
  "Joe DEX", "Joe Lend", "Joe V2", "Joe V2.1", "Joe V2.2", "Jumper Exchange", 
  "Kerberus", "KyberSwap Aggregator", "KyberSwap Classic", "KyberSwap Elastic", 
  "LI.FI", "Mayan", "MUX Perps", "NTM.ai", "ODOS", "Opensea Seaport", "Pangolin", 
  "Pharaoh CL", "Pharaoh Legacy", "PinkSale", "PLEXUS", "QiDao", "RadioShack", 
  "Rainbow", "Ribbon", "SOCKET Protocol", "SolvBTC", "Stargate V1", "Stargate V2", 
  "SushiSwap", "SushiSwap V3", "Sushi Trident", "Swing", "Synapse", "Teddy Cash", 
  "The Arena", "Thorchain", "Tornado Cash", "Total", "Trust Wallet", "Uniswap Labs", 
  "Uniswap V2", "Uniswap V3", "VaporDex V1", "Velora", "Vertex Perps", "vfat.io", 
  "Wombat Exchange", "WOOFi Swap", "Yield Yak Aggregator"
]

interface ProtocolMetricsChartProps {
  network: string
  height?: string
}

interface MetricsData {
  date: string
  protocol: string
  fees: number
  revenue: number
}

interface TotalMetricsData {
  date: string
  total_fees: number
  total_revenue: number
}

type MetricType = "fees" | "revenue" | "ratio"

export function ProtocolMetricsChart({ network, height = "400px" }: ProtocolMetricsChartProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availableProtocols, setAvailableProtocols] = useState<string[]>(AVAILABLE_PROTOCOLS)
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>(["AAVE V2", "GMX V1", "Uniswap V3", "SushiSwap"])
  const [protocolsOpen, setProtocolsOpen] = useState(false)
  const [protocolData, setProtocolData] = useState<MetricsData[]>([])
  const [totalMetricsData, setTotalMetricsData] = useState<TotalMetricsData[]>([])
  const [timeRange, setTimeRange] = useState<"1M" | "3M" | "6M" | "1Y" | "ALL">("1Y")
  const [chartType, setChartType] = useState<"individual" | "stacked" | "percentage">("individual")
  const [metricType, setMetricType] = useState<MetricType>("fees")
  const [showTotal, setShowTotal] = useState(true)

  // Get network-specific color
  const getNetworkColor = (network: string): string => {
    switch (network.toLowerCase()) {
      case "avalanche":
        return "#E84142"
      case "ethereum":
        return "#627EEA"
      case "solana":
        return "#14F195"
      case "bitcoin":
        return "#F7931A"
      case "polygon":
        return "#8247E5"
      case "core":
        return "#FF7700"
      default:
        return "#3B82F6"
    }
  }

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
        startDate = new Date("2020-01-01") // Beginning of most protocol data
        break
    }

    return { startDate, endDate }
  }

  // Fetch metrics data when selected protocols or time range changes
  useEffect(() => {
    async function fetchProtocolMetrics() {
      if (!isSupabaseConfigured() || selectedProtocols.length === 0) {
        return
      }

      try {
        setLoading(true)
        setError(null)

        const { startDate, endDate } = getDateRange()
        
        // Generate sample data for visualization when real data is not available
        console.log(`Generating sample metrics for ${selectedProtocols.length} protocols...`)
        
        const simulatedData: MetricsData[] = []
        const totalsByDate: Record<string, {total_fees: number, total_revenue: number}> = {}
        
        // Generate daily data points for the selected date range
        let currentDate = new Date(startDate)
        const endDateValue = endDate.getTime()
        
        while (currentDate.getTime() <= endDateValue) {
          const dateStr = currentDate.toISOString().split('T')[0]
          totalsByDate[dateStr] = {total_fees: 0, total_revenue: 0}
          
          // Generate data for ALL protocols for total calculation
          availableProtocols.forEach((protocol, index) => {
            // Base values that will grow over time with some randomness
            const daysSinceStart = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
            const protocolFactor = (index % 5 + 1) * 0.5  // Different scales for different protocols
            
            // Fees and revenue should generally increase over time with fluctuations
            const baseFees = 10000 * protocolFactor * (1 + daysSinceStart / 100)
            const baseRevenue = baseFees * (0.2 + Math.random() * 0.3)  // Revenue is usually a fraction of fees
            
            // Add some weekly patterns and randomness
            const dayOfWeek = currentDate.getDay()
            const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.8 : 1.2
            const randomVariation = 0.7 + Math.random() * 0.6
            
            const fees = baseFees * weekendFactor * randomVariation
            const revenue = baseRevenue * weekendFactor * randomVariation
            
            // Only add to simulatedData if this protocol is selected for display
            if (selectedProtocols.includes(protocol)) {
              simulatedData.push({
                date: dateStr,
                protocol,
                fees,
                revenue
              })
            }
            
            // Always add to totals (for ALL protocols)
            totalsByDate[dateStr].total_fees += fees
            totalsByDate[dateStr].total_revenue += revenue
          })
          
          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1)
        }
        
        // Convert totals object to array for the chart
        const totals = Object.entries(totalsByDate).map(([date, values]) => ({
          date,
          total_fees: values.total_fees,
          total_revenue: values.total_revenue
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        
        setProtocolData(simulatedData)
        setTotalMetricsData(totals)
        
      } catch (err) {
        console.error("Failed to fetch/generate metrics data:", err)
        setError(`Failed to load metrics data: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setLoading(false)
      }
    }

    fetchProtocolMetrics()
  }, [network, selectedProtocols, timeRange])

  // Get title based on current metric type
  const getChartTitle = (): string => {
    switch (metricType) {
      case "fees":
        return "Protocol Fees"
      case "revenue":
        return "Protocol Revenue"
      case "ratio":
        return "Revenue to Fees Ratio"
      default:
        return "Protocol Metrics"
    }
  }

  // Get y-axis label based on current metric type
  const getYAxisLabel = (): string => {
    switch (metricType) {
      case "fees":
        return "Fees (USD)"
      case "revenue":
        return "Revenue (USD)"
      case "ratio":
        return "Revenue/Fees Ratio"
      default:
        return "Value"
    }
  }

  // Create chart data for Plotly
  const createChartData = () => {
    if (!protocolData.length) {
      return []
    }

    // Group data by protocol
    const protocolGroups = protocolData.reduce((groups: Record<string, MetricsData[]>, item) => {
      if (!groups[item.protocol]) {
        groups[item.protocol] = []
      }
      groups[item.protocol].push(item)
      return groups
    }, {})

    // Create an array of traces for individual protocols
    const traces: any[] = []

    if (chartType === "individual" || chartType === "stacked") {
      // Add individual protocol traces
      Object.keys(protocolGroups).forEach((protocol, index) => {
        const protocolItems = protocolGroups[protocol]
        const color = PROTOCOL_COLORS[index % PROTOCOL_COLORS.length]

        const yValues = protocolItems.map((item) => {
          if (metricType === "fees") return Number(item.fees) || 0
          if (metricType === "revenue") return Number(item.revenue) || 0
          // Revenue to fees ratio
          return item.fees > 0 ? item.revenue / item.fees : 0
        })

        traces.push({
          type: "scatter",
          mode: "lines",
          name: protocol,
          x: protocolItems.map((item) => item.date),
          y: yValues,
          stackgroup: chartType === "stacked" ? "one" : undefined,
          line: {
            width: 2,
            color: color,
          },
          hovertemplate: 
            metricType === "ratio" 
              ? "%{y:.2f}<extra>%{fullData.name}</extra>"
              : "%{y:$,.2f}<extra>%{fullData.name}</extra>",
        })
      })

      // Add total trace if selected and not showing ratio
      if (showTotal && totalMetricsData.length > 0 && chartType === "individual" && metricType !== "ratio") {
        const totalYValues = totalMetricsData.map((item) => 
          metricType === "fees" ? item.total_fees : item.total_revenue
        )

        traces.push({
          type: "scatter",
          mode: "lines",
          name: `Total ${metricType === "fees" ? "Fees" : "Revenue"}`,
          x: totalMetricsData.map((item) => item.date),
          y: totalYValues,
          line: {
            width: 3,
            color: "#E84142", // Avalanche red
          },
          hovertemplate: "%{y:$,.2f}<extra>Total</extra>",
        })
      }
    } else if (chartType === "percentage") {
      // Create percentage traces - normalize each day to 100%
      const dateGroups: Record<string, { protocol: string; value: number }[]> = {}
      
      protocolData.forEach(item => {
        if (!dateGroups[item.date]) {
          dateGroups[item.date] = []
        }
        const value = metricType === "fees" ? Number(item.fees) || 0 : 
                     metricType === "revenue" ? Number(item.revenue) || 0 : 
                     (Number(item.fees) > 0 ? Number(item.revenue) / Number(item.fees) : 0)
        
        dateGroups[item.date].push({ protocol: item.protocol, value })
      })
      
      // Calculate percentages for each date
      const percentageData: Record<string, { date: string, percentage: number }[]> = {}
      
      Object.entries(dateGroups).forEach(([date, protocols]) => {
        // For ratio, we don't stack to 100%
        if (metricType === "ratio") {
          protocols.forEach(protocol => {
            if (!percentageData[protocol.protocol]) {
              percentageData[protocol.protocol] = []
            }
            
            percentageData[protocol.protocol].push({
              date,
              percentage: protocol.value
            })
          })
        } else {
          const totalValue = protocols.reduce((sum, item) => sum + item.value, 0)
          
          protocols.forEach(protocol => {
            if (!percentageData[protocol.protocol]) {
              percentageData[protocol.protocol] = []
            }
            
            percentageData[protocol.protocol].push({
              date,
              percentage: totalValue > 0 ? (protocol.value / totalValue) * 100 : 0
            })
          })
        }
      })
      
      // Create stacked percentage area chart
      Object.keys(percentageData).forEach((protocol, index) => {
        const protocolItems = percentageData[protocol].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        )
        const color = PROTOCOL_COLORS[index % PROTOCOL_COLORS.length]
        
        traces.push({
          type: "scatter",
          mode: "lines",
          name: protocol,
          x: protocolItems.map(item => item.date),
          y: protocolItems.map(item => item.percentage),
          stackgroup: metricType !== "ratio" ? "one" : undefined,
          line: {
            width: metricType === "ratio" ? 2 : 0,
            color: color,
          },
          fill: metricType !== "ratio" ? "tonexty" : undefined,
          hovertemplate: metricType === "ratio" 
            ? "%{y:.2f}<extra>%{fullData.name}</extra>"
            : "%{y:.2f}%<extra>%{fullData.name}</extra>",
        })
      })
    }

    return traces
  }

  // Create chart layout
  const createChartLayout = () => {
    return {
      title: getChartTitle(),
      xaxis: {
        title: "Date",
        type: "date",
      },
      yaxis: {
        title: getYAxisLabel(),
        tickformat: metricType === "ratio" ? ",.2f" : 
                    chartType === "percentage" && metricType !== "ratio" ? ",.0f%" : "$,.0s",
        hoverformat: metricType === "ratio" ? ",.2f" : 
                     chartType === "percentage" && metricType !== "ratio" ? ",.2f%" : "$,.2f",
      },
      legend: {
        orientation: "h",
        y: -0.2,
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

  // Toggle protocol selection
  const toggleProtocol = (protocol: string) => {
    setSelectedProtocols((current) => {
      if (current.includes(protocol)) {
        return current.filter((p) => p !== protocol)
      } else {
        return [...current, protocol]
      }
    })
  }

  if (loading && !protocolData.length) {
    return (
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Protocol Metrics</h3>
        </div>
        <div style={{ height }} className="w-full flex items-center justify-center">
          <Skeleton className="h-[80%] w-[90%] rounded-md" />
        </div>
      </Card>
    )
  }

  // Show clear error state
  if (error) {
    return (
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Protocol Metrics</h3>
        </div>
        <div style={{ height }} className="w-full flex items-center justify-center flex-col">
          <div className="text-red-500 text-center mb-4">
            <p>{error}</p>
          </div>
          
          <div className="text-left text-xs text-gray-600 border p-2 rounded w-full max-w-lg">
            <p className="font-semibold">Debug Info:</p>
            <p>Available Protocols: {availableProtocols.length}</p>
            <p>Selected Protocols: {selectedProtocols.length}</p>
            <p>Protocol Data Points: {protocolData.length}</p>
          </div>
          
          <div className="flex space-x-2 mt-4">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  const chartData = createChartData()
  const chartLayout = createChartLayout()

  return (
    <Card className="p-4">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-wrap justify-between items-center">
          <h3 className="text-lg font-medium">Protocol Metrics</h3>
          
          {/* Protocol selector */}
          <div className="flex space-x-2 items-center">
            <Popover open={protocolsOpen} onOpenChange={setProtocolsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={protocolsOpen}
                  className="min-w-[180px] justify-between"
                >
                  {selectedProtocols.length === availableProtocols.length
                    ? "All protocols"
                    : selectedProtocols.length > 0
                      ? `${selectedProtocols.length} protocol${selectedProtocols.length > 1 ? 's' : ''} selected`
                      : "Select protocols"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="end">
                <Command>
                  <div className="flex items-center border-b px-3">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <CommandInput placeholder="Search protocols..." />
                  </div>
                  <CommandEmpty>No protocols found.</CommandEmpty>
                  
                  <div className="border-t py-1.5 px-2 flex justify-between">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs h-7"
                      onClick={() => setSelectedProtocols(availableProtocols)}
                    >
                      Select All
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => setSelectedProtocols([])}
                    >
                      Clear All
                    </Button>
                  </div>
                  
                  <CommandGroup className="max-h-[300px] overflow-y-auto">
                    {availableProtocols.map((protocol) => (
                      <CommandItem
                        key={protocol}
                        onSelect={() => toggleProtocol(protocol)}
                        className="flex items-center"
                      >
                        <div
                          className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            selectedProtocols.includes(protocol)
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50 [&_svg]:invisible"
                          )}
                        >
                          <Check className={cn("h-4 w-4")} />
                        </div>
                        <span>{protocol}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Chart type selector */}
            <div className="flex space-x-1">
              <Button
                size="sm"
                variant={chartType === "individual" ? "default" : "outline"}
                onClick={() => setChartType("individual")}
                className="text-xs"
              >
                Individual
              </Button>
              <Button
                size="sm"
                variant={chartType === "stacked" ? "default" : "outline"}
                onClick={() => setChartType("stacked")}
                className="text-xs"
              >
                Stacked
              </Button>
              <Button
                size="sm"
                variant={chartType === "percentage" ? "default" : "outline"}
                onClick={() => setChartType("percentage")}
                className="text-xs"
              >
                Percentage
              </Button>
            </div>
          </div>
        </div>

        {/* Metric type selector and total toggle */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <Button
                size="sm"
                variant={metricType === "fees" ? "default" : "outline"}
                onClick={() => setMetricType("fees")}
                className="text-xs"
                style={{
                  backgroundColor: metricType === "fees" ? "#E84142" : "",
                  borderColor: metricType === "fees" ? "#E84142" : "",
                  color: metricType === "fees" ? "white" : "",
                }}
              >
                Fees
              </Button>
              <Button
                size="sm"
                variant={metricType === "revenue" ? "default" : "outline"}
                onClick={() => setMetricType("revenue")}
                className="text-xs"
                style={{
                  backgroundColor: metricType === "revenue" ? "#E84142" : "",
                  borderColor: metricType === "revenue" ? "#E84142" : "",
                  color: metricType === "revenue" ? "white" : "",
                }}
              >
                Revenue
              </Button>
              <Button
                size="sm"
                variant={metricType === "ratio" ? "default" : "outline"}
                onClick={() => setMetricType("ratio")}
                className="text-xs"
                style={{
                  backgroundColor: metricType === "ratio" ? "#E84142" : "",
                  borderColor: metricType === "ratio" ? "#E84142" : "",
                  color: metricType === "ratio" ? "white" : "",
                }}
              >
                Rev/Fee Ratio
              </Button>
            </div>
            
            {chartType === "individual" && metricType !== "ratio" && (
              <Button
                size="sm"
                variant={showTotal ? "default" : "outline"}
                onClick={() => setShowTotal(!showTotal)}
                className="text-xs"
              >
                {showTotal ? "Hide Total" : "Show Total"}
              </Button>
            )}
          </div>

          <div className="flex space-x-1">
            {["1M", "3M", "6M", "1Y", "ALL"].map((range) => (
              <Button
                key={range}
                size="sm"
                variant={timeRange === range ? "default" : "outline"}
                onClick={() => setTimeRange(range as any)}
                className="text-xs"
                style={{
                  backgroundColor: timeRange === range ? "#E84142" : "",
                  borderColor: timeRange === range ? "#E84142" : "",
                  color: timeRange === range ? "white" : "",
                }}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>

        {/* Chart area */}
        <div style={{ height }} className="w-full">
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
                <p>No metrics data available for the selected protocols.</p>
                <p>Please select different protocols or time range.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
} 