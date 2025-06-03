"use client"

import { useState, useEffect } from "react"
import { DollarSign, TrendingUp, Cpu, Activity, Calculator, CreditCard } from "lucide-react"
import { BentoCardSimple } from "@/components/ui/bento-card-simple"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface BitcoinOverviewCardsProps {
  network: string;
  colors: any;
}

interface BitcoinMetrics {
  market_cap: number;
  close_price: number;
  miner_revenue: number;
  volume_in_dollar: number;
  puell_multiple: number;
  avg_txn_fee_in_dollar: number;
  transaction_throughput: number;
  day: string;
}

export function BitcoinOverviewCards({ network, colors }: BitcoinOverviewCardsProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentData, setCurrentData] = useState<BitcoinMetrics | null>(null)
  const [previousData, setPreviousData] = useState<BitcoinMetrics | null>(null)

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
        const { data, error } = await supabase
          .from('btc_metrics')
          .select(`
            market_cap,
            close_price,
            miner_revenue,
            volume_in_dollar,
            puell_multiple,
            avg_txn_fee_in_dollar,
            transaction_throughput,
            day
          `)
          .order('day', { ascending: false })
          .limit(2)

        if (error) {
          throw new Error(`Error fetching Bitcoin metrics: ${error.message}`)
        }

        if (data && data.length > 0) {
          setCurrentData(data[0] as BitcoinMetrics)
          if (data.length > 1) {
            setPreviousData(data[1] as BitcoinMetrics)
          }
        }
      } catch (err) {
        console.error('Error fetching Bitcoin metrics:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchBitcoinMetrics()
  }, [network])

  // Format value for display
  const formatValue = (value: number | null, type: 'currency' | 'price' | 'ratio' | 'tpb' = 'currency'): string => {
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
            title="Volume"
            value="N/A"
            subtitle="Only available for Bitcoin"
            colors={colors}
            icon={<Activity className="h-4 w-4" />}
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
        <div className="col-span-1">
          <BentoCardSimple
            title="Avg Txn Fee"
            value="N/A"
            subtitle="Only available for Bitcoin"
            colors={colors}
            icon={<CreditCard className="h-4 w-4" />}
          />
        </div>
        <div className="col-span-1">
          <BentoCardSimple
            title="Throughput"
            value="N/A"
            subtitle="Only available for Bitcoin"
            colors={colors}
            icon={<Cpu className="h-4 w-4" />}
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
          value={formatValue(currentData?.market_cap || null)}
          subtitle={calculatePercentageChange(currentData?.market_cap || null, previousData?.market_cap || null)}
          colors={colors}
          loading={loading}
          error={error}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>
      <div className="col-span-1">
        <BentoCardSimple
          title="Price"
          value={formatValue(currentData?.close_price || null, 'price')}
          subtitle={calculatePercentageChange(currentData?.close_price || null, previousData?.close_price || null)}
          colors={colors}
          loading={loading}
          error={error}
          icon={<DollarSign className="h-4 w-4" />}
        />
      </div>
      <div className="col-span-1">
        <BentoCardSimple
          title="Volume (24h)"
          value={formatValue(currentData?.volume_in_dollar || null)}
          subtitle={calculatePercentageChange(currentData?.volume_in_dollar || null, previousData?.volume_in_dollar || null)}
          colors={colors}
          loading={loading}
          error={error}
          icon={<Activity className="h-4 w-4" />}
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
      <div className="col-span-1">
        <BentoCardSimple
          title="Avg Txn Fee"
          value={formatValue(currentData?.avg_txn_fee_in_dollar || null, 'price')}
          subtitle={calculatePercentageChange(currentData?.avg_txn_fee_in_dollar || null, previousData?.avg_txn_fee_in_dollar || null)}
          colors={colors}
          loading={loading}
          error={error}
          icon={<CreditCard className="h-4 w-4" />}
        />
      </div>
      <div className="col-span-1">
        <BentoCardSimple
          title="Throughput"
          value={formatValue(currentData?.transaction_throughput || null, 'tpb')}
          subtitle={calculatePercentageChange(currentData?.transaction_throughput || null, previousData?.transaction_throughput || null)}
          colors={colors}
          loading={loading}
          error={error}
          icon={<Cpu className="h-4 w-4" />}
        />
      </div>
    </>
  )
} 