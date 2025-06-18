"use client"

import { useState, useEffect, useRef } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Download, ChevronDown, Check } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { DexVolumeDebug } from "@/components/dex-volume-debug"
import { Card } from "@/components/ui/card"

interface DexVolumeChartProps {
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

export function TotalDexVolumeBarChart({ network, maxHeight = "500px", onlyTotal = false }: DexVolumeChartProps) {
  const [volumeData, setVolumeData] = useState<VolumeData[]>([])
  const [allProtocols, setAllProtocols] = useState<DexProtocol[]>([])
  const [loading, setLoading] = useState(true)
  const [protocolsLoading, setProtocolsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<string>("30D")
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>([])
  const [protocolsOpen, setProtocolsOpen] = useState(false)
  const [showDebug, setShowDebug] = useState<boolean>(false)
  const chartRef = useRef<HTMLDivElement>(null)
  
  // Fetch all available protocols
  useEffect(() => {
    if (network.toLowerCase() !== "avalanche") {
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
        console.log("Fetching all DEX protocols...")
        const startTime = performance.now()
        
        // First try the RPC function
        const { data, error: fetchError } = await supabase
          .rpc('get_distinct_dexs')
        
        const endTime = performance.now()
        console.log(`RPC call took ${(endTime - startTime).toFixed(2)}ms`)
        
        if (fetchError) {
          console.error("RPC function error details:", {
            message: fetchError.message,
            details: fetchError.details,
            hint: fetchError.hint,
            code: fetchError.code
          })
          
          // Fallback to direct query if the RPC fails
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('avalanche_dex_volumes')
            .select('protocol')
            .order('volume', { ascending: false })
          
          if (fallbackError) throw fallbackError
          
          if (fallbackData) {
            // Get unique protocols
            const uniqueProtocols = [...new Set(fallbackData.map(item => item.protocol))]
              .filter(Boolean)
            
            // Create simplified protocol objects
            const protocols = uniqueProtocols.map(protocol => ({
              protocol,
              total_volume: 0,
              last_updated: new Date().toISOString().split('T')[0]
            }))
            
            setAllProtocols(protocols)
            
            // If onlyTotal, select only 'total', else top 5
            if (selectedProtocols.length === 0 && protocols.length > 0) {
              if (onlyTotal && protocols.some((p: any) => p.protocol === 'total')) {
                setSelectedProtocols(['total'])
              } else {
                setSelectedProtocols(protocols.slice(0, 5).map((p: any) => p.protocol))
              }
            }
          }
        } else if (data) {
          console.log(`Found ${data.length} DEX protocols`)
          setAllProtocols(data as DexProtocol[])
          
          // If onlyTotal, select only 'total', else top 5
          if (selectedProtocols.length === 0 && data.length > 0) {
            if (onlyTotal && (data as DexProtocol[]).some((p: any) => p.protocol === 'total')) {
              setSelectedProtocols(['total'])
            } else {
              setSelectedProtocols(data.slice(0, 5).map((p: any) => p.protocol))
            }
          }
        }
      } catch (err) {
        console.error('Error fetching DEX protocols:', err)
        setError('Failed to load DEX protocols')
      } finally {
        setProtocolsLoading(false)
      }
    }
    
    fetchAllProtocols()
  }, [network, onlyTotal])
  
  // Fetch volume data based on selected protocols and time range
  useEffect(() => {
    if (network.toLowerCase() !== "avalanche" || selectedProtocols.length === 0) {
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
        console.log(`Fetching volume data for ${selectedProtocols.length} protocols...`)
        const startTime = performance.now()
        
        // First, test the database connection
        const { data: testData, error: testError } = await supabase
          .from('avalanche_dex_volumes')
          .select('*')
          .limit(1)

        if (testError) {
          console.error("Database connection test failed:", testError)
          throw new Error("Database connection failed")
        }

        console.log("Database connection test successful")
        
        const endDate = new Date().toISOString().split('T')[0]
        let startDate = new Date()
        let interval = 'day'
        
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
            interval = 'day'
            break
          case '180D':
            startDate.setDate(startDate.getDate() - 180)
            interval = 'week'
            break
          case '1Y':
            startDate.setFullYear(startDate.getFullYear() - 1)
            interval = 'week'
            break
          case 'ALL':
            startDate = new Date(2020, 0, 1) // Start from 2020
            interval = 'month'
            break
        }
        
        console.log("RPC parameters:", {
          protocols: selectedProtocols,
          startDate: startDate.toISOString().split('T')[0],
          endDate,
          interval
        })
        
        // Function to make RPC call with timeout
        const makeRPCCall = async (retryCount = 0) => {
          const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('RPC call timeout')), 30000) // 30 second timeout
          );

          const rpcCall = supabase
            .rpc('get_dex_volumes_data', {
              p_protocols: selectedProtocols,
              p_start_date: startDate.toISOString().split('T')[0],
              p_end_date: endDate,
              p_interval: interval
            });

          try {
            const result = await Promise.race([rpcCall, timeout]);
            return result;
          } catch (error) {
            if (retryCount < 2) { // Retry up to 2 times
              console.log(`RPC call failed, retrying (${retryCount + 1}/2)...`);
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
              return makeRPCCall(retryCount + 1);
            }
            throw error;
          }
        };
        
        // Try the RPC function with retry mechanism
        const result = await makeRPCCall() as any;
        const data = result.data;
        const fetchError = result.error;
        
        const endTime = performance.now()
        console.log(`Volume data RPC call took ${(endTime - startTime).toFixed(2)}ms`)
        
        if (fetchError) {
          console.error("Error using RPC function details:", {
            message: fetchError.message,
            details: fetchError.details,
            hint: fetchError.hint,
            code: fetchError.code,
            params: {
              protocols: selectedProtocols,
              startDate: startDate.toISOString().split('T')[0],
              endDate,
              interval
            }
          })

          // Try a direct query to see if we can get any data
          console.log("Attempting direct query as fallback...")
          const { data: directData, error: directError } = await supabase
            .from('avalanche_dex_volumes')
            .select('date, protocol, volume')
            .in('protocol', selectedProtocols)
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', endDate)
            .order('date', { ascending: true })
          
          if (directError) {
            console.error("Direct query also failed:", directError)
            throw directError
          }
          
          if (directData) {
            console.log(`Direct query successful, got ${directData.length} records`)
            // Process the data to calculate cumulative volumes
            const processedData: VolumeData[] = []
            const cumulativeByProtocol: Record<string, number> = {}
            
            directData.forEach(item => {
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
        } else if (data) {
          console.log(`RPC call successful, retrieved ${data.length} data points`)
          // Process data to ensure all values are numbers
          const processedData = data.map((item: any) => ({
            date: item.date,
            protocol: item.protocol,
            volume: Number(item.volume),
            cumulative_volume: Number(item.cumulative_volume)
          }))
          
          setVolumeData(processedData)
          setError(null)
        }
      } catch (err) {
        console.error('Error fetching volume data:', err)
        setError('Failed to load volume data. Please try again later.')
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
        console.log("Rendering chart with", volumeData.length, "data points")
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
  
  // Render the appropriate chart based on chartType
  const renderChart = () => {
    if (!chartRef.current || volumeData.length === 0) {
      console.log("Cannot render chart - missing ref or data")
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
    
    // Prepare data for Plotly
    const traces = []
    const colors = [
      '#E84142', // Avalanche red
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Amber
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#06B6D4', // Cyan
      '#F97316', // Orange
      '#6366F1', // Indigo
      '#14B8A6', // Teal
    ]
    
    let index = 0
    
    // Log data for debugging
    console.log("Protocol data:", Object.keys(protocolData).map(key => ({
      protocol: key,
      dataPoints: protocolData[key].length
    })))
    
    for (const [protocol, data] of Object.entries(protocolData)) {
      const color = colors[index % colors.length]
      index++
      
      // Sort data by date
      data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      
      console.log(`Protocol ${protocol} has ${data.length} data points`)
      
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
    
    console.log("Rendering Plotly chart with", traces.length, "traces")
    
    // Clear any existing chart
    if (chartRef.current) {
      chartRef.current.innerHTML = ''
    }
    
    try {
      window.Plotly.newPlot(chartRef.current, traces, layout, config)
      console.log("Chart rendered successfully")
    } catch (err) {
      console.error("Error rendering chart:", err)
      
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
    return 'DEX Trading Volume Over Time'
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
    link.setAttribute("download", `avalanche_dex_volumes_${timeRange}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  if (network.toLowerCase() !== "avalanche") {
    return (
      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">DEX Trading Volume</h2>
        </div>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-gray-500">DEX volume data is only available for Avalanche.</div>
        </div>
      </div>
    )
  }
  
  if (protocolsLoading && allProtocols.length === 0) {
    return (
      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">DEX Trading Volume</h2>
        </div>
        <div className="h-[350px] flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading DEX data...</div>
        </div>
      </div>
    )
  }
  
  if (error && allProtocols.length === 0) {
    return (
      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">DEX Trading Volume</h2>
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
        <h2 className="text-lg font-bold">{onlyTotal ? 'Total DEX Volume on Avalanche' : 'DEX Trading Volume'}</h2>
        
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
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowDebug(!showDebug)}
            className="text-xs"
          >
            {showDebug ? "Hide Debug" : "Debug"}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4 mb-4">
        <div className="h-[350px] relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                <div className="text-sm text-gray-500">Loading DEX data...</div>
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
      
      {/* Selected Protocols Summary (hide if onlyTotal) */}
      {!onlyTotal && selectedProtocols.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2">Selected DEXes</h3>
          <div className="flex flex-wrap gap-2">
            {selectedProtocols.map(protocol => {
              const protocolInfo = allProtocols.find(p => p.protocol === protocol)
              return (
                <Card key={protocol} className="p-2 text-xs flex items-center">
                  <span className="font-medium">{protocol}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-1 h-5 w-5 p-0"
                    onClick={() => toggleProtocol(protocol)}
                  >
                    ×
                  </Button>
                </Card>
              )
            })}
          </div>
        </div>
      )}
      
      {showDebug && (
        <div className="mt-4">
          <DexVolumeDebug />
        </div>
      )}
    </div>
  )
} 