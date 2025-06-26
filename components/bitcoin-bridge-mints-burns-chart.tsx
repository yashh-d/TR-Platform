"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

export function BitcoinBridgeMintsBurnsChart() {
  const [allData, setAllData] = useState<any[]>([])
  const [filteredData, setFilteredData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<"7D" | "30D" | "90D" | "1Y" | "ALL">("ALL")

  useEffect(() => {
    fetchBridgeData()
  }, [])

  useEffect(() => {
    if (allData.length > 0) {
      filterDataByTimeRange(timeRange)
    }
  }, [allData, timeRange])

  const filterDataByTimeRange = (range: string) => {
    if (range === "ALL") {
      setFilteredData(allData)
      return
    }

    const now = new Date()
    let cutoffDate: Date

    switch (range) {
      case "7D":
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "30D":
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case "90D":
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case "1Y":
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        setFilteredData(allData)
        return
    }

    const filtered = allData.filter(item => new Date(item.date) >= cutoffDate)
    setFilteredData(filtered)
  }

  const fetchBridgeData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch ALL bridge transactions from Supabase with pagination
      let allTransactions: any[] = []
      let hasMore = true
      let page = 0
      const pageSize = 1000 // Max size per request

      while (hasMore) {
        console.log(`[BitcoinBridgeMintsBurnsChart] Fetching page ${page + 1}...`)
        
        const { data: transactions, error } = await supabase
          .from('btc_bridge')
          .select('*')
          .order('dstTimestamp', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) throw error

        if (transactions && transactions.length > 0) {
          allTransactions = [...allTransactions, ...transactions]
          page++
          
          // Check if we've received less than the page size, meaning no more data
          if (transactions.length < pageSize) {
            hasMore = false
          }
        } else {
          hasMore = false
        }
      }

      console.log(`[BitcoinBridgeMintsBurnsChart] Total transactions fetched: ${allTransactions.length}`)

      if (allTransactions.length === 0) {
        setError('No bridge transaction data available')
        return
      }

      // Process transactions to calculate daily mints and burns
      const processedData = processBridgeTransactions(allTransactions)
      setAllData(processedData)

    } catch (err) {
      console.error('Error fetching bridge data:', err)
      setError('Failed to load bridge data')
    } finally {
      setLoading(false)
    }
  }

  const processBridgeTransactions = (transactions: any[]) => {
    const dailyFlows: { [date: string]: { mints: number, burns: number } } = {}

    transactions.forEach(tx => {
      // Determine transaction type and date
      const isMint = tx.srcChainId === 'bitcoin' && tx.dstChainId === '43114'
      const isBurn = tx.srcChainId === '43114' && tx.dstChainId === 'bitcoin'
      
      if (!isMint && !isBurn) return

      // Use appropriate timestamp and amount
      const timestamp = isMint ? tx.dstTimestamp : tx.srcTimestamp
      const amount = isMint ? (tx.dstAmount / 100_000_000) : (tx.srcAmount / 100_000_000)
      const date = new Date(timestamp).toISOString().split('T')[0]

      if (!dailyFlows[date]) {
        dailyFlows[date] = { mints: 0, burns: 0 }
      }

      if (isMint) {
        dailyFlows[date].mints += amount
      } else {
        dailyFlows[date].burns += amount
      }
    })

    // Convert to array format
    const dates = Object.keys(dailyFlows).sort()
    return dates.map(date => ({
      date: date,
      mints: dailyFlows[date].mints,
      burns: dailyFlows[date].burns,
      netFlow: dailyFlows[date].mints - dailyFlows[date].burns
    }))
  }

  if (loading) {
    return (
      <div className="p-6 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Daily Mints vs Burns</h3>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading bridge data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Daily Mints vs Burns</h3>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    )
  }

  const plotData = [
    {
      x: filteredData.map(d => d.date),
      y: filteredData.map(d => d.mints),
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Daily Mints',
      line: {
        color: '#10B981', // Green
        width: 2
      },
      hovertemplate: '<b>%{x}</b><br>Mints: %{y:.4f} BTC<extra></extra>'
    },
    {
      x: filteredData.map(d => d.date),
      y: filteredData.map(d => d.burns),
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Daily Burns',
      line: {
        color: '#EF4444', // Red
        width: 2
      },
      hovertemplate: '<b>%{x}</b><br>Burns: %{y:.4f} BTC<extra></extra>'
    }
  ]

  const layout = {
    xaxis: {
      title: 'Date',
      type: 'date' as const,
      gridcolor: '#f0f0f0'
    },
    yaxis: {
      title: 'Amount (BTC)',
      gridcolor: '#f0f0f0',
      tickformat: '.4f'
    },
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',
    hovermode: 'x unified' as const,
    showlegend: true,
    legend: {
      x: 0.02,
      y: 0.98,
      xanchor: 'left',
      yanchor: 'top'
    },
    margin: { t: 60, r: 40, b: 60, l: 80 }
  }

  const config = {
    displayModeBar: false,
    responsive: true
  }

  const totalMints = filteredData.reduce((sum, d) => sum + d.mints, 0)
  const totalBurns = filteredData.reduce((sum, d) => sum + d.burns, 0)

  return (
    <div className="p-6 border rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Daily Mints vs Burns</h3>
        <div className="flex items-center gap-4">
          {/* Time Range Buttons */}
          <div className="flex rounded-md border">
            {(["7D", "30D", "90D", "1Y", "ALL"] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-xs rounded-none border-none ${
                  timeRange === range 
                    ? "bg-black text-white" 
                    : "bg-white text-gray-600 hover:bg-gray-50"
                } ${range === "7D" ? "rounded-l-md" : ""} ${range === "ALL" ? "rounded-r-md" : ""}`}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
      </div>
      <Plot
        data={plotData}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '400px' }}
      />
    </div>
  )
} 