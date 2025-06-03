"use client"

import { useState, useEffect } from "react"
import { Hash, Activity, Users, Coins } from "lucide-react"
import { BentoCardSimple } from "@/components/ui/bento-card-simple"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface OverviewNetworkMetricsCardsProps {
  network: string;
  colors: any;
}

interface NetworkMetrics {
  cumulativeTxCount: string;
  txCount: string;
  activeAddresses: string;
  circulatingSupply?: string; // Add circulating supply for Bitcoin
  date: string;
}

export function OverviewNetworkMetricsCards({ network, colors }: OverviewNetworkMetricsCardsProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentData, setCurrentData] = useState<NetworkMetrics | null>(null)
  const [previousData, setPreviousData] = useState<NetworkMetrics | null>(null)

  // Get the correct table name based on network
  const getTableName = (network: string): string => {
    switch (network.toLowerCase()) {
      case "avalanche":
        return "avalanche_core"
      case "ethereum":
        return "ethereum"  // Updated to match your table name
      case "solana":
        return "solana_core"
      case "bitcoin":
        return "btc_metrics"  // Fixed: was "bitcoin_core"
      case "polygon":
        return "polygon_core"
      case "core":
        return "core_core"
      default:
        return "avalanche_core"
    }
  }

  useEffect(() => {
    const fetchNetworkMetrics = async () => {
      setLoading(true)
      setError(null)

      if (!isSupabaseConfigured()) {
        setError("Supabase is not properly configured")
        setLoading(false)
        return
      }

      try {
        const tableName = getTableName(network)

        if (network.toLowerCase() === "bitcoin") {
          // For Bitcoin, map the available columns from btc_metrics including circulating supply
          const { data, error } = await supabase
            .from(tableName)
            .select(`
              txn_count,
              active_address,
              circulating,
              day
            `)
            .order('day', { ascending: false })
            .limit(2)

          if (error) {
            throw new Error(`Error fetching network metrics: ${error.message}`)
          }

          if (data && data.length > 0) {
            // Map Bitcoin data to our interface
            const mappedCurrent = {
              cumulativeTxCount: 'N/A', // Bitcoin doesn't have cumulative tx count in this table
              txCount: data[0].txn_count?.toString() || '0',
              activeAddresses: data[0].active_address?.toString() || '0',
              circulatingSupply: data[0].circulating?.toString() || '0',
              date: data[0].day
            }
            setCurrentData(mappedCurrent)

            if (data.length > 1) {
              const mappedPrevious = {
                cumulativeTxCount: 'N/A',
                txCount: data[1].txn_count?.toString() || '0',
                activeAddresses: data[1].active_address?.toString() || '0',
                circulatingSupply: data[1].circulating?.toString() || '0',
                date: data[1].day
              }
              setPreviousData(mappedPrevious)
            }
          }
        } else if (network.toLowerCase() === "ethereum") {
          // For Ethereum, map the available columns from ethereum table
          const { data, error } = await supabase
            .from(tableName)
            .select(`
              txns,
              users,
              contracts_deployed,
              dt
            `)
            .order('dt', { ascending: false })
            .limit(2)

          if (error) {
            throw new Error(`Error fetching network metrics: ${error.message}`)
          }

          if (data && data.length > 0) {
            // Map Ethereum data to our interface
            const mappedCurrent = {
              cumulativeTxCount: 'N/A', // Not available in ethereum table
              txCount: data[0].txns?.toString() || '0',
              activeAddresses: data[0].users?.toString() || '0', // Using users as active addresses
              date: data[0].dt
            }
            setCurrentData(mappedCurrent)

            if (data.length > 1) {
              const mappedPrevious = {
                cumulativeTxCount: 'N/A',
                txCount: data[1].txns?.toString() || '0',
                activeAddresses: data[1].users?.toString() || '0',
                date: data[1].dt
              }
              setPreviousData(mappedPrevious)
            }
          }
        } else if (network.toLowerCase() === "solana") {
          // Solana data is not available in the database yet
          setError("Solana network metrics are not available from the database. Please use the API-based metrics instead.")
          return
        } else {
          // For other networks (Avalanche, etc.), use the original query
          const { data, error } = await supabase
            .from(tableName)
            .select(`
              "cumulativeTxCount",
              "txCount",
              "activeAddresses",
              date
            `)
            .order('date', { ascending: false })
            .limit(2)

          if (error) {
            throw new Error(`Error fetching network metrics: ${error.message}`)
          }

          if (data && data.length > 0) {
            setCurrentData(data[0] as NetworkMetrics)
            if (data.length > 1) {
              setPreviousData(data[1] as NetworkMetrics)
            }
          }
        }
      } catch (err) {
        console.error('Error fetching network metrics:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchNetworkMetrics()
  }, [network])

  // Convert string to number safely
  const parseNumber = (value: string | null): number | null => {
    if (!value || value === 'null' || value === '') return null
    const parsed = parseFloat(value)
    return isNaN(parsed) ? null : parsed
  }

  // Format large numbers
  const formatLargeNumber = (value: string | null, isBTC: boolean = false): string => {
    const numValue = parseNumber(value)
    if (numValue === null) return 'N/A'
    
    if (isBTC) {
      // For Bitcoin, show as BTC with proper decimal places
      return `${numValue.toFixed(2)} BTC`
    }
    
    if (numValue >= 1000000000) {
      return `${(numValue / 1000000000).toFixed(2)}B`
    } else if (numValue >= 1000000) {
      return `${(numValue / 1000000).toFixed(2)}M`
    } else if (numValue >= 1000) {
      return `${(numValue / 1000).toFixed(2)}K`
    } else {
      return Math.round(numValue).toLocaleString()
    }
  }

  // Calculate percentage change
  const calculatePercentageChange = (current: string | null, previous: string | null): string => {
    const currentNum = parseNumber(current)
    const previousNum = parseNumber(previous)
    
    if (!currentNum || !previousNum || previousNum === 0) return "No data available"
    
    const change = ((currentNum - previousNum) / previousNum) * 100
    const sign = change >= 0 ? "+" : ""
    return `${sign}${change.toFixed(2)}% from previous day`
  }

  // Calculate daily transaction count change
  const calculateDailyTxChange = (current: string | null, previous: string | null): string => {
    const currentNum = parseNumber(current)
    const previousNum = parseNumber(previous)
    
    if (!currentNum || !previousNum) return "No data available"
    
    const dailyTxs = currentNum - previousNum
    const change = dailyTxs > 0 ? `+${formatLargeNumber(dailyTxs.toString())}` : formatLargeNumber(dailyTxs.toString())
    return `${change} transactions today`
  }

  // Get the first card content based on network
  const getFirstCard = () => {
    if (network.toLowerCase() === "bitcoin") {
      return (
        <BentoCardSimple
          title="Circulating Supply"
          value={formatLargeNumber(currentData?.circulatingSupply || null, true)}
          subtitle={calculatePercentageChange(currentData?.circulatingSupply || null, previousData?.circulatingSupply || null)}
          colors={colors}
          loading={loading}
          error={error}
          icon={<Coins className="h-4 w-4" />}
        />
      )
    } else {
      return (
        <BentoCardSimple
          title="Cumulative Txs"
          value={formatLargeNumber(currentData?.cumulativeTxCount || null)}
          subtitle={calculateDailyTxChange(currentData?.cumulativeTxCount || null, previousData?.cumulativeTxCount || null)}
          colors={colors}
          loading={loading}
          error={error}
          icon={<Hash className="h-4 w-4" />}
        />
      )
    }
  }

  return (
    <>
      <div className="col-span-2">
        {getFirstCard()}
      </div>
      <div className="col-span-2">
        <BentoCardSimple
          title="Transaction Count"
          value={formatLargeNumber(currentData?.txCount || null)}
          subtitle={calculatePercentageChange(currentData?.txCount || null, previousData?.txCount || null)}
          colors={colors}
          loading={loading}
          error={error}
          icon={<Activity className="h-4 w-4" />}
        />
      </div>
      <div className="col-span-2">
        <BentoCardSimple
          title="Active Addresses"
          value={formatLargeNumber(currentData?.activeAddresses || null)}
          subtitle={calculatePercentageChange(currentData?.activeAddresses || null, previousData?.activeAddresses || null)}
          colors={colors}
          loading={loading}
          error={error}
          icon={<Users className="h-4 w-4" />}
        />
      </div>
    </>
  )
} 