"use client"

import { useState } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"

export function DexVolumeDebug() {
  const [results, setResults] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  async function runTests() {
    if (!isSupabaseConfigured()) {
      setError("Supabase is not properly configured")
      return
    }

    setLoading(true)
    setError(null)
    setResults("")

    try {
      let output = "DEX Volume RPC Debug\n"
      output += "===================\n\n"

      // Test 1: Check if get_distinct_dexs function exists
      output += "Checking if get_distinct_dexs function exists...\n"
      try {
        const { data: functionsData, error: functionsError } = await supabase.rpc('get_distinct_dexs')
        
        if (functionsError) {
          output += `Error: ${functionsError.message}\n`
        } else {
          output += "Function exists and returns data.\n"
          const dexCount = functionsData?.length || 0
          output += `Found ${dexCount} distinct DEXes\n`
          
          if (dexCount > 0) {
            output += "\nTop 5 DEXes by volume:\n"
            functionsData.slice(0, 5).forEach((dex: any, index: number) => {
              output += `${index + 1}. ${dex.protocol}: ${formatVolume(dex.total_volume)} (Last updated: ${dex.last_updated})\n`
            })
          }
        }
      } catch (err) {
        output += `Error checking function existence: ${err instanceof Error ? err.message : String(err)}\n`
      }

      output += "\n"

      // Test 2: Try get_dex_volumes_data with sample parameters
      output += "Testing get_dex_volumes_data function...\n"
      try {
        // Get top DEX from the first test
        const { data: topDexes } = await supabase.rpc('get_distinct_dexs')
        const topDex = topDexes && topDexes.length > 0 ? [topDexes[0].protocol] : ["Trader Joe"]
        
        // Get data for the last 30 days
        const endDate = new Date().toISOString().split('T')[0]
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 30)
        
        output += `Fetching volume data for ${topDex[0]} from ${startDate.toISOString().split('T')[0]} to ${endDate}\n`
        
        const { data: volumeData, error: volumeError } = await supabase.rpc('get_dex_volumes_data', {
          p_protocols: topDex,
          p_start_date: startDate.toISOString().split('T')[0],
          p_end_date: endDate,
          p_interval: 'day'
        })
        
        if (volumeError) {
          output += `Error: ${volumeError.message}\n`
        } else {
          const dataCount = volumeData?.length || 0
          output += `Successfully retrieved ${dataCount} data points\n`
          
          if (dataCount > 0) {
            output += "\nSample data (first 5 entries):\n"
            volumeData.slice(0, 5).forEach((entry: any, index: number) => {
              output += `${index + 1}. Date: ${entry.date}, Volume: ${formatVolume(entry.volume)}, Cumulative: ${formatVolume(entry.cumulative_volume)}\n`
            })
          }
        }
      } catch (err) {
        output += `Error testing volume data function: ${err instanceof Error ? err.message : String(err)}\n`
      }

      output += "\n"

      // Test 3: Query the table directly to count rows
      output += "Checking avalanche_dex_volumes table...\n"
      try {
        const { count, error: countError } = await supabase
          .from('avalanche_dex_volumes')
          .select('*', { count: 'exact', head: true })
        
        if (countError) {
          output += `Error: ${countError.message}\n`
        } else {
          output += `Table exists with ${count} rows\n`
          
          // Also check the number of distinct protocols
          const { data: distinctData, error: distinctError } = await supabase
            .from('avalanche_dex_volumes')
            .select('protocol')
            .limit(1000)
          
          if (distinctError) {
            output += `Error getting distinct protocols: ${distinctError.message}\n`
          } else if (distinctData) {
            const uniqueProtocols = [...new Set(distinctData.map(item => item.protocol))]
            output += `Found ${uniqueProtocols.length} distinct protocols in direct query\n`
            
            if (uniqueProtocols.length > 0) {
              output += "\nProtocols from direct query: " + uniqueProtocols.join(", ") + "\n"
            }
          }
        }
      } catch (err) {
        output += `Error checking table: ${err instanceof Error ? err.message : String(err)}\n`
      }

      // Update results
      setResults(output)
    } catch (err) {
      setError(`Failed to run tests: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  function formatVolume(volume: number): string {
    if (!volume) return "$0"
    if (volume >= 1000000000) {
      return `$${(volume / 1000000000).toFixed(2)}B`
    } else if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(2)}M`
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(2)}K`
    } else {
      return `$${volume.toFixed(2)}`
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">DEX Volume RPC Debug</h2>
        <Button onClick={runTests} disabled={loading}>
          {loading ? "Running..." : "Run Tests"}
        </Button>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="bg-gray-100 rounded p-4 font-mono text-sm whitespace-pre-wrap overflow-auto" style={{ maxHeight: "500px" }}>
        {results || "Click 'Run Tests' to debug DEX volume data"}
      </div>
      
      <Separator className="my-4" />
      
      <div className="text-sm text-gray-500">
        <p>This tool tests the RPC functions related to DEX volume data:</p>
        <ul className="list-disc pl-5 mt-2">
          <li><code>get_distinct_dexs()</code> - Returns all distinct DEXes sorted by volume</li>
          <li><code>get_dex_volumes_data()</code> - Returns volume data for selected protocols</li>
        </ul>
      </div>
    </Card>
  )
} 