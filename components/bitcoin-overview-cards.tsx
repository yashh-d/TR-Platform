"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { DollarSign, TrendingUp, Activity, Calculator, Coins } from "lucide-react"
import { BentoCardSimple } from "@/components/ui/bento-card-simple"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface BitcoinOverviewCardsProps {
  network: string;
  colors: string[];
}

interface BitcoinMetrics {
  market_cap: number;
  close_price: number;
  miner_revenue: number;
  volume_in_dollar: number;
  puell_multiple: number;
  avg_txn_fee_in_dollar: number;
  transaction_throughput: number;
  circulating: number;
  day: string;
}

export function BitcoinOverviewCards({ network, colors }: BitcoinOverviewCardsProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentData, setCurrentData] = useState<BitcoinMetrics | null>(null)
  const [previousData, setPreviousData] = useState<BitcoinMetrics | null>(null)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [previousPrice, setPreviousPrice] = useState<number | null>(null)

  // Fetch current Bitcoin price from CoinGecko
  const fetchCurrentPrice = async (): Promise<{ current: number | null, previous: number | null }> => {
    try {
      // Try database first for price data
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('price_data')
          .select('price, timestamp')
          .eq('blockchain', 'bitcoin')
          .order('timestamp', { ascending: false })
          .limit(2)

        if (!error && data && data.length > 0) {
          const current = data[0].price
          const previous = data.length > 1 ? data[1].price : null
          return { current, previous }
        }
      }

      // Fallback to CoinGecko API
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true')
      if (response.ok) {
        const data = await response.json()
        if (data && data.bitcoin) {
          const current = data.bitcoin.usd
          const change24h = data.bitcoin.usd_24h_change || 0
          const previous = current - (current * change24h / 100)
          return { current, previous }
        }
      }
    } catch (err) {
      console.warn('Error fetching Bitcoin price:', err)
    }
    return { current: null, previous: null }
  }

  useEffect(() => {
    const fetchBitcoinMetrics = async () => {
      setLoading(true)
      setError(null)

      if (network.toLowerCase() !== "bitcoin") {
        setLoading(false)
        return
      }

      if (!isSupabaseConfigured()) {
        setError("Supabase is not properly configured")
        setLoading(false)
        return
      }

      try {
        // Fetch both Bitcoin metrics and current price
        const [metricsResult, priceResult] = await Promise.all([
          supabase
            .from('btc_metrics')
            .select(`
              market_cap,
              close_price,
              miner_revenue,
              volume_in_dollar,
              puell_multiple,
              avg_txn_fee_in_dollar,
              transaction_throughput,
              circulating,
              day
            `)
            .order('day', { ascending: false })
            .limit(2),
          fetchCurrentPrice()
        ])

        if (metricsResult.error) {
          throw new Error(`Error fetching Bitcoin metrics: ${metricsResult.error.message}`)
        }

        if (metricsResult.data && metricsResult.data.length > 0) {
          setCurrentData(metricsResult.data[0] as BitcoinMetrics)
          if (metricsResult.data.length > 1) {
            setPreviousData(metricsResult.data[1] as BitcoinMetrics)
          }
        }

        // Set current price data
        setCurrentPrice(priceResult.current)
        setPreviousPrice(priceResult.previous)

      } catch (err) {
        console.error('Error fetching Bitcoin metrics:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchBitcoinMetrics()
  }, [network])

  // Calculate market cap as current price × circulating supply
  const getCurrentMarketCap = (): number | null => {
    if (!currentPrice || !currentData?.circulating) return null
    return currentPrice * currentData.circulating
  }

  const getPreviousMarketCap = (): number | null => {
    if (!previousPrice || !previousData?.circulating) return null
    return previousPrice * previousData.circulating
  }

  // Format value for display
  const formatValue = (value: number | null, type: 'currency' | 'price' | 'ratio' | 'tpb' | 'btc' = 'currency'): string => {
    if (value === null || value === undefined) return 'N/A'
    
    if (type === 'price') {
      if (value >= 1000) {
        return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      } else if (value >= 1) {
        return `$${value.toFixed(2)}`
      } else if (value >= 0.01) {
        return `$${value.toFixed(4)}`
      } else {
        return `$${value.toFixed(6)}`
      }
    }
    
    if (type === 'ratio') {
      return value.toFixed(3)
    }
    
    if (type === 'tpb') {
      return `${value.toFixed(2)} TPB`
    }

    if (type === 'btc') {
      return `${value.toFixed(2)} BTC`
    }
    
    if (value >= 1000000000000) {
      return `$${(value / 1000000000000).toFixed(2)}T`
    } else if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(2)}B`
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`
    } else {
      return `$${value.toFixed(2)}`
    }
  }

  // Calculate percentage change
  const calculatePercentageChange = (current: number | null, previous: number | null): string => {
    if (!current || !previous || previous === 0) return "No data available"
    
    const change = ((current - previous) / previous) * 100
    const sign = change >= 0 ? "+" : ""
    return `${sign}${change.toFixed(2)}% from previous day`
  }

  if (network.toLowerCase() !== "bitcoin") {
    return (
      <>
        <div className="col-span-1">
          <BentoCardSimple
            title="Market Cap"
            value="N/A"
            subtitle="Only available for Bitcoin"
            colors={colors}
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </div>
        <div className="col-span-1">
          <BentoCardSimple
            title="Price"
            value="N/A"
            subtitle="Only available for Bitcoin"
            colors={colors}
            icon={<DollarSign className="h-4 w-4" />}
          />
        </div>
        <div className="col-span-1">
          <BentoCardSimple
            title="Circulating Supply"
            value="N/A"
            subtitle="Only available for Bitcoin"
            colors={colors}
            icon={<Coins className="h-4 w-4" />}
          />
        </div>
        <div className="col-span-1">
          <BentoCardSimple
            title="Puell Multiple"
            value="N/A"
            subtitle="Only available for Bitcoin"
            colors={colors}
            icon={<Calculator className="h-4 w-4" />}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <div className="col-span-1">
        <BentoCardSimple
          title="Market Cap"
          value={formatValue(getCurrentMarketCap())}
          subtitle={calculatePercentageChange(getCurrentMarketCap(), getPreviousMarketCap())}
          colors={colors}
          loading={loading}
          error={error}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>
      <div className="col-span-1">
        <BentoCardSimple
          title="Price"
          value={formatValue(currentPrice, 'price')}
          subtitle={calculatePercentageChange(currentPrice, previousPrice)}
          colors={colors}
          loading={loading}
          error={error}
          icon={<DollarSign className="h-4 w-4" />}
        />
      </div>
      <div className="col-span-1">
        <BentoCardSimple
          title="Circulating Supply"
          value={formatValue(currentData?.circulating || null, 'btc')}
          subtitle={calculatePercentageChange(currentData?.circulating || null, previousData?.circulating || null)}
          colors={colors}
          loading={loading}
          error={error}
          icon={<Coins className="h-4 w-4" />}
        />
      </div>
      <div className="col-span-1">
        <BentoCardSimple
          title="Puell Multiple"
          value={formatValue(currentData?.puell_multiple || null, 'ratio')}
          subtitle={calculatePercentageChange(currentData?.puell_multiple || null, previousData?.puell_multiple || null)}
          colors={colors}
          loading={loading}
          error={error}
          icon={<Calculator className="h-4 w-4" />}
        />
      </div>
    </>
  )
} 