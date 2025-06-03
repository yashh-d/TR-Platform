"use client"

import { useState, useEffect } from "react"
import { Coins, Wallet, Hash } from "lucide-react"
import { BentoCardSimple } from "@/components/ui/bento-card-simple"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface OverviewStablecoinCardsProps {
  network: string;
  colors: any;
}

interface StablecoinData {
  total_circulating_usd_all: number;
  total_circulating_usd_usdt: number;
  total_circulating_usd_usdc: number;
  total_bridged_to_usd_all: number;
}

export function OverviewStablecoinCards({ network, colors }: OverviewStablecoinCardsProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentData, setCurrentData] = useState<StablecoinData | null>(null)
  const [previousData, setPreviousData] = useState<StablecoinData | null>(null)

  useEffect(() => {
    // Only fetch for Avalanche network
    if (network.toLowerCase() !== "avalanche") {
      setLoading(false)
      return
    }

    if (!isSupabaseConfigured()) {
      setError("Supabase is not properly configured")
      setLoading(false)
      return
    }

    async function fetchStablecoinStats() {
      setLoading(true)
      setError(null)
      
      try {
        // Get the latest data (most recent date)
        const { data: latestData, error: latestError } = await supabase
          .from('avalanche_stablecoins')
          .select(`
            total_circulating_usd_all,
            total_circulating_usd_usdt,
            total_circulating_usd_usdc,
            total_bridged_to_usd_all,
            date
          `)
          .order('date', { ascending: false })
          .limit(1)
        
        if (latestError) {
          throw new Error(`Error fetching latest stablecoin data: ${latestError.message}`)
        }

        // Get data from 24 hours ago for comparison
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]

        const { data: previousData, error: previousError } = await supabase
          .from('avalanche_stablecoins')
          .select(`
            total_circulating_usd_all,
            total_circulating_usd_usdt,
            total_circulating_usd_usdc,
            total_bridged_to_usd_all
          `)
          .lte('date', yesterdayStr)
          .order('date', { ascending: false })
          .limit(1)

        if (previousError) {
          console.warn('Could not fetch previous day data:', previousError.message)
        }
        
        if (latestData && latestData.length > 0) {
          setCurrentData(latestData[0] as StablecoinData)
        }

        if (previousData && previousData.length > 0) {
          setPreviousData(previousData[0] as StablecoinData)
        }
      } catch (err) {
        console.error('Error fetching stablecoin stats:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchStablecoinStats()
  }, [network])

  // Format value for display
  const formatValue = (value: number | null): string => {
    if (value === null || value === undefined) return '$0'
    
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
  const calculatePercentageChange = (current: number, previous: number): string => {
    if (!previous || previous === 0) return "+0.00% in 24h ago"
    
    const change = ((current - previous) / previous) * 100
    const sign = change >= 0 ? "+" : ""
    return `${sign}${change.toFixed(2)}% in 24h ago`
  }

  // Calculate estimated holders (simplified calculation)
  const calculateEstimatedHolders = (totalValue: number): string => {
    // This is a rough estimation - you might want to replace with actual data
    const estimatedHolders = Math.floor(totalValue / 1000) // Assuming average holding of $1000
    if (estimatedHolders >= 1000000) {
      return `${(estimatedHolders / 1000000).toFixed(2)}M`
    } else if (estimatedHolders >= 1000) {
      return `${(estimatedHolders / 1000).toFixed(2)}K`
    }
    return estimatedHolders.toString()
  }

  // Static stablecoin count for now (you can make this dynamic if you have the data)
  const stablecoinCount = "8"

  if (network.toLowerCase() !== "avalanche") {
    return (
      <>
        <div className="col-span-2">
          <BentoCardSimple
            title="Stablecoin Market Cap"
            value="N/A"
            subtitle="Only available for Avalanche"
            colors={colors}
            icon={<Coins className="h-4 w-4" />}
          />
        </div>
        <div className="col-span-2">
          <BentoCardSimple
            title="Stablecoin Holders"
            value="N/A"
            subtitle="Only available for Avalanche"
            colors={colors}
            icon={<Wallet className="h-4 w-4" />}
          />
        </div>
        <div className="col-span-2">
          <BentoCardSimple
            title="Stablecoin Count"
            value="N/A"
            subtitle="Only available for Avalanche"
            colors={colors}
            icon={<Hash className="h-4 w-4" />}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <div className="col-span-2">
        <BentoCardSimple
          title="Stablecoin Market Cap"
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
          title="Stablecoin Holders"
          value={currentData ? calculateEstimatedHolders(currentData.total_circulating_usd_all) : (loading ? "Loading..." : "N/A")}
          subtitle={currentData && previousData ? 
            calculatePercentageChange(
              parseFloat(calculateEstimatedHolders(currentData.total_circulating_usd_all).replace(/[KM]/g, '')), 
              parseFloat(calculateEstimatedHolders(previousData.total_circulating_usd_all).replace(/[KM]/g, ''))
            ) : 
            "Estimated based on market cap"
          }
          colors={colors}
          loading={loading}
          error={error}
          icon={<Wallet className="h-4 w-4" />}
        />
      </div>
      <div className="col-span-2">
        <BentoCardSimple
          title="Stablecoin Count"
          value={stablecoinCount}
          subtitle="Major stablecoins tracked"
          colors={colors}
          icon={<Hash className="h-4 w-4" />}
        />
      </div>
    </>
  )
} 