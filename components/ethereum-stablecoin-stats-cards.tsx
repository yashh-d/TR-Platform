"use client"

import { useState, useEffect } from "react"
import { Coins } from "lucide-react"
import { BentoCardSimple } from "@/components/ui/bento-card-simple"
import { USDCIcon, USDTIcon } from "@/components/ui/stablecoin-icons"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface EthereumStablecoinStatsCardsProps {
  network: string;
  colors: any;
}

interface StablecoinData {
  total_circulating_usd_all: number;
  total_bridged_to_usd_all: number;
  total_circulating_usd_usdt: number;
  total_circulating_usd_usdc: number;
  date: string;
}

export function EthereumStablecoinStatsCards({ network, colors }: EthereumStablecoinStatsCardsProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentData, setCurrentData] = useState<StablecoinData | null>(null)
  const [previousData, setPreviousData] = useState<StablecoinData | null>(null)

  useEffect(() => {
    const fetchStablecoinData = async () => {
      setLoading(true)
      setError(null)

      if (network.toLowerCase() !== "ethereum") {
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
          .from('ethereum_stablecoins')
          .select(`
            total_circulating_usd_all,
            total_bridged_to_usd_all,
            total_circulating_usd_usdt,
            total_circulating_usd_usdc,
            date
          `)
          .order('date', { ascending: false })
          .limit(2)

        if (error) {
          throw new Error(`Error fetching Ethereum stablecoin data: ${error.message}`)
        }

        if (data && data.length > 0) {
          setCurrentData(data[0] as StablecoinData)
          if (data.length > 1) {
            setPreviousData(data[1] as StablecoinData)
          }
        }
      } catch (err) {
        console.error('Error fetching Ethereum stablecoin data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchStablecoinData()
  }, [network])

  // Format value for display
  const formatValue = (value: number | null): string => {
    if (value === null || value === undefined) return 'N/A'
    
    if (value >= 1000000000) {
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
    return `${sign}${change.toFixed(2)}% in 24h ago`
  }

  if (network.toLowerCase() !== "ethereum") {
    return (
      <>
        <div className="col-span-2">
          <BentoCardSimple
            title="Total Circulating"
            value="N/A"
            subtitle="Only available for Ethereum"
            colors={colors}
            icon={<Coins className="h-4 w-4" />}
          />
        </div>
        <div className="col-span-2">
          <BentoCardSimple
            title="USDC Circulating"
            value="N/A"
            subtitle="Only available for Ethereum"
            colors={colors}
            icon={<USDCIcon />}
          />
        </div>
        <div className="col-span-2">
          <BentoCardSimple
            title="USDT Circulating"
            value="N/A"
            subtitle="Only available for Ethereum"
            colors={colors}
            icon={<USDTIcon />}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <div className="col-span-2">
        <BentoCardSimple
          title="Total Circulating"
          value={currentData ? formatValue(currentData.total_circulating_usd_all) : (loading ? "Loading..." : "N/A")}
          subtitle={currentData && previousData ? 
            calculatePercentageChange(currentData.total_circulating_usd_all, previousData.total_circulating_usd_all) : 
            "No change data available"
          }
          colors={colors}
          loading={loading}
          error={error}
          icon={<Coins className="h-4 w-4" />}
        />
      </div>
      <div className="col-span-2">
        <BentoCardSimple
          title="USDC Circulating"
          value={currentData ? formatValue(currentData.total_circulating_usd_usdc) : (loading ? "Loading..." : "N/A")}
          subtitle={currentData && previousData ? 
            calculatePercentageChange(currentData.total_circulating_usd_usdc, previousData.total_circulating_usd_usdc) : 
            "No change data available"
          }
          colors={colors}
          loading={loading}
          error={error}
          icon={<USDCIcon />}
        />
      </div>
      <div className="col-span-2">
        <BentoCardSimple
          title="USDT Circulating"
          value={currentData ? formatValue(currentData.total_circulating_usd_usdt) : (loading ? "Loading..." : "N/A")}
          subtitle={currentData && previousData ? 
            calculatePercentageChange(currentData.total_circulating_usd_usdt, previousData.total_circulating_usd_usdt) : 
            "No change data available"
          }
          colors={colors}
          loading={loading}
          error={error}
          icon={<USDTIcon />}
        />
      </div>
    </>
  )
} 