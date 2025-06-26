"use client"

import { useEffect, useState } from "react"
import { BentoCardSimple } from "@/components/ui/bento-card-simple"
import { DollarSign, TrendingUp, BarChart3, Coins, Users, Package } from "lucide-react"

interface CoreDaoOverviewCardsProps {
  network: string
  colors: string[]
}

interface CoreDaoMarketData {
  market_cap: number
  fully_diluted_valuation: number
  total_volume: number
  circulating_supply: number
  total_supply: number
  max_supply: number
  current_price: number
  price_change_24h: number
  market_cap_change_24h: number
  volume_change_24h: number
}

export function CoreDaoOverviewCards({ network, colors }: CoreDaoOverviewCardsProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [marketData, setMarketData] = useState<CoreDaoMarketData | null>(null)

  const fetchCoreMarketData = async (): Promise<CoreDaoMarketData | null> => {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/coredaoorg?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
      )
      
      if (response.ok) {
        const data = await response.json()
        const marketData = data.market_data
        
        return {
          market_cap: marketData?.market_cap?.usd || 0,
          fully_diluted_valuation: marketData?.fully_diluted_valuation?.usd || 0,
          total_volume: marketData?.total_volume?.usd || 0,
          circulating_supply: marketData?.circulating_supply || 0,
          total_supply: marketData?.total_supply || 0,
          max_supply: marketData?.max_supply || 0,
          current_price: marketData?.current_price?.usd || 0,
          price_change_24h: marketData?.price_change_percentage_24h || 0,
          market_cap_change_24h: marketData?.market_cap_change_percentage_24h || 0,
          volume_change_24h: marketData?.total_volume_24h_change || 0
        }
      }
    } catch (err) {
      console.warn('Error fetching Core DAO market data:', err)
    }
    return null
  }

  useEffect(() => {
    const fetchData = async () => {
      if (network.toLowerCase() !== "core") {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const data = await fetchCoreMarketData()
        setMarketData(data)
      } catch (err) {
        console.error('Error fetching Core DAO overview data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [network])

  // Format value for display
  const formatValue = (value: number | null, type: 'currency' | 'number' | 'percentage' = 'currency'): string => {
    if (value === null || value === undefined) return 'N/A'
    
    if (type === 'percentage') {
      return `${value.toFixed(2)}%`
    }
    
    if (type === 'number') {
      if (value >= 1000000000) {
        return `${(value / 1000000000).toFixed(2)}B`
      } else if (value >= 1000000) {
        return `${(value / 1000000).toFixed(2)}M`
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(2)}K`
      } else {
        return value.toLocaleString()
      }
    }

    // Currency formatting
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

  const formatChangeSubtitle = (change: number | null): string => {
    if (change === null || change === undefined) return ""
    const prefix = change >= 0 ? "+" : ""
    return `${prefix}${change.toFixed(2)}% (24h)`
  }

  if (network.toLowerCase() !== "core") {
    return null
  }

  return (
    <>
      <BentoCardSimple
        title="Market Cap"
        value={loading ? "Loading..." : marketData ? formatValue(marketData.market_cap) : "N/A"}
        subtitle={loading ? "" : error ? "Failed to load" : marketData ? formatChangeSubtitle(marketData.market_cap_change_24h) : ""}
        colors={colors}
        loading={loading}
        error={error}
        icon={<DollarSign className="h-4 w-4" />}
      />
      
      <BentoCardSimple
        title="Fully Diluted Valuation"
        value={loading ? "Loading..." : marketData ? formatValue(marketData.fully_diluted_valuation) : "N/A"}
        subtitle={loading ? "" : error ? "Failed to load" : "Total supply × Price"}
        colors={colors}
        loading={loading}
        error={error}
        icon={<TrendingUp className="h-4 w-4" />}
      />
      
      <BentoCardSimple
        title="24h Trading Volume"
        value={loading ? "Loading..." : marketData ? formatValue(marketData.total_volume) : "N/A"}
        subtitle={loading ? "" : error ? "Failed to load" : marketData ? formatChangeSubtitle(marketData.volume_change_24h) : ""}
        colors={colors}
        loading={loading}
        error={error}
        icon={<BarChart3 className="h-4 w-4" />}
      />
      
      <BentoCardSimple
        title="Current Price"
        value={loading ? "Loading..." : marketData ? formatValue(marketData.current_price) : "N/A"}
        subtitle={loading ? "" : error ? "Failed to load" : marketData ? formatChangeSubtitle(marketData.price_change_24h) : ""}
        colors={colors}
        loading={loading}
        error={error}
        icon={<Coins className="h-4 w-4" />}
      />
      
      <BentoCardSimple
        title="Circulating Supply"
        value={loading ? "Loading..." : marketData ? formatValue(marketData.circulating_supply, 'number') : "N/A"}
        subtitle={loading ? "" : error ? "Failed to load" : "CORE tokens in circulation"}
        colors={colors}
        loading={loading}
        error={error}
        icon={<Users className="h-4 w-4" />}
      />
      
      <BentoCardSimple
        title="Total Supply"
        value={loading ? "Loading..." : marketData ? formatValue(marketData.total_supply, 'number') : "N/A"}
        subtitle={loading ? "" : error ? "Failed to load" : marketData ? `Max: ${formatValue(marketData.max_supply, 'number')}` : ""}
        colors={colors}
        loading={loading}
        error={error}
        icon={<Package className="h-4 w-4" />}
      />
    </>
  )
} 