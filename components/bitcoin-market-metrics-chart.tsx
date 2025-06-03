"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface BitcoinMarketMetricsChartProps {
  network: string
  height?: string
}

interface MarketMetricsData {
  day: string
  market_cap: number
  avg_txn_fee_in_dollar: number
  volatility_30d: number
  nvt_ratio: number
  circulating: number
  volatility_90d: number
  volatility_200d: number
  annualized_inflation: number
  metcalfe_ratio: number
  market_to_thermocap: number
  return_1y: number
  sharpe_ratio: number
  close_price: number
}

export function BitcoinMarketMetricsChart({ 
  network, 
  height = "500px" 
}: BitcoinMarketMetricsChartProps) {
  const [timeRange, setTimeRange] = useState('1Y')
  const [data, setData] = useState<MarketMetricsData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeMetric, setActiveMetric] = useState<'market_cap' | 'avg_txn_fee_in_dollar' | 'volatility_30d' | 'nvt_ratio' | 'circulating' | 'volatility_90d' | 'volatility_200d' | 'annualized_inflation' | 'metcalfe_ratio' | 'market_to_thermocap' | 'return_1y' | 'sharpe_ratio' | 'close_price'>('market_cap')
  const chartRef = useRef<HTMLDivElement>(null)

  // Available metrics for this chart
  const availableMetrics = [
    { id: 'market_cap', label: 'Market Cap' },
    { id: 'close_price', label: 'Price' },
    { id: 'circulating', label: 'Circulating Supply' },
    { id: 'avg_txn_fee_in_dollar', label: 'Avg Transaction Fee' },
    { id: 'volatility_30d', label: '30D Volatility' },
    { id: 'volatility_90d', label: '90D Volatility' },
    { id: 'volatility_200d', label: '200D Volatility' },
    { id: 'nvt_ratio', label: 'NVT Ratio' },
    { id: 'annualized_inflation', label: 'Annualized Inflation' },
    { id: 'metcalfe_ratio', label: 'Metcalfe Ratio' },
    { id: 'market_to_thermocap', label: 'Market to Thermocap' },
    { id: 'return_1y', label: '1Y Return' },
    { id: 'sharpe_ratio', label: 'Sharpe Ratio' }
  ]

  useEffect(() => {
    if (network.toLowerCase() !== "bitcoin") {
      setLoading(false)
      return
    }

    if (!isSupabaseConfigured()) {
      setError("Supabase is not properly configured")
      setLoading(false)
      return
    }

    async function fetchMarketMetricsData() {
      setLoading(true)
      setError(null)
      
      try {
        // Calculate the date filter based on the selected time range
        const currentDate = new Date()
        let filterDate = new Date()
        
        switch (timeRange) {
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
          default:
            filterDate.setFullYear(currentDate.getFullYear() - 1)
            break
          case 'ALL':
            filterDate = new Date('2009-01-01') // Bitcoin genesis
            break
        }
        
        const formattedFilterDate = filterDate.toISOString().split('T')[0]
        
        const { data, error } = await supabase
          .from('btc_metrics')
          .select(`
            day,
            market_cap,
            avg_txn_fee_in_dollar,
            volatility_30d,
            nvt_ratio,
            circulating,
            volatility_90d,
            volatility_200d,
            annualized_inflation,
            metcalfe_ratio,
            market_to_thermocap,
            return_1y,
            sharpe_ratio,
            close_price
          `)
          .gte('day', formattedFilterDate)
          .order('day', { ascending: true })
        
        if (error) {
          throw new Error(`Error fetching Bitcoin market metrics data: ${error.message}`)
        }
        
        if (data) {
          setData(data as MarketMetricsData[])
        }
      } catch (err) {
        console.error('Error fetching Bitcoin market metrics data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchMarketMetricsData()
  }, [network, timeRange])

  // Format value for display
  const formatValue = (value: number | null): string => {
    if (value === null || value === undefined) return '0'
    
    if (activeMetric === 'market_cap') {
      if (value >= 1000000000000) {
        return `$${(value / 1000000000000).toFixed(2)}T`
      } else if (value >= 1000000000) {
        return `$${(value / 1000000000).toFixed(2)}B`
      } else if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(2)}M`
      } else {
        return `$${value.toFixed(2)}`
      }
    } else if (activeMetric === 'close_price') {
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    } else if (activeMetric === 'avg_txn_fee_in_dollar') {
      return `$${value.toFixed(2)}`
    } else if (activeMetric === 'circulating') {
      return `${value.toFixed(2)} BTC`
    } else if (activeMetric === 'volatility_30d' || activeMetric === 'volatility_90d' || activeMetric === 'volatility_200d' || activeMetric === 'annualized_inflation' || activeMetric === 'return_1y') {
      return `${(value * 100).toFixed(2)}%`
    } else {
      return value.toFixed(3)
    }
  }

  // Create Plotly chart data
  const createChartData = () => {
    if (!data.length) return null

    const lineColor = "#F7931A" // Bitcoin orange
    const metricInfo = availableMetrics.find(m => m.id === activeMetric)
    const metricLabel = metricInfo ? metricInfo.label : activeMetric
    
    const traces: any[] = [{
      x: data.map(d => d.day),
      y: data.map(d => d[activeMetric]),
      type: 'scatter',
      mode: 'lines',
      name: metricLabel,
      line: {
        color: lineColor,
        width: 2,
        shape: 'spline'
      },
      hoverinfo: 'y+x'
    }]

    // Get appropriate tick format based on metric
    let tickFormat = ',.0f'
    if (activeMetric === 'market_cap' || activeMetric === 'close_price') {
      tickFormat = '$,.2s'
    } else if (activeMetric === 'avg_txn_fee_in_dollar') {
      tickFormat = '$,.2f'
    } else if (activeMetric === 'volatility_30d' || activeMetric === 'volatility_90d' || activeMetric === 'volatility_200d' || activeMetric === 'annualized_inflation' || activeMetric === 'return_1y') {
      tickFormat = '.2%'
    } else if (activeMetric === 'circulating') {
      tickFormat = ',.2f'
    } else {
      tickFormat = '.3f'
    }

    return {
      data: traces,
      layout: {
        autosize: true,
        margin: { l: 60, r: 20, t: 60, b: 50 },
        xaxis: { 
          gridcolor: "#e5e7eb",
          type: 'date',
          showgrid: true
        },
        yaxis: { 
          title: metricLabel,
          gridcolor: "#e5e7eb",
          titlefont: { color: lineColor },
          showgrid: true,
          tickformat: tickFormat
        },
        plot_bgcolor: "white",
        paper_bgcolor: "white",
        hovermode: "closest",
        colorway: [lineColor],
        showlegend: false
      } as any,
      config: {
        responsive: true,
        displayModeBar: false
      }
    }
  }

  // Effect to render the chart
  useEffect(() => {
    if (!loading && !error && data.length > 0 && chartRef.current) {
      if (typeof window !== 'undefined' && window.Plotly) {
        const chartData = createChartData()
        if (chartData) {
          window.Plotly.newPlot(
            chartRef.current,
            chartData.data,
            chartData.layout,
            chartData.config
          )
        }
      }
    }
  }, [loading, error, data, timeRange, activeMetric, network])

  if (loading) {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading market metrics data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-red-500">Error loading market metrics data: {error}</div>
        </div>
      </div>
    )
  }

  if (network.toLowerCase() !== "bitcoin") {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-gray-500">Market metrics are only available for Bitcoin.</div>
        </div>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="border rounded-lg p-6" style={{ height }}>
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-gray-500">No market metrics data available.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-6 mb-6" style={{ height }}>
      <div className="flex flex-wrap items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold">Bitcoin Market & Valuation Metrics</h2>
        </div>
        
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          {/* Metric Selector */}
          <div className="flex flex-wrap space-x-1 gap-1">
            {availableMetrics.map((metric) => (
              <Button
                key={metric.id}
                variant={activeMetric === metric.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveMetric(metric.id as any)}
                className="text-xs"
                style={{
                  backgroundColor: activeMetric === metric.id ? "#F7931A" : "",
                  borderColor: activeMetric === metric.id ? "#F7931A" : "",
                  color: activeMetric === metric.id ? "white" : "",
                }}
              >
                {metric.label}
              </Button>
            ))}
          </div>
          
          {/* Time Range Selector */}
          <div className="flex space-x-1">
            {['30D', '3M', '6M', '1Y', 'ALL'].map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(range)}
                className="text-xs"
                style={{
                  backgroundColor: timeRange === range ? "#F7931A" : "",
                  borderColor: timeRange === range ? "#F7931A" : "",
                  color: timeRange === range ? "white" : "",
                }}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="h-[300px] relative">
        <div ref={chartRef} className="w-full h-full"></div>
      </div>
    </div>
  )
} 