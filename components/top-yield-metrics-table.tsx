"use client"

import { useState, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { ArrowUp, ArrowDown, TrendingUp, Download, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

interface YieldMetric {
  id: number;
  project: string;
  symbol: string;
  pool: string;
  tvl_usd: number | null;
  apy: number | null;
}

interface TopYieldMetricsTableProps {
  network: string;
  limit?: number;
  maxHeight?: string;
  sortBy?: 'tvl' | 'apy';
}

export function TopYieldMetricsTable({
  network,
  limit = 10,
  maxHeight = "600px",
  sortBy: defaultSortBy = 'tvl'
}: TopYieldMetricsTableProps) {
  const [yieldMetrics, setYieldMetrics] = useState<YieldMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'tvl' | 'apy'>(defaultSortBy)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Fetch yield metrics data
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

    async function fetchYieldMetrics() {
      try {
        setLoading(true)

        let query = supabase
          .from('avalanche_yield_metrics')
          .select('id, project, symbol, pool, tvl_usd, apy')

        // Apply sorting
        if (sortBy === 'tvl') {
          query = query
            .not('tvl_usd', 'is', null)
            .gt('tvl_usd', 0)
            .order('tvl_usd', { ascending: sortOrder === 'asc', nullsFirst: false })
        } else if (sortBy === 'apy') {
          query = query
            .not('apy', 'is', null)
            .gt('apy', 0)
            .order('apy', { ascending: sortOrder === 'asc', nullsFirst: false })
        }

        // Limit results
        query = query.limit(limit)

        const { data, error: fetchError } = await query

        if (fetchError) throw fetchError

        setYieldMetrics(data as YieldMetric[])
        setError(null)
      } catch (err) {
        console.error('Error fetching yield metrics:', err)
        setError('Failed to load yield metrics data')
      } finally {
        setLoading(false)
      }
    }

    fetchYieldMetrics()
  }, [network, sortBy, sortOrder, limit])

  // Format currency values
  const formatCurrency = (value: number | null): string => {
    if (value === null || value === 0) return '-'
    
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

  // Format APY percentage
  const formatAPY = (apy: number | null): string => {
    if (apy === null) return '-'
    return `${apy.toFixed(2)}%`
  }

  // Handle sorting
  const handleSort = (column: 'tvl' | 'apy') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc') // Default to descending for new column
    }
  }

  // Handle CSV download
  const handleDownload = () => {
    if (yieldMetrics.length === 0) return
    
    let csvContent = "data:text/csv;charset=utf-8,"
    
    // Add headers
    csvContent += "Rank,Project,Symbol,Pool,TVL_USD,APY\n"
    
    // Add data rows
    yieldMetrics.forEach((metric, index) => {
      csvContent += `${index + 1},${metric.project},${metric.symbol},${metric.pool || 'N/A'},${metric.tvl_usd || 0},${metric.apy || 0}\n`
    })
    
    // Create download link
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${network}_top_yield_metrics.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (network.toLowerCase() !== "avalanche") {
    return (
      <div className="rounded-md border p-6 text-center text-gray-500">
        <p>Yield metrics data is currently only available for Avalanche.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-md border">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Top {limit} Yield Metrics</h3>
            <div className="flex items-center space-x-2">
              <div className="w-32 h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
        <div className="overflow-auto" style={{ maxHeight }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Pool</TableHead>
                <TableHead className="text-right">TVL</TableHead>
                <TableHead className="text-right">APY</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array(limit).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell><div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                  <TableCell><div className="w-12 h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                  <TableCell><div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                  <TableCell className="text-right"><div className="w-16 h-4 bg-gray-200 rounded animate-pulse ml-auto"></div></TableCell>
                  <TableCell className="text-right"><div className="w-12 h-4 bg-gray-200 rounded animate-pulse ml-auto"></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border p-6 text-center text-red-500">
        <p>{error}</p>
      </div>
    )
  }

  if (!yieldMetrics.length) {
    return (
      <div className="rounded-md border p-6 text-center text-gray-500">
        <p>No yield metrics data available.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border w-full h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Top {limit} Yield Metrics</h3>
            <p className="text-sm text-gray-600">
              Ranked by {sortBy === 'tvl' ? 'Total Value Locked' : 'Annual Percentage Yield'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={sortBy} onValueChange={(value: 'tvl' | 'apy') => setSortBy(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tvl">Sort by TVL</SelectItem>
                <SelectItem value="apy">Sort by APY</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDownload}
              className="text-xs"
            >
              <Download className="h-3 w-3 mr-1" />
              CSV
            </Button>
          </div>
        </div>
      </div>
      
      <div className="h-full flex flex-col">
        <Table>
          <TableHeader>
            <TableRow className="h-12">
              <TableHead className="w-16 text-center text-base font-semibold">#</TableHead>
              <TableHead className="min-w-[140px] text-base font-semibold">Project</TableHead>
              <TableHead className="min-w-[110px] text-base font-semibold">Symbol</TableHead>
              <TableHead className="min-w-[220px] text-base font-semibold">Pool</TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-gray-50 min-w-[110px] text-base font-semibold"
                onClick={() => handleSort('tvl')}
              >
                <div className="flex items-center justify-end">
                  TVL
                  {sortBy === 'tvl' && (
                    sortOrder === 'desc' ? <ArrowDown className="h-4 w-4 ml-1" /> : <ArrowUp className="h-4 w-4 ml-1" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-gray-50 min-w-[90px] text-base font-semibold"
                onClick={() => handleSort('apy')}
              >
                <div className="flex items-center justify-end">
                  APY
                  {sortBy === 'apy' && (
                    sortOrder === 'desc' ? <ArrowDown className="h-4 w-4 ml-1" /> : <ArrowUp className="h-4 w-4 ml-1" />
                  )}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {yieldMetrics.map((metric, index) => (
              <TableRow key={metric.id} className="hover:bg-gray-50 h-16">
                <TableCell className="font-semibold text-gray-600 text-center py-3 text-base">
                  {index + 1}
                </TableCell>
                <TableCell className="min-w-[140px] py-3">
                  <div className="flex items-center">
                    <div>
                      <div className="font-semibold text-base">{metric.project}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="min-w-[110px] py-3">
                  <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                    {metric.symbol}
                  </span>
                </TableCell>
                <TableCell className="min-w-[220px] py-3">
                  <div className="text-base break-words font-medium" title={metric.pool || 'N/A'}>
                    {metric.pool || 'N/A'}
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold min-w-[110px] py-3">
                  <div className="text-base">
                    {formatCurrency(metric.tvl_usd)}
                  </div>
                </TableCell>
                <TableCell className="text-right min-w-[90px] py-3">
                  <div className="flex items-center justify-end">
                    {metric.apy !== null && metric.apy > 0 && (
                      <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
                    )}
                    <span className={`font-semibold text-base ${
                      metric.apy !== null && metric.apy > 10 
                        ? 'text-green-600' 
                        : metric.apy !== null && metric.apy > 5
                        ? 'text-blue-600'
                        : 'text-gray-600'
                    }`}>
                      {formatAPY(metric.apy)}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 