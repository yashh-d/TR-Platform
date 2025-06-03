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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { FileText, ArrowUp, ArrowDown, TrendingUp, TrendingDown, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DeFiApp {
  id: number;
  dapp_id: number;
  name: string;
  logo: string | null;
  time_range: string;
  rank: number;
  is_active: boolean | null;
  chains: string | null;
  token_name: string | null;
  token_logo: string | null;
  token_price: number | null;
  token_price_change: number | null;
  token_symbol: string | null;
  market_cap: number | null;
  market_cap_change: number | null;
  adjusted_tvl: number | null;
  adjusted_tvl_change: number | null;
  tvl: number | null;
  tvl_change: number | null;
  market_cap_tvl_ratio: number | null;
  updated_at: string | null;
  created_at: string | null;
}

interface AvalancheDeFiTableProps {
  network: string;
  limit?: number;
  maxHeight?: string;
  defaultTimeRange?: string;
}

export function AvalancheDeFiTable({
  network,
  limit = 20,
  maxHeight = "600px",
  defaultTimeRange = "24h"
}: AvalancheDeFiTableProps) {
  const [defiApps, setDefiApps] = useState<DeFiApp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRanges, setTimeRanges] = useState<string[]>([])
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>(defaultTimeRange)
  const [sortBy, setSortBy] = useState<'rank' | 'tvl' | 'market_cap'>('rank')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Fetch available time ranges
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

    async function fetchTimeRanges() {
      try {
        const { data, error: fetchError } = await supabase
          .from('avalanche_defi_apps')
          .select('time_range')

        if (fetchError) throw fetchError

        const ranges = Array.from(new Set(data.map((item: any) => item.time_range))).filter(Boolean) as string[]
        setTimeRanges(ranges)

        // Set default time range if not in available ranges
        if (ranges.length > 0 && !ranges.includes(selectedTimeRange)) {
          setSelectedTimeRange(ranges[0])
        }
      } catch (err) {
        console.error('Error fetching time ranges:', err)
        setError('Failed to load time ranges')
      }
    }

    fetchTimeRanges()
  }, [network, selectedTimeRange])

  // Fetch DeFi apps data
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

    async function fetchDeFiApps() {
      try {
        setLoading(true)

        let query = supabase
          .from('avalanche_defi_apps')
          .select('*')
          .eq('time_range', selectedTimeRange)
          .eq('is_active', true)

        // Apply sorting
        if (sortBy === 'rank') {
          query = query.order('rank', { ascending: sortOrder === 'asc' })
        } else if (sortBy === 'tvl') {
          query = query.order('tvl', { ascending: sortOrder === 'asc', nullsFirst: false })
        } else if (sortBy === 'market_cap') {
          query = query.order('market_cap', { ascending: sortOrder === 'asc', nullsFirst: false })
        }

        // Limit results
        query = query.limit(limit)

        const { data, error: fetchError } = await query

        if (fetchError) throw fetchError

        setDefiApps(data as DeFiApp[])
        setError(null)
      } catch (err) {
        console.error('Error fetching DeFi apps:', err)
        setError('Failed to load DeFi apps data')
      } finally {
        setLoading(false)
      }
    }

    if (selectedTimeRange) {
      fetchDeFiApps()
    }
  }, [network, selectedTimeRange, sortBy, sortOrder, limit])

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

  // Format percentage change
  const formatPercentage = (percentage: number | null): React.ReactElement => {
    if (percentage === null) return <span className="text-gray-400">-</span>
    
    const isPositive = percentage >= 0
    const formattedValue = `${isPositive ? '+' : ''}${percentage.toFixed(2)}%`
    
    return (
      <span className={`flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? (
          <ArrowUp className="h-3.5 w-3.5 mr-1" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5 mr-1" />
        )}
        {formattedValue}
      </span>
    )
  }

  // Handle sorting
  const handleSort = (column: 'rank' | 'tvl' | 'market_cap') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder(column === 'rank' ? 'asc' : 'desc')
    }
  }

  // Get chains array
  const getChainsArray = (chains: string | null): string[] => {
    if (!chains) return []
    try {
      return JSON.parse(chains)
    } catch {
      return chains.split(',').map(chain => chain.trim())
    }
  }

  if (network.toLowerCase() !== "avalanche") {
    return (
      <div className="rounded-md border p-6 text-center text-gray-500">
        <p>DeFi apps data is currently only available for Avalanche.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      {/* Filters */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Time Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
            <Select 
              value={selectedTimeRange} 
              onValueChange={setSelectedTimeRange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Time Ranges</SelectLabel>
                  {timeRanges.length > 0 ? (
                    timeRanges.map(range => (
                      <SelectItem key={range} value={range}>
                        {range}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="24h">24h</SelectItem>
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <Select 
              value={sortBy} 
              onValueChange={(value) => setSortBy(value as 'rank' | 'tvl' | 'market_cap')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Sort Options</SelectLabel>
                  <SelectItem value="rank">Rank</SelectItem>
                  <SelectItem value="tvl">TVL</SelectItem>
                  <SelectItem value="market_cap">Market Cap</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="mt-6"
            >
              {sortOrder === 'asc' ? (
                <>
                  <ArrowUp className="h-4 w-4 mr-1" />
                  Ascending
                </>
              ) : (
                <>
                  <ArrowDown className="h-4 w-4 mr-1" />
                  Descending
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="w-full flex justify-center py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="w-full py-4 px-6 text-center text-red-500">
          <p>{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && (!defiApps || defiApps.length === 0) && (
        <div className="w-full py-8 text-center text-gray-500">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2">No DeFi apps found for the selected filters.</p>
        </div>
      )}

      {/* Data Table */}
      {!loading && !error && defiApps && defiApps.length > 0 && (
        <div style={{ maxHeight, overflowY: 'auto' }}>
          <Table className="w-full">
            <TableHeader className="sticky top-0 bg-white z-10">
              <TableRow>
                <TableHead className="w-[60px] text-center">Rank</TableHead>
                <TableHead className="w-[250px]">Protocol</TableHead>
                <TableHead className="w-[120px]">Chains</TableHead>
                <TableHead className="w-[150px] text-right cursor-pointer" onClick={() => handleSort('tvl')}>
                  <div className="flex items-center justify-end">
                    TVL
                    {sortBy === 'tvl' && (
                      sortOrder === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="w-[100px] text-right">TVL Change</TableHead>
                <TableHead className="w-[150px] text-right cursor-pointer" onClick={() => handleSort('market_cap')}>
                  <div className="flex items-center justify-end">
                    Market Cap
                    {sortBy === 'market_cap' && (
                      sortOrder === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="w-[100px] text-right">MC Change</TableHead>
                <TableHead className="w-[120px] text-right">Token</TableHead>
                <TableHead className="w-[100px] text-right">MC/TVL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {defiApps.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="text-center font-medium">
                    #{app.rank}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      {app.logo && (
                        <img 
                          src={app.logo} 
                          alt={app.name}
                          className="w-8 h-8 rounded-full"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      )}
                      <div>
                        <div className="font-medium">{app.name}</div>
                        {app.token_name && app.token_symbol && (
                          <div className="text-sm text-gray-500">
                            {app.token_name} ({app.token_symbol})
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {getChainsArray(app.chains).slice(0, 3).map((chain, idx) => (
                        <span 
                          key={idx}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {chain}
                        </span>
                      ))}
                      {getChainsArray(app.chains).length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{getChainsArray(app.chains).length - 3}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(app.tvl)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercentage(app.tvl_change)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(app.market_cap)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercentage(app.market_cap_change)}
                  </TableCell>
                  <TableCell className="text-right">
                    {app.token_price !== null ? (
                      <div>
                        <div className="font-medium">
                          ${app.token_price.toFixed(4)}
                        </div>
                        {app.token_price_change !== null && (
                          <div className="text-xs">
                            {formatPercentage(app.token_price_change)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {app.market_cap_tvl_ratio !== null ? (
                      <span className="font-medium">
                        {app.market_cap_tvl_ratio.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
} 