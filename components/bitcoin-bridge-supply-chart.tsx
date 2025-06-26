"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

interface BridgeTransaction {
  date: string
  srcChainId: string
  dstChainId: string
  srcAmount: number
  dstAmount: number
  srcTimestamp: string
  dstTimestamp: string
}

export function BitcoinBridgeSupplyChart() {
  const [allData, setAllData] = useState<any[]>([])
  const [filteredData, setFilteredData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<"7D" | "30D" | "90D" | "1Y" | "ALL">("ALL")
  const [bitcoinPrice, setBitcoinPrice] = useState<number | null>(null)

  useEffect(() => {
    fetchBridgeData()
    fetchBitcoinPrice()
  }, [])

  useEffect(() => {
    if (allData.length > 0) {
      filterDataByTimeRange(timeRange)
    }
  }, [allData, timeRange])

  const fetchBitcoinPrice = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
      const data = await response.json()
      setBitcoinPrice(data.bitcoin.usd)
    } catch (err) {
      console.error('Error fetching Bitcoin price:', err)
      // Fallback price if API fails
      setBitcoinPrice(95000)
    }
  }

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
        console.log(`Fetching page ${page + 1}...`)
        
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

      console.log(`Total transactions fetched: ${allTransactions.length}`)

      if (allTransactions.length === 0) {
        setError('No bridge transaction data available')
        return
      }
      
      // Check date range of raw data
      const timestamps = allTransactions.map(tx => tx.dstTimestamp || tx.srcTimestamp).filter(Boolean)
      if (timestamps.length > 0) {
        const sortedTimestamps = timestamps.sort()
        console.log('Raw data date range:', {
          earliest: sortedTimestamps[0],
          latest: sortedTimestamps[sortedTimestamps.length - 1]
        })
      }

      // Process transactions to calculate daily supply
      const processedData = processBridgeTransactions(allTransactions)
      console.log('Processed data:', {
        totalPoints: processedData.length,
        dateRange: processedData.length > 0 ? {
          earliest: processedData[0].date,
          latest: processedData[processedData.length - 1].date
        } : null
      })
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
      
      if (!timestamp) return
      
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

    // Calculate cumulative supply
    const dates = Object.keys(dailyFlows).sort()
    let cumulativeSupply = 0
    const supplyData = []

    for (const date of dates) {
      const netFlow = dailyFlows[date].mints - dailyFlows[date].burns
      cumulativeSupply += netFlow
      
      supplyData.push({
        date: date,
        supply: cumulativeSupply,
        mints: dailyFlows[date].mints,
        burns: dailyFlows[date].burns,
        netFlow: netFlow
      })
    }

    return supplyData
  }

  if (loading) {
    return (
      <div className="p-6 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">BTC.b Total Supply Over Time</h3>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading supply data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">BTC.b Total Supply Over Time</h3>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    )
  }

  const plotData = [
    {
      x: filteredData.map(d => d.date),
      y: filteredData.map(d => d.supply),
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Total Supply',
      line: {
        color: '#F7931A',
        width: 3
      },
      hovertemplate: '<b>%{x}</b><br>Supply: %{y:.2f} BTC.b<extra></extra>'
    }
  ]

  const layout = {
    xaxis: {
      title: 'Date',
      type: 'date' as const,
      gridcolor: '#f0f0f0'
    },
    yaxis: {
      title: 'Supply (BTC.b)',
      gridcolor: '#f0f0f0',
      tickformat: ',.0f'
    },
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',
    hovermode: 'x unified' as const,
    showlegend: false,
    margin: { t: 60, r: 40, b: 60, l: 80 }
  }

  const config = {
    displayModeBar: false,
    responsive: true
  }

  const currentSupply = filteredData.length > 0 ? filteredData[filteredData.length - 1].supply : 0
  const currentSupplyUSD = bitcoinPrice ? currentSupply * bitcoinPrice : null

  const formatUSD = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
    return `$${value.toFixed(2)}`
  }

  return (
    <div className="p-6 border rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">BTC.b Total Supply Over Time</h3>
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
      
      {/* Current Supply Bubbles - Left Aligned */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="text-sm text-gray-500">Current Supply</div>
          <div className="text-lg font-bold">
            {currentSupplyUSD ? formatUSD(currentSupplyUSD) : 'Loading...'}
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="text-sm text-gray-500">BTC.b Supply</div>
          <div className="text-lg font-bold">
            {currentSupply.toLocaleString(undefined, { maximumFractionDigits: 2 })} BTC.b
          </div>
        </div>
      </div>
    </div>
  )
} 