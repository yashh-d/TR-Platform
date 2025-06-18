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
import { Card } from "@/components/ui/card"

interface StablecoinBreakdownChartProps {
  network: string;
}

interface StablecoinRow {
  date: string;
  stablecoin_id: string;
  stablecoin_name: string;
  stablecoin_symbol: string;
  circulating_usd: number;
}

const COLOR_PALETTE = [
  '#E84142', '#2775CA', '#26A17B', '#F7931A', '#8247E5', '#FFB700', '#8B5CF6', '#43e97b', '#f357a8', '#FFD700',
  '#b721ff', '#00c6fb', '#f7797d', '#4e54c8', '#e1eec3', '#f857a6', '#ff5858', '#43cea2', '#185a9d', '#f953c6',
]

export function StablecoinBreakdownChart({ network }: StablecoinBreakdownChartProps) {
  const [data, setData] = useState<StablecoinRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stablecoins, setStablecoins] = useState<string[]>([])
  const [stablecoinNames, setStablecoinNames] = useState<Record<string, string>>({})
  const [selectedToken, setSelectedToken] = useState<string>('stacked')
  const [timeRange, setTimeRange] = useState('1Y')
  const [chartData, setChartData] = useState<any>({})

  // Fetch data from avastables
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
        // Build time filter
        let fromDate = new Date()
        if (timeRange === '1Y') fromDate.setFullYear(fromDate.getFullYear() - 1)
        else if (timeRange === '6M') fromDate.setMonth(fromDate.getMonth() - 6)
        else if (timeRange === '3M') fromDate.setMonth(fromDate.getMonth() - 3)
        else if (timeRange === '1M') fromDate.setMonth(fromDate.getMonth() - 1)
        const { data: rows, error: supabaseError } = await supabase
          .from('avastables')
          .select('date, stablecoin_id, stablecoin_name, stablecoin_symbol, circulating_usd')
          .gte('date', fromDate.toISOString().slice(0, 10))
          .order('date', { ascending: true })
        if (supabaseError) throw supabaseError
        setData(rows || [])
        // Get unique stablecoins
        const uniqueSymbols = Array.from(new Set((rows || []).map((row: StablecoinRow) => row.stablecoin_symbol)))
        setStablecoins(uniqueSymbols)
        // Map symbol to name
        const nameMap: Record<string, string> = {}
        for (const row of rows || []) {
          nameMap[row.stablecoin_symbol] = row.stablecoin_name
        }
        setStablecoinNames(nameMap)
        setError(null)
      } catch (err) {
        setError('Failed to load stablecoin data')
      } finally {
        setLoading(false)
      }
    }
    fetchStablecoinData()
  }, [network, timeRange])

  // Process data for the chart whenever raw data changes
  useEffect(() => {
    if (!data || data.length === 0) return
    // Get all unique dates
    const dates = Array.from(new Set(data.map(row => row.date))).sort()
    // Get all unique stablecoins
    const tokens = stablecoins
    // --- Stacked chart logic ---
    if (selectedToken === 'stacked') {
      // For each token, build a trace
      const traces = tokens.map((token, idx) => {
        const y = dates.map(date => {
          const row = data.find(r => r.date === date && r.stablecoin_symbol === token)
          return row ? Number(row.circulating_usd) : 0
        })
        return {
          x: dates,
          y,
          name: stablecoinNames[token] || token,
          type: 'scatter',
          mode: 'lines',
          stackgroup: 'one',
          fill: 'tonexty',
          line: { color: COLOR_PALETTE[idx % COLOR_PALETTE.length], width: 2 },
          hovertemplate: '%{fullData.name} : $%{y:,.2f}<extra></extra>',
        }
      })
      const layout = {
        title: 'Stablecoin Breakdown: Stacked by Token',
        xaxis: { title: 'Date', type: 'date', showgrid: true, gridcolor: '#e5e5e5' },
        yaxis: {
          title: 'Circulating (USD)', showgrid: true, gridcolor: '#e5e5e5',
          tickprefix: '$', tickformat: '.2s', hoverformat: ',.2f',
          tickfont: { family: 'Arial, sans-serif', size: 12 }
        },
        showlegend: true,
        legend: { x: 0, y: 1.1, orientation: 'h' },
        margin: { l: 70, r: 50, t: 50, b: 50 },
        plot_bgcolor: 'white', paper_bgcolor: 'white',
        hovermode: 'x unified',
      }
      setChartData({ data: traces, layout, config: { responsive: true, displayModeBar: false } })
      return
    }
    // --- Single token only ---
    const amounts: number[] = []
    dates.forEach(date => {
      const row = data.find(r => r.date === date && r.stablecoin_symbol === selectedToken)
      amounts.push(row ? Number(row.circulating_usd) : 0)
    })
    const trace = {
      type: 'scatter',
      mode: 'lines',
      name: stablecoinNames[selectedToken] || selectedToken,
      x: dates,
      y: amounts,
      line: { color: '#E84142', width: 2 },
      fill: 'tozeroy',
      hovertemplate: '%{fullData.name} : $%{y:,.2f}<extra></extra>',
    }
    const layout = {
      title: `Stablecoin Breakdown: ${stablecoinNames[selectedToken] || selectedToken}`,
      xaxis: { title: 'Date', type: 'date', showgrid: true, gridcolor: '#e5e5e5' },
      yaxis: {
        title: 'Circulating (USD)', showgrid: true, gridcolor: '#e5e5e5',
        tickprefix: '$', tickformat: '.2s', hoverformat: ',.2f',
        tickfont: { family: 'Arial, sans-serif', size: 12 }
      },
      showlegend: true,
      legend: { x: 0, y: 1.1, orientation: 'h' },
      margin: { l: 70, r: 50, t: 50, b: 50 },
      plot_bgcolor: 'white', paper_bgcolor: 'white',
      hovermode: 'x unified',
    }
    setChartData({ data: [trace], layout, config: { responsive: true, displayModeBar: false } })
  }, [data, selectedToken, stablecoins, stablecoinNames])

  // Download CSV
  const handleDownload = () => {
    if (!data || data.length === 0) return
    const tokens = stablecoins
    const dates = Array.from(new Set(data.map(row => row.date))).sort()
    const csvRows = [
      ['Date', ...tokens].join(','),
      ...dates.map(date => {
        const rowVals = tokens.map(token => {
          const row = data.find(r => r.date === date && r.stablecoin_symbol === token)
          return row ? row.circulating_usd : ''
        })
        return [date, ...rowVals].join(',')
      })
    ]
    const csv = csvRows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `avalanche_stablecoin_breakdown_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Helper to format currency
  const formatCurrency = (value: number): string => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
    return `$${value.toFixed(2)}`
  }

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
        <h3 className="text-lg font-semibold">Stablecoin Breakdown</h3>
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
                {stablecoins.map(token => (
                  <SelectItem key={token} value={token}>{stablecoinNames[token] || token}</SelectItem>
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
          <div className="animate-pulse space-y-4">Loading...</div>
        </div>
      )}
      {/* Error */}
      {error && (
        <div className="h-[400px] w-full flex items-center justify-center text-red-500">{error}</div>
      )}
      {/* Breakdown Card */}
      {!loading && !error && data && data.length > 0 && (
        <Card className="mb-6 p-4">
          <div className="font-semibold mb-2">Stablecoin Market Cap Breakdown (Latest)</div>
          {selectedToken === 'stacked' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {stablecoins
                .map((token, idx) => {
                  // Find the latest date for this token
                  const tokenRows = data.filter(r => r.stablecoin_symbol === token)
                  if (!tokenRows.length) return null
                  const latest = tokenRows[tokenRows.length - 1]
                  return {
                    token,
                    name: stablecoinNames[token] || token,
                    value: latest.circulating_usd,
                    color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
                  }
                })
                .filter(Boolean)
                .sort((a, b) => (b!.value - a!.value))
                .map((item, idx) => (
                  <div key={item!.token} className="flex items-center space-x-2">
                    <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: item!.color }}></span>
                    <span className="font-medium">{item!.name}</span>
                    <span className="ml-auto tabular-nums">{formatCurrency(item!.value)}</span>
                  </div>
                ))}
            </div>
          ) : (
            (() => {
              const token = selectedToken
              const idx = stablecoins.indexOf(token)
              const tokenRows = data.filter(r => r.stablecoin_symbol === token)
              if (!tokenRows.length) return null
              const latest = tokenRows[tokenRows.length - 1]
              return (
                <div className="flex items-center space-x-2">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: COLOR_PALETTE[idx % COLOR_PALETTE.length] }}></span>
                  <span className="font-medium">{stablecoinNames[token] || token}</span>
                  <span className="ml-auto tabular-nums">{formatCurrency(latest.circulating_usd)}</span>
                </div>
              )
            })()
          )}
        </Card>
      )}
      {/* Chart */}
      {!loading && !error && data && data.length > 0 && (
        <div className="h-[400px] w-full">
          {Object.keys(chartData).length > 0 && (
            <div id="stablecoin-breakdown-chart" className="h-full w-full">
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