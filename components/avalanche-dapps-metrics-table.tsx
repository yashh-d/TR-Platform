"use client"

import { useState, useEffect } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
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
import { FileText, ArrowUpRight, ArrowDownRight, FilterIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DAppMetric {
  id: string;
  dapp_id: number;
  name: string;
  rank: number;
  metric_type: string;
  value: number | null;
  percentage_change: number | null;
  categories: string | null;
  capture_date: string;
  last_updated: string;
  metric_range: string;
  filter_category: string | null;
}

interface MetricsTableProps {
  network: string;
  defaultMetricType?: string;
  defaultMetricRange?: string;
  defaultFilterCategory?: string;
  limit?: number;
}

export function AvalancheDAppsMetricsTable({
  network,
  defaultMetricType = "tvl",
  defaultMetricRange = "24h",
  defaultFilterCategory = null,
  limit = 10
}: MetricsTableProps) {
  const [metrics, setMetrics] = useState<DAppMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [metricTypes, setMetricTypes] = useState<string[]>([])
  const [metricRanges, setMetricRanges] = useState<string[]>([])
  const [filterCategories, setFilterCategories] = useState<string[]>([])
  
  const [selectedMetricType, setSelectedMetricType] = useState<string>(defaultMetricType)
  const [selectedMetricRange, setSelectedMetricRange] = useState<string>(defaultMetricRange)
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string | null>(defaultFilterCategory)
  
  // Fetch available filter options
  useEffect(() => {
    if (network.toLowerCase() !== "avalanche") {
      setLoading(false)
      return
    }
    
    if (!isSupabaseConfigured()) {
      setError("Supabase not configured properly")
      setLoading(false)
      return
    }
    
    async function fetchFilterOptions() {
      try {
        // Get distinct metric_types
        const { data: typeData, error: typeError } = await supabase
          .from('avalanche_dapps_topmetrics')
          .select('metric_type')
          .distinct()
        
        if (typeError) throw typeError
        
        // Get distinct metric_ranges
        const { data: rangeData, error: rangeError } = await supabase
          .from('avalanche_dapps_topmetrics')
          .select('metric_range')
          .distinct()
        
        if (rangeError) throw rangeError
        
        // Get distinct filter_categories
        const { data: categoryData, error: categoryError } = await supabase
          .from('avalanche_dapps_topmetrics')
          .select('filter_category')
          .distinct()
          .not('filter_category', 'is', null)
        
        if (categoryError) throw categoryError
        
        // Extract and set the options
        setMetricTypes(typeData.map(item => item.metric_type))
        setMetricRanges(rangeData.map(item => item.metric_range))
        setFilterCategories(categoryData.map(item => item.filter_category).filter(Boolean))
        
        // Set defaults if current selections aren't in available options
        if (typeData.length && !typeData.some(item => item.metric_type === selectedMetricType)) {
          setSelectedMetricType(typeData[0].metric_type)
        }
        
        if (rangeData.length && !rangeData.some(item => item.metric_range === selectedMetricRange)) {
          setSelectedMetricRange(rangeData[0].metric_range)
        }
      } catch (err) {
        console.error('Error fetching filter options:', err)
        setError('Failed to load filter options')
      }
    }
    
    fetchFilterOptions()
  }, [network])
  
  // Fetch metrics data based on filters
  useEffect(() => {
    if (network.toLowerCase() !== "avalanche") {
      setLoading(false)
      return
    }
    
    if (!isSupabaseConfigured()) {
      setError("Supabase not configured properly")
      setLoading(false)
      return
    }
    
    async function fetchMetrics() {
      try {
        setLoading(true)
        
        // Start building query
        let query = supabase
          .from('avalanche_dapps_topmetrics')
          .select('*')
          .eq('metric_type', selectedMetricType)
          .eq('metric_range', selectedMetricRange)
        
        // Apply category filter if selected
        if (selectedFilterCategory) {
          query = query.eq('filter_category', selectedFilterCategory)
        }
        
        // Get latest capture_date
        const { data: dateData, error: dateError } = await supabase
          .from('avalanche_dapps_topmetrics')
          .select('capture_date')
          .order('capture_date', { ascending: false })
          .limit(1)
        
        if (dateError) throw dateError
        
        if (dateData && dateData.length > 0) {
          const latestDate = dateData[0].capture_date
          query = query.eq('capture_date', latestDate)
        }
        
        // Order by rank and limit results
        query = query.order('rank', { ascending: true }).limit(limit)
        
        const { data, error: fetchError } = await query
        
        if (fetchError) throw fetchError
        
        setMetrics(data as DAppMetric[])
        setError(null)
      } catch (err) {
        console.error('Error fetching metrics:', err)
        setError('Failed to load metrics data')
      } finally {
        setLoading(false)
      }
    }
    
    if (selectedMetricType && selectedMetricRange) {
      fetchMetrics()
    }
  }, [network, selectedMetricType, selectedMetricRange, selectedFilterCategory, limit])
  
  // Format value based on metric type
  const formatValue = (value: number | null, metricType: string): string => {
    if (value === null) return 'N/A'
    
    switch (metricType.toLowerCase()) {
      case 'tvl':
      case 'volume':
      case 'liquidity':
      case 'revenue':
        // Format as currency with appropriate suffix
        if (value >= 1e9) {
          return `$${(value / 1e9).toFixed(2)}B`
        } else if (value >= 1e6) {
          return `$${(value / 1e6).toFixed(2)}M`
        } else if (value >= 1e3) {
          return `$${(value / 1e3).toFixed(2)}K`
        } else {
          return `$${value.toFixed(2)}`
        }
      case 'users':
      case 'transactions':
      case 'active_wallets':
        // Format as number with appropriate suffix
        if (value >= 1e6) {
          return `${(value / 1e6).toFixed(2)}M`
        } else if (value >= 1e3) {
          return `${(value / 1e3).toFixed(2)}K`
        } else {
          return value.toFixed(0)
        }
      default:
        // Default formatting
        return value.toFixed(2)
    }
  }
  
  // Get user-friendly names for metric types
  const getMetricTypeName = (type: string): string => {
    const metricNames: Record<string, string> = {
      'tvl': 'Total Value Locked',
      'volume': 'Trading Volume',
      'users': 'Active Users',
      'transactions': 'Transactions',
      'revenue': 'Revenue',
      'active_wallets': 'Active Wallets'
    }
    
    return metricNames[type.toLowerCase()] || type
  }
  
  // Get user-friendly names for metric ranges
  const getMetricRangeName = (range: string): string => {
    const rangeNames: Record<string, string> = {
      '24h': 'Last 24 Hours',
      '7d': 'Last 7 Days',
      '30d': 'Last 30 Days',
      'all': 'All Time'
    }
    
    return rangeNames[range] || range
  }
  
  if (network.toLowerCase() !== "avalanche") {
    return (
      <div className="border rounded-md p-6 text-center text-gray-500">
        <p>dApp metrics are only available for Avalanche.</p>
      </div>
    )
  }
  
  return (
    <div className="border rounded-md overflow-hidden">
      {/* Filters */}
      <div className="bg-gray-50 p-4 border-b flex flex-wrap gap-4 items-center">
        <div className="flex items-center">
          <FilterIcon className="mr-2 h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters:</span>
        </div>
        
        {/* Metric Type Filter */}
        <Select
          value={selectedMetricType}
          onValueChange={(value) => setSelectedMetricType(value)}
          disabled={loading || !metricTypes.length}
        >
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Select Metric" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Metric</SelectLabel>
              {metricTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {getMetricTypeName(type)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        
        {/* Time Range Filter */}
        <Select
          value={selectedMetricRange}
          onValueChange={(value) => setSelectedMetricRange(value)}
          disabled={loading || !metricRanges.length}
        >
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Select Time Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Time Range</SelectLabel>
              {metricRanges.map((range) => (
                <SelectItem key={range} value={range}>
                  {getMetricRangeName(range)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        
        {/* Category Filter */}
        <Select
          value={selectedFilterCategory || ""}
          onValueChange={(value) => setSelectedFilterCategory(value || null)}
          disabled={loading || !filterCategories.length}
        >
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Filter by Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Category</SelectLabel>
              <SelectItem value="">All Categories</SelectItem>
              {filterCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      
      {/* Table */}
      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
          </div>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-500">
          <p>{error}</p>
        </div>
      ) : metrics.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2">No metrics data available for the selected filters.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px] text-center">Rank</TableHead>
              <TableHead>dApp</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">
                {getMetricTypeName(selectedMetricType)}
              </TableHead>
              <TableHead className="text-right w-[140px]">Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.map((metric) => (
              <TableRow key={metric.id}>
                <TableCell className="text-center font-mono">#{metric.rank}</TableCell>
                <TableCell className="font-medium">{metric.name}</TableCell>
                <TableCell>
                  {metric.categories?.split(',').map((category, i) => (
                    <span 
                      key={i} 
                      className="inline-flex mr-1 mb-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-800"
                    >
                      {category.trim()}
                    </span>
                  ))}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatValue(metric.value, metric.metric_type)}
                </TableCell>
                <TableCell className="text-right">
                  {metric.percentage_change === null ? (
                    <span className="text-gray-400">N/A</span>
                  ) : metric.percentage_change > 0 ? (
                    <div className="flex items-center justify-end text-green-600">
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                      {Math.abs(metric.percentage_change).toFixed(2)}%
                    </div>
                  ) : metric.percentage_change < 0 ? (
                    <div className="flex items-center justify-end text-red-600">
                      <ArrowDownRight className="h-4 w-4 mr-1" />
                      {Math.abs(metric.percentage_change).toFixed(2)}%
                    </div>
                  ) : (
                    <span className="text-gray-500">0.00%</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
} 