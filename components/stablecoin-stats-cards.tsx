"use client"

import { useState, useEffect } from "react"
import { Coins } from "lucide-react"
import Image from "next/image"
import { BentoCardSimple } from "@/components/ui/bento-card-simple"
import { USDCIcon, USDTIcon } from "@/components/ui/stablecoin-icons"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface StablecoinStatsCardsProps {
  network: string;
  colors: any;
}

interface StablecoinData {
  total_circulating_usd_all: number;
  total_circulating_usd_usdt: number;
  total_circulating_usd_usdc: number;
  total_bridged_to_usd_all: number;
}

export function StablecoinStatsCards({ network, colors }: StablecoinStatsCardsProps) {
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

  if (network.toLowerCase() !== "avalanche") {
    return (
      <div className="grid grid-cols-6 gap-4 mb-8">
        <div className="col-span-2">
          <BentoCardSimple
            title="Total Circulating"
            value="N/A"
            subtitle="Only available for Avalanche"
            colors={colors}
            icon={<Coins className="h-4 w-4" />}
          />
        </div>
        <div className="col-span-2">
          <BentoCardSimple
            title="USDC Circulating"
            value="N/A"
            subtitle="Only available for Avalanche"
            colors={colors}
            icon={<USDCIcon />}
          />
        </div>
        <div className="col-span-2">
          <BentoCardSimple
            title="USDT Circulating"
            value="N/A"
            subtitle="Only available for Avalanche"
            colors={colors}
            icon={<USDTIcon />}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-6 gap-4 mb-8">
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
    </div>
  )
} 