"use client"

import { useState, useEffect } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { BentoCardSimple } from "@/components/ui/bento-card-simple"
import { Package } from "lucide-react"

interface AvalacheDAppsStatsProps {
  network: string;
  colors: string[];
}

export function AvalacheDAppsStats({ network, colors }: AvalacheDAppsStatsProps) {
  const [totalDApps, setTotalDApps] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Only fetch for Avalanche network
    if (network.toLowerCase() !== "avalanche") {
      setLoading(false)
      return
    }

    if (!isSupabaseConfigured()) {
      setError("Supabase not configured properly")
      setLoading(false)
      return
    }

    async function fetchDAppCount() {
      try {
        setLoading(true)
        
        // Get count of dApps
        const { count, error: countError } = await supabase
          .from('avalanche_dapps')
          .select('*', { count: 'exact', head: true })
        
        if (countError) {
          throw countError
        }
        
        setTotalDApps(count)
      } catch (err) {
        console.error('Error fetching dApp count:', err)
        setError('Failed to load dApp statistics')
      } finally {
        setLoading(false)
      }
    }

    fetchDAppCount()
  }, [network])

  // If not Avalanche, return a placeholder value
  if (network.toLowerCase() !== "avalanche") {
    return (
      <BentoCardSimple
        title="Total dApps"
        value={network === "ethereum" ? "4,236" : "687"}
        colors={colors}
        icon={<Package className="h-4 w-4" />}
      />
    )
  }

  return (
    <BentoCardSimple
      title="Total dApps"
      value={totalDApps !== null ? totalDApps.toLocaleString() : "Loading..."}
      colors={colors}
      loading={loading}
      error={error}
      icon={<Package className="h-4 w-4" />}
    />
  )
} 