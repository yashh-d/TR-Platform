"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export function AvalancheCheck() {
  const [status, setStatus] = useState("Checking...")
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any[] | null>(null)

  useEffect(() => {
    async function checkTable() {
      try {
        // Try to get the table information
        console.log("Checking avalanche_acp table...")
        
        // Try listing all tables first
        const { data: tableList, error: listError } = await supabase
          .from('_tables')
          .select('*')
          .limit(10)
          
        console.log("Available tables:", tableList)
        
        if (listError) {
          console.error("Error listing tables:", listError)
        }
        
        // Try the actual query
        const { data, error } = await supabase
          .from('avalanche_acp')
          .select('*')
          .limit(3)
          
        if (error) {
          throw error
        }
        
        if (!data || data.length === 0) {
          setStatus("No data found in table")
        } else {
          setStatus(`Found ${data.length} rows in table`)
        }
      } catch (err) {
        console.error('Error checking Avalanche table:', err)
        setError('Failed to check table. Please try again later.')
      }
    }

    checkTable()
  }, [])

  return (
    <div>
      {status}
      {error && <p>{error}</p>}
    </div>
  )
} 