"use client"

import { useState, useEffect } from "react"
import { BentoCardSimple } from "@/components/ui/bento-card-simple"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { Network } from "lucide-react"

interface SubnetCountCardProps {
  network: string
  colors: string[]
}

export function SubnetCountCard({ network, colors }: SubnetCountCardProps) {
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSubnetCount() {
      setLoading(true)
      setError(null)

      try {
        // Only fetch data for Avalanche network
        if (network.toLowerCase() !== "avalanche") {
          setCount(null)
          setLoading(false)
          return
        }

        // Check if Supabase is configured
        if (!isSupabaseConfigured()) {
          throw new Error("Supabase is not properly configured")
          setLoading(false)
          return
        }

        // Fetch subnet count directly from the table
        const { count: subnetCount, error } = await supabase
          .from('avalanche_subnets')
          .select('*', { count: 'exact', head: true })

        if (error) {
          throw new Error(`Error counting subnets: ${error.message}`)
        }

        setCount(subnetCount)
      } catch (err) {
        console.error("Failed to fetch subnet count:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchSubnetCount()
  }, [network])

  return (
    <BentoCardSimple
      title="Total L1s"
      value={count !== null ? count.toString() : "-"}
      colors={colors}
      loading={loading}
      error={error}
      icon={<Network className="h-4 w-4" />}
    />
  )
} 