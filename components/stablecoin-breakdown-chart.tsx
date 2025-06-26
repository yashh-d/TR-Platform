"use client"

import { useState, useEffect } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { ChevronDown } from "lucide-react"
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

interface StablecoinRow {
  id: number;
  stablecoin_id: string;
  stablecoin_name: string;
  stablecoin_symbol: string;
  date: string;
  circulating_usd: number;
  bridged_usd: number;
  created_at: string;
}

interface StablecoinBreakdownChartProps {
  network: string;
}

// Color palette for stablecoins (matching RWA style)
const STABLECOIN_COLORS = [
  '#7b2ff2', '#f357a8', '#43e97b', '#38f9d7', '#fa8bff', '#ffecd2', '#a1c4fd', '#fbc2eb', '#fcb69f', '#ff8177',
  '#f7971e', '#ffd200', '#21d4fd', '#b721ff', '#00c6fb', '#f7797d', '#4e54c8', '#e1eec3', '#f857a6', '#ff5858',
  '#43cea2', '#185a9d', '#f953c6', '#b91d73', '#ff6a00', '#ee0979', '#ff512f'
];

export function StablecoinBreakdownChart({ network }: StablecoinBreakdownChartProps) {
  const [data, setData] = useState<StablecoinRow[]>([])
  const [fullDataset, setFullDataset] = useState<StablecoinRow[]>([]) // Cache for full dataset
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [stablecoins, setStablecoins] = useState<string[]>([])
  const [stablecoinNames, setStablecoinNames] = useState<Record<string, string>>({})
  const [selectedToken, setSelectedToken] = useState<string>('stacked')
  const [timeRange, setTimeRange] = useState('1Y') // Default to 1Y
  const [chartData, setChartData] = useState<any>({})

  // Get network-specific color
  const getNetworkColor = (network: string) => {
    switch (network.toLowerCase()) {
      case "bitcoin": return "#F7931A"
      case "ethereum": return "#627EEA"
      case "solana": return "#14F195"
      case "avalanche": return "#E84142"
      case "polygon": return "#8247E5"
      case "core": return "#FF7700"
      default: return "#3B82F6"
    }
  }

  // Get specific colors for major stablecoins
  const getStablecoinColor = (token: string, fallbackIndex: number) => {
    switch (token) {
      case 'USDT':
        return '#00D4AA' // Lighter green to match bottom charts
      case 'USDC':
        return '#2775CA' // USD Coin blue
      default:
        return STABLECOIN_COLORS[fallbackIndex % STABLECOIN_COLORS.length]
    }
  }

  // Filter cached data by time range
  const filterDataByTimeRange = (fullData: StablecoinRow[], range: string): StablecoinRow[] => {
    if (!fullData.length) return []
    
    const currentDate = new Date()
    let filterDate = new Date()
    
    switch (range) {
      case '7D':
        filterDate.setDate(currentDate.getDate() - 7)
        break
      case '30D':
        filterDate.setDate(currentDate.getDate() - 30)
        break
      case '3M':
        filterDate.setMonth(currentDate.getMonth() - 3)
        break
      case '6M':
        filterDate.setMonth(currentDate.getMonth() - 6)
        break
      case '1Y':
        filterDate = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), currentDate.getDate())
        break
      default:
        return fullData
    }
    
    const filterDateStr = filterDate.toISOString().slice(0, 10)
    return fullData.filter(row => row.date >= filterDateStr)
  }

  // Progressive data fetching function for 1Y
  const fetchDataProgressively = async (fromDate: Date): Promise<StablecoinRow[]> => {
    const allData: StablecoinRow[] = []
    let offset = 0
    const batchSize = 1000
    let hasMoreData = true
    let batchCount = 0

    while (hasMoreData) {
      setLoadingProgress(`Loading batch ${batchCount + 1}... (${allData.length} rows loaded)`)
      
      const { data: batch, error: supabaseError } = await supabase
        .from('avastables')
        .select('id, stablecoin_id, stablecoin_name, stablecoin_symbol, date, circulating_usd, bridged_usd, created_at')
        .gte('date', fromDate.toISOString().slice(0, 10))
        .order('date', { ascending: true })
        .range(offset, offset + batchSize - 1)

      if (supabaseError) throw supabaseError

      if (!batch || batch.length === 0) {
        hasMoreData = false
      } else {
        allData.push(...(batch as StablecoinRow[]))
        offset += batchSize
        batchCount++
        
        // Stop if we get less than the batch size (indicates end of data)
        if (batch.length < batchSize) {
          hasMoreData = false
        }
        
        // Safety limit to prevent infinite loops (adjust as needed)
        if (batchCount > 500) { // This would be 500,000 rows max
          console.warn('Reached safety limit for data fetching')
          hasMoreData = false
        }
      }
    }

    setLoadingProgress(`Completed loading ${allData.length} rows`)
    return allData
  }

  // Fetch data from avastables with intelligent caching
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
    
    async function fetchStablecoinData() {
      try {
        setLoading(true)
        setLoadingProgress("")
        
        // Check if we can use cached data
        if (fullDataset.length > 0) {
          setLoadingProgress("Using cached data...")
          const filteredData = filterDataByTimeRange(fullDataset, timeRange)
          setData(filteredData)
          setLoading(false)
          setLoadingProgress("")
          return
        }
        
        // Determine what data we need to fetch
        let fromDate = new Date()
        let needsProgressiveLoading = false
        
        switch (timeRange) {
          case '7D':
            fromDate.setDate(fromDate.getDate() - 7)
            break
          case '30D':
            fromDate.setDate(fromDate.getDate() - 30)
            needsProgressiveLoading = true
            break
          case '3M':
            fromDate.setMonth(fromDate.getMonth() - 3)
            needsProgressiveLoading = true
            break
          case '6M':
            fromDate.setMonth(fromDate.getMonth() - 6)
            needsProgressiveLoading = true
            break
          case '1Y':
            fromDate = new Date(fromDate.getFullYear() - 1, fromDate.getMonth(), fromDate.getDate())
            needsProgressiveLoading = true
            break
        }
        
        let rows: StablecoinRow[] = []
        
        if (needsProgressiveLoading) {
          // For longer time ranges, fetch the full 1Y dataset and cache it
          const oneYearAgo = new Date()
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
          
          setLoadingProgress("Loading full dataset for caching...")
          const fullData = await fetchDataProgressively(oneYearAgo)
          
          // Cache the full dataset
          setFullDataset(fullData)
          
          // Filter for the requested time range
          rows = filterDataByTimeRange(fullData, timeRange)
        } else {
          // Use regular single query only for 7D
          const { data: queryResult, error: supabaseError } = await supabase
            .from('avastables')
            .select('id, stablecoin_id, stablecoin_name, stablecoin_symbol, date, circulating_usd, bridged_usd, created_at')
            .gte('date', fromDate.toISOString().slice(0, 10))
            .order('date', { ascending: true })
            .limit(1000) // Only for 7D
          
          if (supabaseError) throw supabaseError
          rows = queryResult || []
        }
        
        setData(rows)
        
        // Get unique stablecoins from the data
        const uniqueSymbols = Array.from(new Set(rows.map((row: StablecoinRow) => row.stablecoin_symbol)))
        setStablecoins(uniqueSymbols)
        
        // Map symbol to name
        const nameMap: Record<string, string> = {}
        for (const row of rows) {
          nameMap[row.stablecoin_symbol] = row.stablecoin_name
        }
        setStablecoinNames(nameMap)
        setError(null)
        setLoadingProgress("")
      } catch (err) {
        console.error('Error fetching stablecoin data:', err)
        setError('Failed to load stablecoin data')
        setLoadingProgress("")
      } finally {
        setLoading(false)
      }
    }
    
    fetchStablecoinData()
  }, [network, timeRange, fullDataset.length])

  // Process data for the chart whenever raw data changes
  useEffect(() => {
    if (!data || data.length === 0) return
    
    // Get all unique dates
    const dates = Array.from(new Set(data.map(row => row.date))).sort()
    
    // Filter stablecoins that have data
    const tokensWithData = stablecoins.filter(token => {
      return data.some(row => row.stablecoin_symbol === token && Number(row.circulating_usd) > 0)
    })
    
    // --- Stacked chart logic ---
    if (selectedToken === 'stacked') {
      // For each token with data, build a trace
      const traces = tokensWithData.map((token, idx) => {
        // Only include dates where this token has actual data (no zero padding)
        const tokenData = data.filter(r => r.stablecoin_symbol === token && Number(r.circulating_usd) > 0)
        const x = tokenData.map(row => row.date)
        const y = tokenData.map(row => Number(row.circulating_usd))
        
        // Use symbol for USDT and USDC, full name for others
        const displayName = (token === 'USDT' || token === 'USDC') ? token : (stablecoinNames[token] || token)
        
        return {
          x,
          y,
          name: displayName,
          type: 'scatter',
          mode: 'lines',
          stackgroup: 'one',
          fill: 'tonexty',
          line: { color: getStablecoinColor(token, idx), width: 2 },
          hovertemplate: '%{fullData.name}: $%{y:,.2f}<extra></extra>',
        }
      })
      
      const layout = {
        title: 'Avalanche Stablecoin Breakdown: Stacked by Token',
        xaxis: { title: 'Date', type: 'date', showgrid: true, gridcolor: '#e5e5e5' },
        yaxis: {
          showgrid: true, gridcolor: '#e5e5e5',
          tickprefix: '$', tickformat: '.2s', hoverformat: ',.2f',
          tickfont: { family: 'Arial, sans-serif', size: 12 }
        },
        showlegend: true,
        legend: { 
          orientation: 'h',
          y: -0.3,
          x: 0.5,
          xanchor: 'center'
        },
        margin: { l: 60, r: 50, t: 50, b: 120 },
        plot_bgcolor: 'white', paper_bgcolor: 'white',
        autosize: true,
        hovermode: 'x unified'
      }
      setChartData({ data: traces, layout, config: { responsive: true, displayModeBar: false } })
      return
    }
    
    // --- All Tokens (sum) or single token ---
    if (selectedToken === 'all') {
      // For "all" view, we need to sum all tokens for each date
      const amounts: number[] = []
      const validDates: string[] = []
      
      dates.forEach(date => {
        let sum = 0
        let hasData = false
        for (const token of tokensWithData) {
          const row = data.find(r => r.date === date && r.stablecoin_symbol === token)
          if (row && Number(row.circulating_usd) > 0) {
            sum += Number(row.circulating_usd)
            hasData = true
          }
        }
        if (hasData) {
          amounts.push(sum)
          validDates.push(date)
        }
      })
      
      const trace = {
        type: 'scatter',
        mode: 'lines',
        name: 'All Stablecoins',
        x: validDates,
        y: amounts,
        line: { color: getNetworkColor(network), width: 2 },
        fill: 'tozeroy',
        hovertemplate: '%{fullData.name}: $%{y:,.2f}<extra></extra>',
      }
      
      const layout = {
        title: 'Avalanche Stablecoin Breakdown: All Stablecoins',
        xaxis: { title: 'Date', type: 'date', showgrid: true, gridcolor: '#e5e5e5' },
        yaxis: {
          showgrid: true, gridcolor: '#e5e5e5',
          tickprefix: '$', tickformat: '.2s', hoverformat: ',.2f',
          tickfont: { family: 'Arial, sans-serif', size: 12 }
        },
        showlegend: true,
        legend: { 
          orientation: 'h',
          y: -0.3,
          x: 0.5,
          xanchor: 'center'
        },
        margin: { l: 60, r: 50, t: 50, b: 120 },
        plot_bgcolor: 'white', paper_bgcolor: 'white',
        autosize: true,
        hovermode: 'x unified'
      }
      setChartData({ data: [trace], layout, config: { responsive: true, displayModeBar: false } })
    } else {
      // Single token view - only show dates where this token has data
      const tokenData = data.filter(r => r.stablecoin_symbol === selectedToken && Number(r.circulating_usd) > 0)
      const x = tokenData.map(row => row.date)
      const y = tokenData.map(row => Number(row.circulating_usd))
      
      // Use symbol for USDT and USDC, full name for others
      const displayName = (selectedToken === 'USDT' || selectedToken === 'USDC') ? selectedToken : (stablecoinNames[selectedToken] || selectedToken)
      
      const trace = {
        type: 'scatter',
        mode: 'lines',
        name: displayName,
        x,
        y,
        line: { color: getStablecoinColor(selectedToken, 0), width: 2 },
        fill: 'tozeroy',
        hovertemplate: '%{fullData.name}: $%{y:,.2f}<extra></extra>',
      }
      
      const layout = {
        title: `Avalanche Stablecoin Breakdown: ${displayName}`,
        xaxis: { title: 'Date', type: 'date', showgrid: true, gridcolor: '#e5e5e5' },
        yaxis: {
          showgrid: true, gridcolor: '#e5e5e5',
          tickprefix: '$', tickformat: '.2s', hoverformat: ',.2f',
          tickfont: { family: 'Arial, sans-serif', size: 12 }
        },
        showlegend: true,
        legend: { 
          orientation: 'h',
          y: -0.3,
          x: 0.5,
          xanchor: 'center'
        },
        margin: { l: 60, r: 50, t: 50, b: 120 },
        plot_bgcolor: 'white', paper_bgcolor: 'white',
        autosize: true,
        hovermode: 'x unified'
      }
      setChartData({ data: [trace], layout, config: { responsive: true, displayModeBar: false } })
    }
  }, [data, selectedToken, network, stablecoins, stablecoinNames])

  if (network.toLowerCase() !== "avalanche") {
    return (
      <div className="border rounded-lg p-6 text-center text-gray-500">
        <p>Stablecoin breakdown is currently only available for Avalanche.</p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h3 className="text-lg font-semibold">Avalanche Stablecoin Breakdown</h3>
        <div className="flex flex-wrap gap-2">
          {/* Token selector */}
          <Select value={selectedToken} onValueChange={setSelectedToken}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Stablecoin" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Stablecoins</SelectLabel>
                <SelectItem value="stacked">Stacked</SelectItem>
                <SelectItem value="all">All Stablecoins</SelectItem>
                {stablecoins
                  .filter(token => {
                    // Only show tokens that have non-zero values in the dataset
                    return data.some(row => row.stablecoin_symbol === token && Number(row.circulating_usd) > 0)
                  })
                  .map(token => {
                    // Use symbol for USDT and USDC, full name for others
                    const displayName = (token === 'USDT' || token === 'USDC') ? token : (stablecoinNames[token] || token)
                    return (
                      <SelectItem key={token} value={token}>
                        {displayName}
                      </SelectItem>
                    )
                  })}
              </SelectGroup>
            </SelectContent>
          </Select>
          {/* Time range selector */}
          <div className="flex items-center space-x-1">
            {['7D', '30D', '3M', '6M', '1Y'].map((range) => (
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
        </div>
      </div>
      {/* Loading indicator for data */}
      {loading && (
        <div className="h-[400px] w-full flex items-center justify-center">
          <div className="animate-pulse space-y-4">
            <div className="text-center">
              {loadingProgress || "Loading stablecoin data..."}
            </div>
          </div>
        </div>
      )}
      {/* Error */}
      {error && (
        <div className="h-[400px] w-full flex items-center justify-center text-red-500">{error}</div>
      )}
      {/* Chart */}
      {!loading && !error && data && data.length > 0 && (
        <div className="h-[500px] w-full">
          {Object.keys(chartData).length > 0 && (
            <div id="stablecoin-breakdown-chart" className="h-full w-full">
              {typeof window !== 'undefined' && (
                <div
                  ref={(el) => {
                    if (el && typeof window !== 'undefined') {
                      // @ts-ignore
                      if (window.Plotly) {
                        // @ts-ignore
                        window.Plotly.newPlot(el, chartData.data, chartData.layout, chartData.config).then(() => {
                          // Replace any "G" with "B" in the Y-axis tick labels
                          if (el) {
                            const yTicks = el.querySelectorAll('.ytick text')
                            yTicks.forEach((tick: any) => {
                              if (tick.textContent && tick.textContent.includes('G')) {
                                tick.textContent = tick.textContent.replace(/G/g, 'B')
                              }
                            })
                          }
                        })
                      } else {
                        const script = document.createElement('script')
                        script.src = 'https://cdn.plot.ly/plotly-latest.min.js'
                        script.onload = () => {
                          // @ts-ignore
                          window.Plotly.newPlot(el, chartData.data, chartData.layout, chartData.config).then(() => {
                            // Replace any "G" with "B" in the Y-axis tick labels
                            if (el) {
                              const yTicks = el.querySelectorAll('.ytick text')
                              yTicks.forEach((tick: any) => {
                                if (tick.textContent && tick.textContent.includes('G')) {
                                  tick.textContent = tick.textContent.replace(/G/g, 'B')
                                }
                              })
                            }
                          })
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