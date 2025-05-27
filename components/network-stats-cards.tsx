"use client"

import { useEffect, useState } from "react"
import { BentoCard } from "@/components/ui/bento-card"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { Users, Coins, Award, Percent } from "lucide-react"

interface NetworkStatsCardsProps {
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

export function NetworkStatsCards({ network, colors }: NetworkStatsCardsProps) {
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

        if (data && data.length > 0) {
          setStats(data[0] as NetworkStats)
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
  const formatNumber = (num: number | null, decimals = 0): string => {
    if (num === null) return "0"
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals 
    })
  }

  // Format percentage
  const formatPercent = (num: number | null): string => {
    if (num === null) return "0%"
    return `${num.toFixed(2)}%`
  }

  // Format AVAX (show in millions or billions)
  const formatAVAX = (num: number | null): string => {
    if (num === null) return "0 AVAX"
    
    if (num >= 1000000000) {
      return `${(num / 1000000000).toFixed(2)}B AVAX`
    } else if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M AVAX`
    } else {
      return `${num.toLocaleString()} AVAX`
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <BentoCard
        title="Delegator Count"
        value={formatNumber(stats?.delegatorCount)}
        subtitle="Unique delegators"
        colors={colors}
        delay={0.1}
        loading={loading}
        error={error}
        icon={<Users className="h-4 w-4" />}
      />
      
      <BentoCard
        title="Validator Count"
        value={formatNumber(stats?.validatorCount)}
        subtitle="Active validators"
        colors={colors}
        delay={0.2}
        loading={loading}
        error={error}
        icon={<Award className="h-4 w-4" />}
      />
      
      <BentoCard
        title="Total Staked"
        value={formatAVAX(stats?.validatorTotalStaked)}
        subtitle={`${formatAVAX(stats?.delegatorTotalStaked)} delegated`}
        colors={colors}
        delay={0.3}
        loading={loading}
        error={error}
        icon={<Coins className="h-4 w-4" />}
      />
      
      <BentoCard
        title="Staking APR"
        value={formatPercent(stats?.estimatedAnnualStakingReward)}
        subtitle={`${formatPercent(stats?.stakingRatio)} staking ratio`}
        colors={colors}
        delay={0.4}
        loading={loading}
        error={error}
        icon={<Percent className="h-4 w-4" />}
      />
    </div>
  )
} 