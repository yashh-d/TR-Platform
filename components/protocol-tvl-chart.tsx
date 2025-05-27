"use client"

import { useEffect, useState } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check, ChevronsUpDown } from "lucide-react"
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
import { multiSelectStyles } from "@/styles/custom-styles"

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

// Define a color palette for protocol lines
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

interface ProtocolTVLChartProps {
  network: string
  height?: string
}

interface TVLData {
  date: string
  protocol: string
  tvl: number
}

interface TotalTVLData {
  date: string
  total_tvl: number
}

export function ProtocolTVLChart({ network, height = "400px" }: ProtocolTVLChartProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availableProtocols, setAvailableProtocols] = useState<string[]>([])
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>([])
  const [protocolsOpen, setProtocolsOpen] = useState(false)
  const [protocolData, setProtocolData] = useState<TVLData[]>([])
  const [totalTVLData, setTotalTVLData] = useState<TotalTVLData[]>([])
  const [timeRange, setTimeRange] = useState<"1M" | "3M" | "6M" | "1Y" | "ALL">("1Y")
  const [chartType, setChartType] = useState<"individual" | "stacked" | "percentage">("individual")
  const [showTotalTVL, setShowTotalTVL] = useState(true)

  // Get the normalized network name for the database
  const getNormalizedNetwork = (network: string): string => {
    switch (network.toLowerCase()) {
      case "avalanche":
        return "Avalanche"
      case "ethereum":
        return "Ethereum"
      case "solana":
        return "Solana"
      case "bitcoin":
        return "Bitcoin"
      case "polygon":
        return "Polygon"
      case "core":
        return "Core"
      default:
        return "Avalanche" // Default to Avalanche
    }
  }

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

  // Helper function to format currency amounts
  const formatCurrency = (amount: number): string => {
    return `$${formatLargeNumber(amount)}`
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

  // Fetch all available protocols for the selected network
  useEffect(() => {
    async function fetchAvailableProtocols() {
      if (!isSupabaseConfigured()) {
        setError("Supabase is not properly configured")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const normalizedNetwork = getNormalizedNetwork(network)
        const { data, error } = await supabase.rpc("get_distinct_protocols_by_chain", {
          chain_param: normalizedNetwork,
        })

        if (error) throw error

        if (data && data.length > 0) {
          setAvailableProtocols(data.map((item) => item.protocol))
          // Select top 5 protocols by default (or all if less than 5)
          setSelectedProtocols(data.slice(0, Math.min(5, data.length)).map((item) => item.protocol))
        } else {
          setAvailableProtocols([])
          setSelectedProtocols([])
        }
      } catch (err) {
        console.error("Failed to fetch available protocols:", err)
        setError("Failed to load protocols. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchAvailableProtocols()
  }, [network])

  // Fetch TVL data when selected protocols or time range changes
  useEffect(() => {
    async function fetchTVLData() {
      if (!isSupabaseConfigured() || selectedProtocols.length === 0) {
        return
      }

      try {
        setLoading(true)
        setError(null)

        const normalizedNetwork = getNormalizedNetwork(network)
        const { startDate, endDate } = getDateRange()

        // Fetch protocol-specific TVL data
        const { data: protocolTVLData, error: protocolError } = await supabase.rpc(
          "get_protocol_tvl_history",
          {
            chain_param: normalizedNetwork,
            protocols: selectedProtocols,
            start_date_param: startDate.toISOString().split("T")[0],
            end_date_param: endDate.toISOString().split("T")[0],
          }
        )

        if (protocolError) throw protocolError

        // Fetch total TVL data for the chain
        const { data: totalTVLResult, error: totalError } = await supabase.rpc(
          "get_total_chain_tvl",
          {
            chain_param: normalizedNetwork,
            start_date_param: startDate.toISOString().split("T")[0],
            end_date_param: endDate.toISOString().split("T")[0],
          }
        )

        if (totalError) throw totalError

        setProtocolData(protocolTVLData as TVLData[])
        setTotalTVLData(totalTVLResult as TotalTVLData[])
      } catch (err) {
        console.error("Failed to fetch TVL data:", err)
        setError("Failed to load TVL data. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchTVLData()
  }, [network, selectedProtocols, timeRange])

  // Create chart data for Plotly
  const createChartData = () => {
    if (!protocolData.length) {
      return []
    }

    // Group data by protocol
    const protocolGroups = protocolData.reduce((groups: Record<string, TVLData[]>, item) => {
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

        traces.push({
          type: "scatter",
          mode: "lines",
          name: protocol,
          x: protocolItems.map((item) => item.date),
          y: protocolItems.map((item) => item.tvl),
          stackgroup: chartType === "stacked" ? "one" : undefined,
          line: {
            width: 2,
            color: color,
          },
          hovertemplate: "%{y:$,.2f}<extra>%{fullData.name}</extra>",
        })
      })

      // Add total TVL trace if selected
      if (showTotalTVL && totalTVLData.length > 0 && chartType === "individual") {
        traces.push({
          type: "scatter",
          mode: "lines",
          name: "Total Chain TVL",
          x: totalTVLData.map((item) => item.date),
          y: totalTVLData.map((item) => item.total_tvl),
          line: {
            width: 3,
            color: getNetworkColor(network),
            dash: "dash",
          },
          hovertemplate: "%{y:$,.2f}<extra>Total Chain TVL</extra>",
        })
      }
    } else if (chartType === "percentage") {
      // Create percentage traces - normalize each day to 100%
      const dateGroups: Record<string, { protocol: string; tvl: number }[]> = {}
      
      protocolData.forEach(item => {
        if (!dateGroups[item.date]) {
          dateGroups[item.date] = []
        }
        dateGroups[item.date].push({ protocol: item.protocol, tvl: item.tvl })
      })
      
      // Calculate percentages for each date
      const percentageData: Record<string, { date: string, percentage: number }[]> = {}
      
      Object.entries(dateGroups).forEach(([date, protocols]) => {
        const totalTVL = protocols.reduce((sum, item) => sum + item.tvl, 0)
        
        protocols.forEach(protocol => {
          if (!percentageData[protocol.protocol]) {
            percentageData[protocol.protocol] = []
          }
          
          percentageData[protocol.protocol].push({
            date,
            percentage: totalTVL > 0 ? (protocol.tvl / totalTVL) * 100 : 0
          })
        })
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
          stackgroup: "one",
          line: {
            width: 0,
            color: color,
          },
          fill: "tonexty",
          hovertemplate: "%{y:.2f}%<extra>%{fullData.name}</extra>",
        })
      })
    }

    return traces
  }

  // Create chart layout
  const createChartLayout = () => {
    return {
      title: `${getNormalizedNetwork(network)} Protocol TVL`,
      xaxis: {
        title: "Date",
        type: "date",
      },
      yaxis: {
        title: chartType === "percentage" ? "Market Share (%)" : "Value Locked (USD)",
        tickformat: chartType === "percentage" ? ",.0f%" : "$,.0s",
        hoverformat: chartType === "percentage" ? ",.2f%" : "$,.2f",
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
          <h3 className="text-lg font-medium">Protocol TVL</h3>
        </div>
        <div style={{ height }} className="w-full flex items-center justify-center">
          <Skeleton className="h-[80%] w-[90%] rounded-md" />
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Protocol TVL</h3>
        </div>
        <div style={{ height }} className="w-full flex items-center justify-center">
          <div className="text-red-500 text-center">
            <p>{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()} className="mt-2">
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
          <h3 className="text-lg font-medium">Protocol TVL</h3>
          
          {/* Protocol selector */}
          <div className="flex space-x-2 items-center">
            <div className="flex items-center">
              <Popover open={protocolsOpen} onOpenChange={setProtocolsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={protocolsOpen}
                    className="min-w-[180px] justify-between"
                  >
                    {selectedProtocols.length > 0
                      ? `${selectedProtocols.length} protocols selected`
                      : "Select protocols"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="end">
                  <Command>
                    <CommandInput placeholder="Search protocols..." />
                    <CommandEmpty>No protocols found.</CommandEmpty>
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
            </div>

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

        {/* Time range selector and total TVL toggle */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            {chartType === "individual" && (
              <Button
                size="sm"
                variant={showTotalTVL ? "default" : "outline"}
                onClick={() => setShowTotalTVL(!showTotalTVL)}
                className="text-xs"
              >
                {showTotalTVL ? "Hide Total TVL" : "Show Total TVL"}
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
                  backgroundColor: timeRange === range ? getNetworkColor(network) : "",
                  borderColor: timeRange === range ? getNetworkColor(network) : "",
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
                <p>No TVL data available for the selected protocols.</p>
                <p>Please select different protocols or time range.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
} 