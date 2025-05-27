"use client"

import { useState, useEffect } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { ChevronDown, Download } from "lucide-react"
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

interface RWAData {
  amount: number | null;
  protocol: string | null;
  time: string | null;
  token_name: string | null;
  total_supply: number | null;
}

interface RWAMetricsChartProps {
  network: string;
}

export function RWAMetricsChart({ network }: RWAMetricsChartProps) {
  const [data, setData] = useState<RWAData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tokens, setTokens] = useState<string[]>([])
  const [protocols, setProtocols] = useState<string[]>([])
  const [selectedToken, setSelectedToken] = useState<string>('all')
  const [selectedProtocol, setSelectedProtocol] = useState<string>('all')
  const [timeRange, setTimeRange] = useState('1Y') // Default to 1 year
  const [chartData, setChartData] = useState<any>({})
  const [tokensLoading, setTokensLoading] = useState(true)
  const [protocolsLoading, setProtocolsLoading] = useState(true)

  // Get network-specific color
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
  
  // Fetch token names using RPC function
  useEffect(() => {
    if (network.toLowerCase() !== "avalanche") {
      setTokensLoading(false)
      return
    }
    
    if (!isSupabaseConfigured()) {
      setError("Supabase not configured properly")
      setTokensLoading(false)
      return
    }
    
    async function fetchTokenNames() {
      try {
        setTokensLoading(true)
        
        // Call the RPC function
        const { data, error } = await supabase.rpc('get_rwa_token_names')
        
        if (error) throw error
        
        // Extract the token names
        const tokenNames = data.map(item => item.token_name)
        setTokens(tokenNames)
      } catch (err) {
        console.error('Error fetching token names:', err)
        setError('Failed to load token options')
      } finally {
        setTokensLoading(false)
      }
    }
    
    fetchTokenNames()
  }, [network])
  
  // Fetch protocol names using RPC function
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
    
    async function fetchProtocols() {
      try {
        setProtocolsLoading(true)
        
        // Call the RPC function
        const { data, error } = await supabase.rpc('get_rwa_protocols')
        
        if (error) throw error
        
        // Extract the protocol names
        const protocolNames = data.map(item => item.protocol)
        setProtocols(protocolNames)
      } catch (err) {
        console.error('Error fetching protocols:', err)
        setError('Failed to load protocol options')
      } finally {
        setProtocolsLoading(false)
      }
    }
    
    fetchProtocols()
  }, [network])
  
  // Fetch data based on selections
  useEffect(() => {
    if (network.toLowerCase() !== "avalanche") {
      setLoading(false)
      return
    }
    
    if (!isSupabaseConfigured()) {
      setError("Supabase not configured properly")
      setLoading(false)
      return
    }
    
    async function fetchRWAData() {
      try {
        setLoading(true)
        
        let query = supabase.from('ava_rwa').select('*')
        
        // Apply token filter if not 'all'
        if (selectedToken !== 'all') {
          query = query.eq('token_name', selectedToken)
        }
        
        // Apply protocol filter if not 'all'
        if (selectedProtocol !== 'all') {
          query = query.eq('protocol', selectedProtocol)
        }
        
        // Filter based on time range
        if (timeRange === '1Y') {
          const oneYearAgo = new Date()
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
          query = query.gte('time', oneYearAgo.toISOString())
        } else if (timeRange === '6M') {
          const sixMonthsAgo = new Date()
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
          query = query.gte('time', sixMonthsAgo.toISOString())
        } else if (timeRange === '3M') {
          const threeMonthsAgo = new Date()
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
          query = query.gte('time', threeMonthsAgo.toISOString())
        } else if (timeRange === '1M') {
          const oneMonthAgo = new Date()
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
          query = query.gte('time', oneMonthAgo.toISOString())
        }
        
        // Order by time
        query = query.order('time', { ascending: true })
        
        const { data: rwaData, error: supabaseError } = await query
        
        if (supabaseError) {
          throw supabaseError
        }
        
        setData(rwaData as RWAData[])
        setError(null)
      } catch (err) {
        console.error('Error fetching RWA data:', err)
        setError('Failed to load RWA data')
      } finally {
        setLoading(false)
      }
    }
    
    fetchRWAData()
  }, [network, timeRange, selectedToken, selectedProtocol])
  
  // Process data for the chart whenever raw data changes
  useEffect(() => {
    if (!data || data.length === 0) return
    
    // Process data for the chart
    const processedData = processDataForChart(data)
    setChartData(processedData)
  }, [data])
  
  // Process data for Plotly chart
  function processDataForChart(rawData: RWAData[]) {
    // For multiple tokens or protocols, we'll group by time and sum amounts
    // Create a map of time -> amount
    const timeValueMap = new Map<string, number>()
    
    rawData.forEach(item => {
      if (!item.time || item.amount === null) return
      
      const time = item.time
      const amount = item.amount
      
      if (timeValueMap.has(time)) {
        timeValueMap.set(time, timeValueMap.get(time)! + amount)
      } else {
        timeValueMap.set(time, amount)
      }
    })
    
    // Convert to arrays for Plotly
    const times = Array.from(timeValueMap.keys()).sort()
    const amounts = times.map(time => timeValueMap.get(time) || 0)
    
    // Create the trace
    const trace = {
      type: 'scatter',
      mode: 'lines',
      name: selectedToken !== 'all' ? selectedToken : 'All Tokens',
      x: times,
      y: amounts,
      line: {
        color: getNetworkColor(network),
        width: 2
      }
    }
    
    // Create layout with formatted y-axis
    const layout = {
      title: `RWA Metrics: ${selectedToken !== 'all' ? selectedToken : 'All Tokens'} 
              ${selectedProtocol !== 'all' ? `on ${selectedProtocol}` : ''}`,
      xaxis: {
        title: 'Time',
        type: 'date',
        showgrid: true,
        gridcolor: '#e5e5e5'
      },
      yaxis: {
        title: 'Amount (USD)',
        showgrid: true,
        gridcolor: '#e5e5e5',
        tickprefix: '$',
        tickformat: '.2s', // Format with SI prefix (K, M, B)
        hoverformat: ',.2f', // Format with commas and 2 decimal places on hover
        tickfont: {
          family: 'Arial, sans-serif',
          size: 12
        }
      },
      showlegend: true,
      legend: {
        x: 0,
        y: 1.1,
        orientation: 'h'
      },
      margin: {
        l: 70, // Increased left margin to accommodate dollar signs
        r: 50,
        t: 50,
        b: 50
      },
      plot_bgcolor: 'white',
      paper_bgcolor: 'white'
    }
    
    return {
      data: [trace],
      layout: layout,
      config: {
        responsive: true,
        displayModeBar: false
      }
    }
  }
  
  // Handle download functionality
  const handleDownload = () => {
    if (!data || data.length === 0) return
    
    const csv = [
      ['Time', 'Token Name', 'Protocol', 'Amount', 'Total Supply'].join(','),
      ...data.map(row => 
        [
          row.time || '',
          `"${row.token_name || ''}"`,
          `"${row.protocol || ''}"`,
          row.amount || 0,
          row.total_supply || 0
        ].join(',')
      )
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `avalanche_rwa_data_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  if (network.toLowerCase() !== "avalanche") {
    return (
      <div className="border rounded-lg p-6 text-center text-gray-500">
        <p>RWA metrics are currently only available for Avalanche.</p>
      </div>
    )
  }
  
  return (
    <div className="border rounded-lg p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h3 className="text-lg font-semibold">RWA Metrics</h3>
        
        <div className="flex flex-wrap gap-2">
          {/* Token selector */}
          <Select value={selectedToken} onValueChange={setSelectedToken} disabled={tokensLoading}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={tokensLoading ? "Loading tokens..." : "Select Token"} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Tokens</SelectLabel>
                <SelectItem value="all">All Tokens</SelectItem>
                {tokens.map(token => (
                  <SelectItem key={token} value={token}>
                    {token}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          
          {/* Protocol selector */}
          <Select value={selectedProtocol} onValueChange={setSelectedProtocol} disabled={protocolsLoading}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={protocolsLoading ? "Loading protocols..." : "Select Protocol"} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Protocols</SelectLabel>
                <SelectItem value="all">All Protocols</SelectItem>
                {protocols.map(protocol => (
                  <SelectItem key={protocol} value={protocol}>
                    {protocol}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          
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
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={loading || !data.length}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        </div>
      </div>
      
      {/* Loading indicator for data */}
      {loading && (
        <div className="h-[400px] w-full flex items-center justify-center">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {error && !loading && (
        <div className="h-[400px] w-full flex items-center justify-center">
          <div className="text-center text-red-500">
            <p>{error}</p>
          </div>
        </div>
      )}
      
      {/* No data message */}
      {!loading && !error && (!data || data.length === 0) && (
        <div className="h-[400px] w-full flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p>No data available for the selected filters.</p>
          </div>
        </div>
      )}
      
      {/* Chart container */}
      {!loading && !error && data && data.length > 0 && (
        <div className="h-[400px] w-full">
          {Object.keys(chartData).length > 0 && (
            <div id="rwa-chart" className="h-full w-full">
              {/* We'll use Plotly to render the chart client-side */}
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
          )}
        </div>
      )}
    </div>
  )
} 