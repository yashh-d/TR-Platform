"use client"

import { useState, useEffect } from "react"
import { DollarSign, TrendingUp, Coins, Activity } from "lucide-react"
import { BentoCardSimple } from "@/components/ui/bento-card-simple"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface OverviewMetricsCardsProps {
  network: string;
  colors: any;
}

interface StablecoinData {
  total_circulating_usd_all: number;
}

interface TVLData {
  tvl: number;
}

interface PriceData {
  price: number;
}

interface MarketData {
  market_cap: number;
  circulating_supply: number;
  total_supply: number;
}

export function OverviewMetricsCards({ network, colors }: OverviewMetricsCardsProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tvlData, setTvlData] = useState<number | null>(null)
  const [stablecoinData, setStablecoinData] = useState<number | null>(null)
  const [priceData, setPriceData] = useState<number | null>(null)
  const [marketCapData, setMarketCapData] = useState<number | null>(null)
  const [supplyData, setSupplyData] = useState<number | null>(null)
  const [previousTvl, setPreviousTvl] = useState<number | null>(null)
  const [previousStablecoin, setPreviousStablecoin] = useState<number | null>(null)
  const [previousPrice, setPreviousPrice] = useState<number | null>(null)
  const [previousMarketCap, setPreviousMarketCap] = useState<number | null>(null)
  const [previousSupply, setPreviousSupply] = useState<number | null>(null)

  // Map network names to API identifiers
  const getChainId = (network: string): string => {
    switch (network.toLowerCase()) {
      case "avalanche":
        return "avalanche"
      case "ethereum":
        return "ethereum"
      case "solana":
        return "solana"
      case "bitcoin":
        return "bitcoin"
      case "polygon":
        return "polygon"
      case "core":
        return "core"
      default:
        return "avalanche"
    }
  }

  const getCoinId = (network: string): string => {
    switch (network.toLowerCase()) {
      case "avalanche":
        return "avalanche-2"
      case "ethereum":
        return "ethereum"
      case "solana":
        return "solana"
      case "bitcoin":
        return "bitcoin"
      case "polygon":
        return "matic-network"
      case "core":
        return "coredaoorg"
      default:
        return "avalanche-2"
    }
  }

  // Fetch latest TVL data - use same logic as chart to ensure consistency
  const fetchTVLData = async (): Promise<{ current: number | null, previous: number | null }> => {
    try {
      // Always get the most recent complete dataset to match what chart shows
      const chainId = getChainId(network)
      const response = await fetch(`https://api.llama.fi/v2/historicalChainTvl/${chainId}`)
      if (response.ok) {
        const data = await response.json()
        if (data && data.length > 0) {
          // Get the absolute latest value (like the chart does)
          const current = data[data.length - 1].tvl
          const previous = data.length > 1 ? data[data.length - 2].tvl : null
          return { current, previous }
        }
      }

      // Fallback to database if API fails
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('tvl_data')
          .select('tvl, timestamp')
          .eq('blockchain', network)
          .order('timestamp', { ascending: false })
          .limit(2)

        if (!error && data && data.length > 0) {
          const current = data[0].tvl
          const previous = data.length > 1 ? data[1].tvl : null
          return { current, previous }
        }
      }
    } catch (err) {
      console.warn('Error fetching TVL data:', err)
    }
    return { current: null, previous: null }
  }

  // Fetch latest stablecoin data
  const fetchStablecoinData = async (): Promise<{ current: number | null, previous: number | null }> => {
    if (network.toLowerCase() !== "avalanche") {
      return { current: null, previous: null }
    }

    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('avalanche_stablecoins')
          .select('total_circulating_usd_all, date')
          .order('date', { ascending: false })
          .limit(2)

        if (!error && data && data.length > 0) {
          const current = data[0].total_circulating_usd_all
          const previous = data.length > 1 ? data[1].total_circulating_usd_all : null
          return { current, previous }
        }
      }
    } catch (err) {
      console.warn('Error fetching stablecoin data:', err)
    }
    return { current: null, previous: null }
  }

  // Fetch latest price data
  const fetchPriceData = async (): Promise<{ current: number | null, previous: number | null }> => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('price_data')
          .select('price, timestamp')
          .eq('blockchain', network)
          .order('timestamp', { ascending: false })
          .limit(2)

        if (!error && data && data.length > 0) {
          const current = data[0].price
          const previous = data.length > 1 ? data[1].price : null
          return { current, previous }
        }
      }

      // Fallback to API
      const coinId = getCoinId(network)
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`)
      if (response.ok) {
        const data = await response.json()
        if (data && data[coinId]) {
          const current = data[coinId].usd
          const change24h = data[coinId].usd_24h_change || 0
          const previous = current - (current * change24h / 100)
          return { current, previous }
        }
      }
    } catch (err) {
      console.warn('Error fetching price data:', err)
    }
    return { current: null, previous: null }
  }

  // Get CoinMarketCap slug for each network
  const getCMCSlug = (network: string): string => {
    switch (network.toLowerCase()) {
      case "avalanche":
        return "avalanche"
      case "ethereum":
        return "ethereum"
      case "solana":
        return "solana"
      case "bitcoin":
        return "bitcoin"
      case "polygon":
        return "polygon"
      case "core":
        return "core-dao"
      default:
        return "avalanche"
    }
  }

  // Fetch market cap and supply data from CoinMarketCap
  const fetchMarketCapAndSupplyData = async (): Promise<{ 
    marketCap: { current: number | null, previous: number | null },
    supply: { current: number | null, previous: number | null }
  }> => {
    try {
      const slug = getCMCSlug(network)
      
      // Call our API route that handles CoinMarketCap API
      const response = await fetch(`/api/coinmarketcap?slug=${slug}`)
      if (response.ok) {
        const data = await response.json()
        if (data && data.success && data.data) {
          const coinData = data.data[0] // First result should be our coin
          console.log('Received coin data:', coinData)
          
          // V2 API structure
          const marketCap = coinData.quote?.USD?.market_cap || null
          const circulatingSupply = coinData.circulating_supply || null
          
          console.log('Parsed values:', { marketCap, circulatingSupply })
          
          return {
            marketCap: { current: marketCap, previous: null }, // CMC doesn't provide historical in basic call
            supply: { current: circulatingSupply, previous: null }
          }
        }
      }
    } catch (err) {
      console.warn('Error fetching CoinMarketCap data:', err)
    }
    
    return {
      marketCap: { current: null, previous: null },
      supply: { current: null, previous: null }
    }
  }

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true)
      setError(null)

      try {
        const [tvlResult, stablecoinResult, priceResult, cmcResult] = await Promise.all([
          fetchTVLData(),
          fetchStablecoinData(),
          fetchPriceData(),
          fetchMarketCapAndSupplyData()
        ])

        setTvlData(tvlResult.current)
        setPreviousTvl(tvlResult.previous)
        
        setStablecoinData(stablecoinResult.current)
        setPreviousStablecoin(stablecoinResult.previous)
        
        setPriceData(priceResult.current)
        setPreviousPrice(priceResult.previous)
        
        setMarketCapData(cmcResult.marketCap.current)
        setPreviousMarketCap(cmcResult.marketCap.previous)
        
        setSupplyData(cmcResult.supply.current)
        setPreviousSupply(cmcResult.supply.previous)
      } catch (err) {
        console.error('Error fetching overview metrics:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchAllData()
  }, [network])

  // Format value for display
  const formatValue = (value: number | null, type: 'currency' | 'price' = 'currency'): string => {
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

  // Format supply numbers
  const formatSupply = (value: number | null): string => {
    if (value === null || value === undefined) return 'N/A'
    
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(2)}B`
    } else if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}K`
    } else {
      return `${value.toLocaleString()}`
    }
  }

  // Calculate percentage change
  const calculatePercentageChange = (current: number | null, previous: number | null): string => {
    if (!current || !previous || previous === 0) return "No data"
    
    const change = ((current - previous) / previous) * 100
    const sign = change >= 0 ? "+" : ""
    return `${sign}${change.toFixed(2)}% in 24h ago`
  }

  return (
    <>
      <div className="col-span-2">
        <BentoCardSimple
          title="TVL"
          value={formatValue(tvlData)}
          subtitle={calculatePercentageChange(tvlData, previousTvl)}
          colors={colors}
          loading={loading}
          error={error}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>
      <div className="col-span-2">
        <BentoCardSimple
          title="Stablecoin Market Cap"
          value={network.toLowerCase() === "avalanche" ? formatValue(stablecoinData) : "N/A"}
          subtitle={network.toLowerCase() === "avalanche" ? 
            calculatePercentageChange(stablecoinData, previousStablecoin) : 
            "Only available for Avalanche"
          }
          colors={colors}
          loading={loading}
          error={error}
          icon={<Coins className="h-4 w-4" />}
        />
      </div>
      <div className="col-span-2">
        <BentoCardSimple
          title="Price"
          value={formatValue(priceData, 'price')}
          subtitle={calculatePercentageChange(priceData, previousPrice)}
          colors={colors}
          loading={loading}
          error={error}
          icon={<DollarSign className="h-4 w-4" />}
        />
      </div>
    </>
  )
} 