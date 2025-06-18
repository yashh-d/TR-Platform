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

// --- TOKEN LIST FROM SCHEMA ---
const RWA_TOKENS = [
  "bIB01", "BENJI", "WTSYX", "FLTTX", "WTSTX", "WTLGX", "WTTSX", "TIPSX", "WTGXX", "BUIDL", "XTBT", "XEVT", "bCSPX", "SKHC", "PARAVII", "NOTE", "XRV", "ACRED", "EQTYX", "MODRX", "LNGVX", "WTSIX", "SPXUX", "TECHX", "RE", "VBILL", "XFTB"
];

// Color palette for tokens (extend or loop as needed)
const TOKEN_COLORS = [
  '#7b2ff2', '#f357a8', '#43e97b', '#38f9d7', '#fa8bff', '#ffecd2', '#a1c4fd', '#fbc2eb', '#fcb69f', '#ff8177',
  '#f7971e', '#ffd200', '#21d4fd', '#b721ff', '#00c6fb', '#f7797d', '#4e54c8', '#e1eec3', '#f857a6', '#ff5858',
  '#43cea2', '#185a9d', '#f953c6', '#b91d73', '#ff6a00', '#ee0979', '#ff512f'
];

export function RWAMetricsChart({ network }: RWAMetricsChartProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tokens, setTokens] = useState<string[]>(RWA_TOKENS)
  const [selectedToken, setSelectedToken] = useState<string>('stacked')
  const [timeRange, setTimeRange] = useState('1Y')
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

  // Fetch data from rwa_ava2
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
        // Build time filter
        let fromDate = new Date()
        if (timeRange === '1Y') fromDate.setFullYear(fromDate.getFullYear() - 1)
        else if (timeRange === '6M') fromDate.setMonth(fromDate.getMonth() - 6)
        else if (timeRange === '3M') fromDate.setMonth(fromDate.getMonth() - 3)
        else if (timeRange === '1M') fromDate.setMonth(fromDate.getMonth() - 1)
        // Select all token columns and Date
        const { data: rows, error: supabaseError } = await supabase
          .from('rwa_ava2')
          .select('Date,' + RWA_TOKENS.join(','))
          .gte('Date', fromDate.toISOString().slice(0, 10))
          .order('Date', { ascending: true })
        if (supabaseError) throw supabaseError
        setData(rows || [])
        setError(null)
      } catch (err) {
        setError('Failed to load RWA data')
      } finally {
        setLoading(false)
      }
    }
    fetchRWAData()
  }, [network, timeRange])

  // Process data for the chart whenever raw data changes
  useEffect(() => {
    if (!data || data.length === 0) return
    const times: string[] = []
    // --- Stacked chart logic ---
    if (selectedToken === 'stacked') {
      // For each token, build a trace
      const traces = RWA_TOKENS.map((token, idx) => {
        const y = data.map(row => Number(row[token] || 0))
        if (times.length === 0) data.forEach(row => times.push(row.Date))
        return {
          x: data.map(row => row.Date),
          y,
          name: token,
          type: 'scatter',
          mode: 'lines',
          stackgroup: 'one',
          fill: 'tonexty',
          line: { color: TOKEN_COLORS[idx % TOKEN_COLORS.length], width: 2 },
        }
      })
      const layout = {
        title: 'RWA Metrics: Stacked by Token',
        xaxis: { title: 'Date', type: 'date', showgrid: true, gridcolor: '#e5e5e5' },
        yaxis: {
          title: 'Amount (USD)', showgrid: true, gridcolor: '#e5e5e5',
          tickprefix: '$', tickformat: '.2s', hoverformat: ',.2f',
          tickfont: { family: 'Arial, sans-serif', size: 12 }
        },
        showlegend: true,
        legend: { x: 0, y: 1.1, orientation: 'h' },
        margin: { l: 70, r: 50, t: 50, b: 50 },
        plot_bgcolor: 'white', paper_bgcolor: 'white'
      }
      setChartData({ data: traces, layout, config: { responsive: true, displayModeBar: false } })
      return
    }
    // --- All Tokens (sum) or single token ---
    const amounts: number[] = []
    data.forEach(row => {
      times.push(row.Date)
      if (selectedToken === 'all') {
        let sum = 0
        for (const token of RWA_TOKENS) {
          sum += Number(row[token] || 0)
        }
        amounts.push(sum)
      } else {
        amounts.push(Number(row[selectedToken] || 0))
      }
    })
    const trace = {
      type: 'scatter',
      mode: 'lines',
      name: selectedToken !== 'all' ? selectedToken : 'All Tokens',
      x: times,
      y: amounts,
      line: { color: getNetworkColor(network), width: 2 },
      fill: 'tozeroy',
    }
    const layout = {
      title: `RWA Metrics: ${selectedToken !== 'all' ? selectedToken : 'All Tokens'}`,
      xaxis: { title: 'Date', type: 'date', showgrid: true, gridcolor: '#e5e5e5' },
      yaxis: {
        title: 'Amount (USD)', showgrid: true, gridcolor: '#e5e5e5',
        tickprefix: '$', tickformat: '.2s', hoverformat: ',.2f',
        tickfont: { family: 'Arial, sans-serif', size: 12 }
      },
      showlegend: true,
      legend: { x: 0, y: 1.1, orientation: 'h' },
      margin: { l: 70, r: 50, t: 50, b: 50 },
      plot_bgcolor: 'white', paper_bgcolor: 'white'
    }
    setChartData({ data: [trace], layout, config: { responsive: true, displayModeBar: false } })
  }, [data, selectedToken, network])

  // Download CSV
  const handleDownload = () => {
    if (!data || data.length === 0) return
    const csv = [
      ['Date', ...RWA_TOKENS].join(','),
      ...data.map(row => [row.Date, ...RWA_TOKENS.map(token => row[token] ?? '')].join(','))
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
          <Select value={selectedToken} onValueChange={setSelectedToken}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Token" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Tokens</SelectLabel>
                <SelectItem value="stacked">Stacked</SelectItem>
                <SelectItem value="all">All Tokens</SelectItem>
                {tokens.map(token => (
                  <SelectItem key={token} value={token}>{token}</SelectItem>
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
      {/* Chart */}
      {!loading && !error && data && data.length > 0 && (
        <div className="h-[400px] w-full">
          {Object.keys(chartData).length > 0 && (
            <div id="rwa-chart" className="h-full w-full">
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