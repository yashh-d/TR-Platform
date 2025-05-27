"use client"

import { useEffect, useState } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface ProtocolDebugProps {
  network?: string
}

export function ProtocolDebug({ network = "avalanche" }: ProtocolDebugProps) {
  const [results, setResults] = useState<string>("")
  const [loading, setLoading] = useState(false)

  // Function to test RPC call
  const testRpcFunction = async () => {
    setLoading(true)
    setResults("Running tests...\n")
    
    try {
      // First check if the RPC function exists
      setResults(prev => prev + "Checking if RPC function exists...\n")
      const { data: functionData, error: functionError } = await supabase
        .from('pg_proc')
        .select('proname')
        .eq('proname', 'get_distinct_protocol_metrics_protocols')
        .limit(1)
      
      if (functionError) {
        setResults(prev => prev + `Error checking function existence: ${functionError.message}\n`)
      } else {
        setResults(prev => prev + `RPC function exists: ${functionData.length > 0 ? 'Yes' : 'No'}\n`)
      }

      // Try to call the RPC function
      setResults(prev => prev + "\nTrying RPC function call...\n")
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_distinct_protocol_metrics_protocols')
      
      if (rpcError) {
        setResults(prev => prev + `RPC call error: ${rpcError.message}\n`)
      } else {
        setResults(prev => prev + `RPC call succeeded, found ${rpcData?.length || 0} protocols\n`)
        if (rpcData && rpcData.length > 0) {
          const protocols = rpcData.map(p => p.protocol).join(', ')
          setResults(prev => prev + `Protocols from RPC: ${protocols}\n`)
        } else {
          setResults(prev => prev + "No protocols returned from RPC\n")
        }
      }

      // Try a direct query to the table
      setResults(prev => prev + "\nTrying direct query...\n")
      
      // Check if table exists
      const { count, error: countError } = await supabase
        .from('avalanche_protocol_metrics')
        .select('*', { count: 'exact', head: true })
      
      if (countError) {
        setResults(prev => prev + `Error counting rows: ${countError.message}\n`)
      } else {
        setResults(prev => prev + `Table exists with ${count} rows\n`)
      }
      
      // Get distinct protocols directly
      const { data: directData, error: directError } = await supabase
        .from('avalanche_protocol_metrics')
        .select('protocol')
      
      if (directError) {
        setResults(prev => prev + `Direct query error: ${directError.message}\n`)
      } else {
        const uniqueProtocols = [...new Set(directData.map(item => item.protocol))].filter(Boolean)
        setResults(prev => prev + `Direct query succeeded, found ${uniqueProtocols.length} distinct protocols\n`)
        if (uniqueProtocols.length > 0) {
          setResults(prev => prev + `Protocols from direct query: ${uniqueProtocols.join(', ')}\n`)
        } else {
          setResults(prev => prev + "No protocols found in direct query\n")
        }
        
        // Check sample data to make sure it's not just Aave
        const sample = directData.slice(0, 10)
        setResults(prev => prev + `\nSample data (first 10 rows):\n${JSON.stringify(sample, null, 2)}\n`)
      }
      
    } catch (err) {
      setResults(prev => prev + `Unexpected error: ${err instanceof Error ? err.message : String(err)}\n`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Protocol RPC Debug</h3>
        <Button onClick={testRpcFunction} disabled={loading}>
          {loading ? "Testing..." : "Run Tests"}
        </Button>
      </div>
      <pre className="bg-gray-100 p-4 rounded text-xs font-mono overflow-auto max-h-[400px]">
        {results || "Click 'Run Tests' to debug protocol data"}
      </pre>
    </Card>
  )
} 