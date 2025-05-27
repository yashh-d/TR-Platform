"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"

interface DataTableProps {
  network: string
}

export function DataTable({ network }: DataTableProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        
        // Simple direct query to get data from avalanche_core
        const { data, error } = await supabase
          .from('avalanche_core')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(10)
        
        if (error) throw error
        
        setData(data || [])
      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
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
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Transactions</TableHead>
            <TableHead className="text-right">Active Addresses</TableHead>
            <TableHead className="text-right">Avg TPS</TableHead>
            <TableHead className="text-right">Fees Paid</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          {data.map((row, index) => (
            <TableRow key={index}>
              <TableCell>{row.date}</TableCell>
              <TableCell className="text-right">{row.txCount}</TableCell>
              <TableCell className="text-right">{row.activeAddresses}</TableCell>
              <TableCell className="text-right">{row.avgTps}</TableCell>
              <TableCell className="text-right">{row.feesPaid}</TableCell>
                </TableRow>
          ))}
          </TableBody>
        </Table>
    </div>
  )
}
