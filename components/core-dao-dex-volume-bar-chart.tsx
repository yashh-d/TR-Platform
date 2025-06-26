"use client"

import { useState, useEffect, useRef } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Download, ChevronDown, Check } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

interface CoreDaoDexVolumeChartProps {
  network: string
  maxHeight?: string
  onlyTotal?: boolean
}

interface VolumeData {
  date: string
  protocol: string
  volume: number
  cumulative_volume: number
}

interface DexProtocol {
  protocol: string
  total_volume: number
  last_updated: string
}

export function CoreDaoDexVolumeBarChart({ network, maxHeight = "500px", onlyTotal = false }: CoreDaoDexVolumeChartProps) {
  const [volumeData, setVolumeData] = useState<VolumeData[]>([])
  const [allProtocols, setAllProtocols] = useState<DexProtocol[]>([])
  const [loading, setLoading] = useState(true)
  const [protocolsLoading, setProtocolsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<string>("30D")
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>([])
  const [protocolsOpen, setProtocolsOpen] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)
  
  // Clean up any "total" protocols from selected protocols when protocols change
  useEffect(() => {
    if (allProtocols.length > 0 && !onlyTotal) {
      const cleanSelectedProtocols = selectedProtocols.filter(protocol => 
        protocol && protocol.toLowerCase() !== 'total'
      )
      if (cleanSelectedProtocols.length !== selectedProtocols.length) {
        setSelectedProtocols(cleanSelectedProtocols.length > 0 ? cleanSelectedProtocols : 
          allProtocols.slice(0, Math.min(5, allProtocols.length)).map(p => p.protocol))
      }
    }
  }, [allProtocols, onlyTotal])
  
  // Fetch all available protocols for Core DAO
  useEffect(() => {
    if (network.toLowerCase() !== "core") {
      setProtocolsLoading(false)
      return
    }
    
    if (!isSupabaseConfigured()) {
      setError("Supabase not configured properly")
      setProtocolsLoading(false)
      return
    }
    
    async function fetchAllProtocols() {
      try {
        setProtocolsLoading(true)
        console.log("Fetching all Core DAO DEX protocols...")
        const startTime = performance.now()
        
        // Get distinct protocols from core_dao_dex_volumes table
        const { data, error: fetchError } = await supabase
          .from('core_dao_dex_volumes')
          .select('protocol, volume')
          .order('volume', { ascending: false })
        
        const endTime = performance.now()
        console.log(`Core DAO DEX protocols fetch took ${(endTime - startTime).toFixed(2)}ms`)
        
        if (fetchError) {
          console.error("Error fetching Core DAO DEX protocols:", fetchError)
          throw fetchError
        }
        
        if (data) {
          // Get unique protocols and calculate total volumes
          const protocolStats: Record<string, number> = {}
          data.forEach(item => {
            if (!protocolStats[item.protocol]) {
              protocolStats[item.protocol] = 0
            }
            protocolStats[item.protocol] += Number(item.volume)
          })
          
          // Create protocol objects sorted by total volume
          const protocols = Object.entries(protocolStats)
            .map(([protocol, total_volume]) => ({
              protocol,
              total_volume,
              last_updated: new Date().toISOString().split('T')[0]
            }))
            .sort((a, b) => b.total_volume - a.total_volume)
            .filter(p => p.protocol.toLowerCase() !== 'total') // Filter out "total"
          
          console.log(`Found ${protocols.length} Core DAO DEX protocols`)
          setAllProtocols(protocols)
          
          // If onlyTotal, select only 'total', else top 5
          if (selectedProtocols.length === 0 && protocols.length > 0) {
            if (onlyTotal && protocols.some(p => p.protocol === 'total')) {
              setSelectedProtocols(['total'])
            } else {
              setSelectedProtocols(protocols.slice(0, Math.min(5, protocols.length)).map(p => p.protocol))
            }
          }
        }
      } catch (err) {
        console.error('Error fetching Core DAO DEX protocols:', err)
        setError('Failed to load Core DAO DEX protocols')
      } finally {
        setProtocolsLoading(false)
      }
    }
    
    fetchAllProtocols()
  }, [network, onlyTotal])
  
  // Fetch volume data based on selected protocols and time range
  useEffect(() => {
    if (network.toLowerCase() !== "core" || selectedProtocols.length === 0) {
      setLoading(false)
      return
    }
    
    if (!isSupabaseConfigured()) {
      setError("Supabase not configured properly")
      setLoading(false)
      return
    }
    
    async function fetchVolumeData() {
      try {
        setLoading(true)
        console.log(`Fetching Core DAO volume data for ${selectedProtocols.length} protocols...`)
        const startTime = performance.now()
        
        const endDate = new Date().toISOString().split('T')[0]
        let startDate = new Date()
        
        // Calculate start date based on time range
        switch (timeRange) {
          case '7D':
            startDate.setDate(startDate.getDate() - 7)
            break
          case '30D':
            startDate.setDate(startDate.getDate() - 30)
            break
          case '90D':
            startDate.setDate(startDate.getDate() - 90)
            break
          case '180D':
            startDate.setDate(startDate.getDate() - 180)
            break
          case '1Y':
            startDate.setFullYear(startDate.getFullYear() - 1)
            break
          case 'ALL':
            startDate = new Date(2020, 0, 1) // Start from 2020
            break
        }
        
        console.log("Core DAO query parameters:", {
          protocols: selectedProtocols,
          startDate: startDate.toISOString().split('T')[0],
          endDate
        })
        
        // Query core_dao_dex_volumes table
        const { data, error: fetchError } = await supabase
          .from('core_dao_dex_volumes')
          .select('date, protocol, volume')
          .in('protocol', selectedProtocols)
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate)
          .order('date', { ascending: true })
        
        const endTime = performance.now()
        console.log(`Core DAO volume data fetch took ${(endTime - startTime).toFixed(2)}ms`)
        
        if (fetchError) {
          console.error("Error fetching Core DAO volume data:", fetchError)
          throw fetchError
        }
        
        if (data) {
          console.log(`Core DAO query successful, got ${data.length} records`)
          // Process the data to calculate cumulative volumes
          const processedData: VolumeData[] = []
          const cumulativeByProtocol: Record<string, number> = {}
          
          data.forEach(item => {
            if (!cumulativeByProtocol[item.protocol]) {
              cumulativeByProtocol[item.protocol] = 0
            }
            
            cumulativeByProtocol[item.protocol] += Number(item.volume)
            
            processedData.push({
              date: item.date,
              protocol: item.protocol,
              volume: Number(item.volume),
              cumulative_volume: cumulativeByProtocol[item.protocol]
            })
          })
          
          setVolumeData(processedData)
          setError(null)
        }
      } catch (err) {
        console.error('Error fetching Core DAO volume data:', err)
        setError('Failed to load Core DAO volume data. Please try again later.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchVolumeData()
  }, [network, selectedProtocols, timeRange])
  
  // Create Plotly chart when data changes
  useEffect(() => {
    if (!loading && !error && volumeData.length > 0 && chartRef.current) {
      if (typeof window !== 'undefined' && window.Plotly) {
        console.log("Rendering Core DAO chart with", volumeData.length, "data points")
        renderChart()
      } else {
        console.error("Plotly is not available in the window object")
      }
    }
  }, [loading, error, volumeData])
  
  // Format for display
  const formatVolume = (volume: number): string => {
    if (volume >= 1000000000) {
      return `$${(volume / 1000000000).toFixed(2)}B`
    } else if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(2)}M`
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(2)}K`
    } else {
      return `$${volume.toFixed(2)}`
    }
  }
  
  // Render the appropriate chart
  const renderChart = () => {
    if (!chartRef.current || volumeData.length === 0) {
      console.log("Cannot render Core DAO chart - missing ref or data")
      return
    }
    
    // Group data by protocol
    const protocolData: Record<string, any[]> = {}
    
    volumeData.forEach(item => {
      if (!protocolData[item.protocol]) {
        protocolData[item.protocol] = []
      }
      
      protocolData[item.protocol].push({
        date: item.date,
        volume: item.volume,
        cumulative: item.cumulative_volume
      })
    })
    
    // Prepare data for Plotly with Core DAO colors
    const traces = []
    const colors = [
      '#FF7700', // Core DAO primary orange
      '#FF9500', // Core DAO secondary orange
      '#FFB700', // Core DAO tertiary orange
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Amber
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#06B6D4', // Cyan
      '#F97316', // Orange
    ]
    
    let index = 0
    
    // Log data for debugging
    console.log("Core DAO Protocol data:", Object.keys(protocolData).map(key => ({
      protocol: key,
      dataPoints: protocolData[key].length
    })))
    
    for (const [protocol, data] of Object.entries(protocolData)) {
      const color = colors[index % colors.length]
      index++
      
      // Sort data by date
      data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      
      console.log(`Core DAO Protocol ${protocol} has ${data.length} data points`)
      
      const trace = {
        x: data.map(d => d.date),
        y: data.map(d => d.volume),
        type: 'bar',
        name: protocol,
        marker: {
          color: color,
        },
      }
      
      traces.push(trace)
    }
    
    // Chart layout
    const layout = {
      title: getChartTitle(),
      xaxis: {
        title: 'Date',
        type: 'date',
        rangeslider: { visible: false }
      },
      yaxis: {
        title: getYAxisTitle(),
        tickformat: '$,.0s',
        hoverformat: '$,.2f'
      },
      legend: {
        orientation: 'h',
        y: -0.2
      },
      hovermode: 'x unified',
      autosize: true,
      margin: {
        l: 60,
        r: 50,
        b: 60,
        t: 40,
        pad: 4
      },
      barmode: 'stack',
    }
    
    const config = {
      responsive: true,
      displayModeBar: true,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
      displaylogo: false
    }
    
    console.log("Rendering Core DAO Plotly chart with", traces.length, "traces")
    
    // Clear any existing chart
    if (chartRef.current) {
      chartRef.current.innerHTML = ''
    }
    
    try {
      window.Plotly.newPlot(chartRef.current, traces, layout, config)
      console.log("Core DAO chart rendered successfully")
    } catch (err) {
      console.error("Error rendering Core DAO chart:", err)
      
      // Display error message in the chart area
      if (chartRef.current) {
        chartRef.current.innerHTML = `
          <div class="h-full flex items-center justify-center text-red-500">
            Error rendering chart: ${err instanceof Error ? err.message : String(err)}
          </div>
        `
      }
    }
  }
  
  const getChartTitle = (): string => {
    return 'Core DAO DEX Trading Volume Over Time'
  }
  
  const getYAxisTitle = (): string => {
    return 'Volume (USD)'
  }
  
  // Toggle protocol selection
  const toggleProtocol = (protocol: string) => {
    if (selectedProtocols.includes(protocol)) {
      if (selectedProtocols.length > 1) {
        setSelectedProtocols(selectedProtocols.filter(p => p !== protocol))
      }
    } else {
      setSelectedProtocols([...selectedProtocols, protocol])
    }
  }
  
  // Handle CSV download
  const handleDownload = () => {
    if (volumeData.length === 0) return
    
    let csvContent = "data:text/csv;charset=utf-8,"
    
    // Add headers
    csvContent += "Date,Protocol,Volume,Cumulative Volume\n"
    
    // Add data rows
    volumeData.forEach(item => {
      csvContent += `${item.date},${item.protocol},${item.volume},${item.cumulative_volume}\n`
    })
    
    // Create download link
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `core_dao_dex_volumes_${timeRange}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  if (network.toLowerCase() !== "core") {
    return (
      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Core DAO DEX Trading Volume</h2>
        </div>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-gray-500">DEX volume data is only available for Core DAO.</div>
        </div>
      </div>
    )
  }
  
  if (protocolsLoading && allProtocols.length === 0) {
    return (
      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Core DAO DEX Trading Volume</h2>
        </div>
        <div className="h-[350px] flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading Core DAO DEX data...</div>
        </div>
      </div>
    )
  }
  
  if (error && allProtocols.length === 0) {
    return (
      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Core DAO DEX Trading Volume</h2>
        </div>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="border rounded-lg p-6">
      <div className="flex flex-wrap items-center justify-between mb-4">
        <h2 className="text-lg font-bold">{onlyTotal ? 'Total DEX Volume on Core DAO' : 'Core DAO DEX Trading Volume'}</h2>
        
        <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
          {/* Protocol Selector */}
          <Popover open={protocolsOpen} onOpenChange={setProtocolsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={protocolsOpen}
                className="min-w-[150px] justify-between text-xs"
                disabled={onlyTotal}
              >
                {selectedProtocols.length === 1
                  ? selectedProtocols[0]
                  : `${selectedProtocols.length} DEXes selected`}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            {!onlyTotal && (
              <PopoverContent className="w-[250px] p-0" align="end">
                <Command>
                  <CommandInput placeholder="Search DEXes..." />
                  <CommandEmpty>No DEXes found.</CommandEmpty>
                  <div className="border-t py-1.5 px-2 flex justify-between">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs h-7"
                      onClick={() => setSelectedProtocols(allProtocols.map(p => p.protocol))}
                    >
                      Select All
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => {
                        if (allProtocols.length > 0) {
                          setSelectedProtocols([allProtocols[0].protocol])
                        }
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                  <CommandGroup className="max-h-[200px] overflow-y-auto">
                    {allProtocols.map((protocol) => (
                      <CommandItem
                        key={protocol.protocol}
                        onSelect={() => toggleProtocol(protocol.protocol)}
                        className="flex items-center"
                      >
                        <div
                          className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            selectedProtocols.includes(protocol.protocol)
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50 [&_svg]:invisible"
                          )}
                        >
                          <Check className={cn("h-4 w-4")} />
                        </div>
                        <span className="flex-1 truncate">{protocol.protocol}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            )}
          </Popover>
          
          {/* Time Range Selector */}
          <div className="flex space-x-1">
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
              variant={timeRange === "90D" ? "default" : "outline"} 
              size="sm"
              onClick={() => setTimeRange("90D")}
              className="text-xs"
            >
              90D
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
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDownload}
            className="text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            CSV
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4 mb-4">
        <div className="h-[350px] relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                <div className="text-sm text-gray-500">Loading Core DAO DEX data...</div>
                <div className="text-xs text-gray-400">This may take a few moments</div>
              </div>
            </div>
          )}
          <div 
            ref={chartRef} 
            className="w-full h-full"
            data-selected-protocols={selectedProtocols.join(',')}
            data-time-range={timeRange}
          ></div>
        </div>
      </div>
    </div>
  )
} 