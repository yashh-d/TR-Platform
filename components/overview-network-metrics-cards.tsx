"use client"

import { useState, useEffect } from "react"
import { Hash, Activity, Users, Coins, Cpu, BarChart3, Network } from "lucide-react"
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
  circulatingSupply?: string;
  transaction_throughput?: number;
  volume_in_dollar?: number;
  total_staked?: number | null;
  dex_volume?: number | null;
  l1s_count?: number | null;
  date: string;
}

export function OverviewNetworkMetricsCards({ network, colors }: OverviewNetworkMetricsCardsProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentData, setCurrentData] = useState<NetworkMetrics | null>(null)
  const [previousData, setPreviousData] = useState<NetworkMetrics | null>(null)

  // Don't render for Core DAO - it has its own component
  if (network.toLowerCase() === "core") {
    return null
  }

  // Fetch Total Staked data for Avalanche
  const fetchTotalStakedData = async (): Promise<{ current: number | null, previous: number | null }> => {
    if (network.toLowerCase() !== "avalanche") {
      return { current: null, previous: null }
    }

    try {
      if (isSupabaseConfigured()) {
        // Use the same RPC function as the network page for consistency
        const { data, error } = await supabase
          .rpc('get_latest_network_stats')

        if (!error && data) {
          // Handle both array and direct object responses from the RPC call
          const statsData = Array.isArray(data) ? data[0] : data
          
          if (statsData) {
            const currentTotalStaked = ((statsData.validatorTotalStaked || 0) + (statsData.delegatorTotalStaked || 0)) / Math.pow(10, 12) // Convert from nAVAX to AVAX
            
            // For previous data, we can try to get historical data from the table
            const { data: historicalData } = await supabase
              .from('avalanche_network_stats')
              .select('validator_total_staked, delegator_total_staked')
              .order('date', { ascending: false })
              .limit(2)
            
            const previousTotalStaked = historicalData && historicalData.length > 1 ? 
              (historicalData[1].validator_total_staked + historicalData[1].delegator_total_staked) / Math.pow(10, 12) : null
            
            return { current: currentTotalStaked, previous: previousTotalStaked }
          }
        }
      }
    } catch (err) {
      console.warn('Error fetching total staked data:', err)
    }
    return { current: null, previous: null }
  }

  // Fetch DEX Volume data for Avalanche
  const fetchDexVolumeData = async (): Promise<{ current: number | null, previous: number | null }> => {
    if (network.toLowerCase() !== "avalanche") {
      return { current: null, previous: null }
    }

    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('avalanche_dex_volumes')
          .select('date, volume')
          .eq('protocol', 'total')
          .order('date', { ascending: false })
          .limit(2)

        if (!error && data && data.length > 0) {
          const currentVolume = Number(data[0].volume)
          const previousVolume = data.length > 1 ? Number(data[1].volume) : null

          return { current: currentVolume, previous: previousVolume }
        }
      }
    } catch (err) {
      console.warn('Error fetching DEX volume data:', err)
    }
    return { current: null, previous: null }
  }

  // Fetch L1s Count data for Avalanche
  const fetchL1sCountData = async (): Promise<{ current: number | null, previous: number | null }> => {
    if (network.toLowerCase() !== "avalanche") {
      return { current: null, previous: null }
    }

    try {
      if (isSupabaseConfigured()) {
        // Get the current count of L1s/subnets
        const { count: currentCount, error } = await supabase
          .from('avalanche_subnets')
          .select('*', { count: 'exact', head: true })

        if (!error && currentCount !== null) {
          // For now, we don't have historical L1s count data, so previous will be null
          // This could be enhanced in the future with historical tracking
          return { current: currentCount, previous: null }
        }
      }
    } catch (err) {
      console.warn('Error fetching L1s count data:', err)
    }
    return { current: null, previous: null }
  }

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
              transaction_throughput,
              volume_in_dollar,
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
              transaction_throughput: data[0].transaction_throughput || 0,
              volume_in_dollar: data[0].volume_in_dollar || 0,
              date: data[0].day
            }
            setCurrentData(mappedCurrent)

            if (data.length > 1) {
              const mappedPrevious = {
                cumulativeTxCount: 'N/A',
                txCount: data[1].txn_count?.toString() || '0',
                activeAddresses: data[1].active_address?.toString() || '0',
                circulatingSupply: data[1].circulating?.toString() || '0',
                transaction_throughput: data[1].transaction_throughput || 0,
                volume_in_dollar: data[1].volume_in_dollar || 0,
                date: data[1].day
              }
              setPreviousData(mappedPrevious)
            }
          }
        } else if (network.toLowerCase() === "avalanche") {
          // For Avalanche, fetch regular network metrics plus staking, DEX, and L1s data
          const [metricsResult, stakedResult, dexResult, l1sResult] = await Promise.all([
            supabase
              .from(tableName)
              .select(`
                "cumulativeTxCount",
                "txCount",
                "activeAddresses",
                date
              `)
              .order('date', { ascending: false })
              .limit(2),
            fetchTotalStakedData(),
            fetchDexVolumeData(),
            fetchL1sCountData()
          ])

          if (metricsResult.error) {
            throw new Error(`Error fetching network metrics: ${metricsResult.error.message}`)
          }

          if (metricsResult.data && metricsResult.data.length > 0) {
            const mappedCurrent = {
              ...metricsResult.data[0] as NetworkMetrics,
              total_staked: stakedResult.current,
              dex_volume: dexResult.current,
              l1s_count: l1sResult.current
            }
            setCurrentData(mappedCurrent)

            if (metricsResult.data.length > 1) {
              const mappedPrevious = {
                ...metricsResult.data[1] as NetworkMetrics,
                total_staked: stakedResult.previous,
                dex_volume: dexResult.previous,
                l1s_count: l1sResult.previous
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

  // Format AVAX values
  const formatAVAXValue = (value: number | null): string => {
    if (value === null || value === undefined) return 'N/A'
    
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M AVAX`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}K AVAX`
    } else {
      return `${value.toFixed(2)} AVAX`
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

  // Calculate percentage change for numbers
  const calculateNumberPercentageChange = (current: number | null, previous: number | null): string => {
    if (!current || !previous || previous === 0) return "No data available"
    
    const change = ((current - previous) / previous) * 100
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

  // Format currency value
  const formatCurrencyValue = (value: number | null): string => {
    if (value === null || value === undefined) return 'N/A'
    
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

  // Get the content for network-specific cards
  const getNetworkSpecificCards = () => {
    if (network.toLowerCase() === "bitcoin") {
      return (
        <>
          <div className="col-span-1">
            <BentoCardSimple
              title="Volume (24h)"
              value={formatCurrencyValue(currentData?.volume_in_dollar || null)}
              subtitle={calculateNumberPercentageChange(
                currentData?.volume_in_dollar || null,
                previousData?.volume_in_dollar || null
              )}
              colors={colors}
              loading={loading}
              error={error}
              icon={<Activity className="h-4 w-4" />}
            />
          </div>
          <div className="col-span-1">
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
          <div className="col-span-1">
            <BentoCardSimple
              title="Throughput"
              value={currentData?.transaction_throughput ? `${currentData.transaction_throughput.toFixed(2)} TPB` : "N/A"}
              subtitle={calculateNumberPercentageChange(
                currentData?.transaction_throughput || null,
                previousData?.transaction_throughput || null
              )}
              colors={colors}
              loading={loading}
              error={error}
              icon={<Cpu className="h-4 w-4" />}
            />
          </div>
          <div className="col-span-1">
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
    } else if (network.toLowerCase() === "avalanche") {
      return (
        <>
          <div className="col-span-1">
            <BentoCardSimple
              title="Total Staked"
              value={formatAVAXValue(currentData?.total_staked || null)}
              subtitle={calculateNumberPercentageChange(currentData?.total_staked || null, previousData?.total_staked || null)}
              colors={colors}
              loading={loading}
              error={error}
              icon={<Coins className="h-4 w-4" />}
            />
          </div>
          <div className="col-span-1">
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
          <div className="col-span-1">
            <BentoCardSimple
              title="DEX Volume (24h)"
              value={formatCurrencyValue(currentData?.dex_volume || null)}
              subtitle={calculateNumberPercentageChange(currentData?.dex_volume || null, previousData?.dex_volume || null)}
              colors={colors}
              loading={loading}
              error={error}
              icon={<BarChart3 className="h-4 w-4" />}
            />
          </div>
          <div className="col-span-1">
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
          <div className="col-span-1">
            <BentoCardSimple
              title="Total L1s"
              value={currentData?.l1s_count !== null && currentData?.l1s_count !== undefined ? currentData.l1s_count.toString() : "N/A"}
              subtitle={currentData?.l1s_count !== null && currentData?.l1s_count !== undefined ? "Avalanche subnets" : "No data available"}
              colors={colors}
              loading={loading}
              error={error}
              icon={<Network className="h-4 w-4" />}
            />
          </div>
        </>
      )
    } else {
      // Default for other networks
      return (
        <>
          <div className="col-span-1">
            <BentoCardSimple
              title="Cumulative Txs"
              value={formatLargeNumber(currentData?.cumulativeTxCount || null)}
              subtitle={calculateDailyTxChange(currentData?.cumulativeTxCount || null, previousData?.cumulativeTxCount || null)}
              colors={colors}
              loading={loading}
              error={error}
              icon={<Hash className="h-4 w-4" />}
            />
          </div>
          <div className="col-span-1">
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
          <div className="col-span-1">
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
          <div className="col-span-1">
            <BentoCardSimple
              title="Network Activity"
              value="N/A"
              subtitle="Data not available"
              colors={colors}
              loading={loading}
              error={error}
              icon={<Activity className="h-4 w-4" />}
            />
          </div>
        </>
      )
    }
  }

  return (
    <>
      {getNetworkSpecificCards()}
    </>
  )
}