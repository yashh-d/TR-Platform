"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { FileWarning } from "lucide-react"

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

interface StakingDistributionPieChartProps {
  network: string
}

interface NetworkStats {
  delegatorTotalStaked: number
  validatorTotalStaked: number
}

export function StakingDistributionPieChart({ network }: StakingDistributionPieChartProps) {
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

        console.log('[StakingDistributionPieChart] Fetching network stats...')

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
          setStats({
            delegatorTotalStaked: statsData.delegatorTotalStaked || 0,
            validatorTotalStaked: statsData.validatorTotalStaked || 0
          })
          console.log('[StakingDistributionPieChart] Stats loaded:', {
            delegator: statsData.delegatorTotalStaked,
            validator: statsData.validatorTotalStaked
          })
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

  // Format AVAX amounts
  const formatAVAX = (num: number): string => {
    if (num >= 1000000000) {
      return `${(num / 1000000000).toFixed(2)}B AVAX`
    } else if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M AVAX`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K AVAX`
    } else {
      return `${num.toLocaleString(undefined, { maximumFractionDigits: 4 })} AVAX`
    }
  }

  // Calculate percentages and create chart data
  const createChartData = () => {
    if (!stats || (stats.delegatorTotalStaked === 0 && stats.validatorTotalStaked === 0)) {
      return []
    }

    const total = stats.delegatorTotalStaked + stats.validatorTotalStaked
    const delegatorPercentage = (stats.delegatorTotalStaked / total) * 100
    const validatorPercentage = (stats.validatorTotalStaked / total) * 100

    return [{
      type: "pie",
      labels: ["Delegator Staked", "Validator Staked"],
      values: [stats.delegatorTotalStaked, stats.validatorTotalStaked],
      hole: 0.4, // Creates a donut chart
      marker: {
        colors: ["#FFFFFF", "#E84142"], // White and Avalanche red
        line: {
          color: "#E84142",
          width: 2
        }
      },
      textinfo: "label+percent",
      textposition: "outside",
      hovertemplate: '<b>%{label}</b><br>' +
                    '%{percent}<br>' +
                    '<extra></extra>',
      hoverlabel: {
        bgcolor: "white",
        bordercolor: "#E84142",
        font: { color: "black", size: 12 }
      }
    }]
  }

  if (loading) {
    return (
      <div className="border rounded-lg p-6 animate-pulse">
        <div className="mb-4">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
        <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center">
          <div className="text-gray-400">Loading staking distribution...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Staking Distribution</h3>
        </div>
        <div className="bg-red-50 text-red-600 p-4 rounded-md flex items-center">
          <FileWarning className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  if (network.toLowerCase() !== "avalanche") {
    return (
      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Staking Distribution</h3>
        </div>
        <div className="bg-gray-50 text-gray-600 p-4 rounded-md flex items-center justify-center">
          <span>Staking distribution data is only available for Avalanche.</span>
        </div>
      </div>
    )
  }

  if (!stats || (stats.delegatorTotalStaked === 0 && stats.validatorTotalStaked === 0)) {
    return (
      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Staking Distribution</h3>
        </div>
        <div className="bg-gray-50 text-gray-600 p-4 rounded-md flex items-center justify-center">
          <span>No staking data available.</span>
        </div>
      </div>
    )
  }

  const total = stats.delegatorTotalStaked + stats.validatorTotalStaked
  const delegatorPercentage = (stats.delegatorTotalStaked / total) * 100
  const validatorPercentage = (stats.validatorTotalStaked / total) * 100

  return (
    <div className="border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Validator vs Delegator Staking Distribution</h3>
      </div>
      
      <div className="h-64 mb-4">
        <Plot
          data={createChartData()}
          layout={{
            showlegend: false,
            margin: { l: 20, r: 20, t: 20, b: 20 },
            plot_bgcolor: 'transparent',
            paper_bgcolor: 'transparent',
            font: {
              size: 12,
              color: '#64748b'
            }
          }}
          config={{
            displayModeBar: false,
            responsive: true,
          }}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  )
} 