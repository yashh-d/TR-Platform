"use client"

import { useEffect, useState } from "react"
import { BentoCardSimple } from "@/components/ui/bento-card-simple"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { Users, Coins, Award, Percent, PieChart } from "lucide-react"

interface NetworkStatsProps {
  network: string
  colors: string[]
}

interface NetworkStats {
  delegatorCount: number
  delegatorTotalStaked: number
  validatorCount: number
  validatorTotalStaked: number
  estimatedAnnualStakingReward: number
  stakingRatio: number
  stakingDistributionByVersion: string
}

export function AvalancheNetworkStats({ network, colors }: NetworkStatsProps) {
  const [stats, setStats] = useState<NetworkStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchNetworkStats() {
      setLoading(true)
      setError(null)

      try {
        // Only fetch data for Avalanche network
        if (network !== "avalanche") {
          setStats(null)
          setLoading(false)
          return
        }

        // Check if Supabase is configured
        if (!isSupabaseConfigured()) {
          throw new Error("Supabase is not properly configured. Please check your environment variables.")
        }

        // Fetch latest network stats
        const { data, error } = await supabase
          .rpc('get_latest_network_stats')

        if (error) {
          throw new Error(`Error fetching network stats: ${error.message}`)
        }

        // Handle both array and direct object responses from the RPC call
        if (data) {
          // If data is an array, take the first item, otherwise use the data directly
          const statsData = Array.isArray(data) ? data[0] : data;
          setStats(statsData as NetworkStats)
        } else {
          setStats(null)
        }
      } catch (err) {
        console.error("Failed to fetch network stats:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred")
        setStats(null)
      } finally {
        setLoading(false)
      }
    }

    fetchNetworkStats()
  }, [network])

  // Format numbers with commas and proper decimal places
  const formatNumber = (num: number | null | undefined, decimals = 0): string => {
    if (num === null || num === undefined) return "0"
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals 
    })
  }

  // Format percentage with proper scaling
  const formatPercent = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return "0%"
    
    // Check if the number is already in percentage format (e.g., 51.4) 
    // or needs to be multiplied by 100 (e.g., 0.514)
    if (num < 1 && num > 0) {
      // If the number is a decimal like 0.514, multiply by 100 to get 51.4%
      return `${(num * 100).toFixed(2)}%`
    } else {
      // Otherwise, assume it's already in percentage form
      return `${num.toFixed(2)}%`
    }
  }

  // Format AVAX (show in millions or billions)
  const formatAVAX = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return "0 AVAX"
    
    if (num >= 1000000000) {
      return `${(num / 1000000000).toFixed(2)}B AVAX`
    } else if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M AVAX`
    } else {
      return `${num.toLocaleString()} AVAX`
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      <BentoCardSimple
        title="Delegator Count"
        value={formatNumber(stats?.delegatorCount)}
        subtitle="Unique delegators"
        colors={colors}
        loading={loading}
        error={error}
        icon={<Users className="h-4 w-4" />}
      />
      
      <BentoCardSimple
        title="Validator Count"
        value={formatNumber(stats?.validatorCount)}
        subtitle="Active validators"
        colors={colors}
        loading={loading}
        error={error}
        icon={<Award className="h-4 w-4" />}
      />
      
      <BentoCardSimple
        title="Total Staked"
        value={formatAVAX(stats?.validatorTotalStaked)}
        subtitle={`${formatAVAX(stats?.delegatorTotalStaked)} delegated`}
        colors={colors}
        loading={loading}
        error={error}
        icon={<Coins className="h-4 w-4" />}
      />
      
      <BentoCardSimple
        title="Annual Staking Reward"
        value={formatAVAX(stats?.estimatedAnnualStakingReward)}
        subtitle="Estimated APR"
        colors={colors}
        loading={loading}
        error={error}
        icon={<Coins className="h-4 w-4" />}
      />
      
      <BentoCardSimple
        title="Staking Ratio"
        value={formatPercent(stats?.stakingRatio)}
        subtitle="% of total supply staked"
        colors={colors}
        loading={loading}
        error={error}
        icon={<PieChart className="h-4 w-4" />}
      />
    </div>
  )
} 