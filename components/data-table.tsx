"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"

interface DataTableProps {
  network: string
}

// Import the token list from the RWA chart
const RWA_TOKENS = [
  "bIB01", "BENJI", "WTSYX", "FLTTX", "WTSTX", "WTLGX", "WTTSX", "TIPSX", "WTGXX", "BUIDL", "XTBT", "XEVT", "bCSPX", "SKHC", "PARAVII", "NOTE", "XRV", "ACRED", "EQTYX", "MODRX", "LNGVX", "WTSIX", "SPXUX", "TECHX", "RE", "VBILL", "XFTB"
];

// Type for a row from rwa_ava2
type RwaAva2Row = { Date: string } & { [token: string]: number | string | null }

export function DataTable({ network }: DataTableProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        // Get the most recent date from rwa_ava2
        const { data: rows, error: fetchError } = await supabase
          .from('rwa_ava2')
          .select('Date,' + RWA_TOKENS.join(','))
          .order('Date', { ascending: false })
          .limit(1)
        if (fetchError) throw fetchError
        if (!rows || rows.length === 0 || typeof rows[0] !== 'object' || !('Date' in rows[0])) {
          setData([])
          return
        }
        const row = rows[0] as RwaAva2Row
        // Build array of { token, value } for this date
        const tokenValues = RWA_TOKENS.map(token => ({ token, value: Number(row[token] ?? 0) }))
        // Sort descending by value
        tokenValues.sort((a, b) => b.value - a.value)
        // Attach date for display
        setData(tokenValues.map((item, idx) => ({ ...item, rank: idx + 1, date: row.Date || '' })))
      } catch (err) {
        setError('Failed to load RWA League Table')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [network])

  if (loading) return <div>Loading data...</div>
  if (error) return <div>Error: {error}</div>
  if (!data.length) return <div>No data available</div>

  return (
    <div className="border rounded-md bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px] text-center">Rank</TableHead>
            <TableHead>Token</TableHead>
            <TableHead className="text-right">Value (USD)</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.token}>
              <TableCell className="text-center font-mono">#{row.rank}</TableCell>
              <TableCell className="font-medium">{row.token}</TableCell>
              <TableCell className="text-right font-mono">{row.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
              <TableCell>{row.date}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
