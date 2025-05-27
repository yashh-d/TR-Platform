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
import { FileText, TrendingUp, TrendingDown } from "lucide-react"

interface TopDAppsMetric {
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

interface DAppsTableFilters {
  metricType: string;
  metricRange: string;
  filterCategory: string;
  captureDate: string;
}

interface AvalancheTopDAppsTableProps {
  maxHeight?: string;
}

export function AvalancheTopDAppsTable({ maxHeight = "600px" }: AvalancheTopDAppsTableProps) {
  const [data, setData] = useState<TopDAppsMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Available filter options
  const [metricTypes, setMetricTypes] = useState<string[]>([])
  const [metricRanges, setMetricRanges] = useState<string[]>([])
  const [filterCategories, setFilterCategories] = useState<string[]>([])
  const [captureDates, setCaptureDates] = useState<string[]>([])
  
  // Current filter values
  const [filters, setFilters] = useState<DAppsTableFilters>({
    metricType: '',
    metricRange: '',
    filterCategory: '',
    captureDate: ''
  })

  // Fetch filter options when component mounts
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setError("Supabase not configured properly")
      setLoading(false)
      return
    }

    async function fetchFilterOptions() {
      try {
        // Fetch distinct metric types
        const { data: metricTypeData, error: metricTypeError } = await supabase
          .from('avalanche_dapps_topmetrics')
          .select('metric_type')
          .not('metric_type', 'is', null)
        
        if (metricTypeError) throw metricTypeError
        
        const uniqueMetricTypes = Array.from(new Set(metricTypeData.map(item => item.metric_type)))
        setMetricTypes(uniqueMetricTypes)
        
        // Set default metric type if available
        if (uniqueMetricTypes.length > 0) {
          setFilters(prev => ({ ...prev, metricType: uniqueMetricTypes[0] }))
        }
        
        // Fetch distinct metric ranges
        const { data: metricRangeData, error: metricRangeError } = await supabase
          .from('avalanche_dapps_topmetrics')
          .select('metric_range')
          .not('metric_range', 'is', null)
        
        if (metricRangeError) throw metricRangeError
        
        const uniqueMetricRanges = Array.from(new Set(metricRangeData.map(item => item.metric_range)))
        setMetricRanges(uniqueMetricRanges)
        
        // Set default metric range if available
        if (uniqueMetricRanges.length > 0) {
          setFilters(prev => ({ ...prev, metricRange: uniqueMetricRanges[0] }))
        }
        
        // Fetch distinct filter categories
        const { data: filterCategoryData, error: filterCategoryError } = await supabase
          .from('avalanche_dapps_topmetrics')
          .select('filter_category')
          .not('filter_category', 'is', null)
        
        if (filterCategoryError) throw filterCategoryError
        
        const uniqueFilterCategories = Array.from(new Set(filterCategoryData.map(item => item.filter_category)))
        setFilterCategories(uniqueFilterCategories)
        
        // Set default filter category if available
        if (uniqueFilterCategories.length > 0) {
          setFilters(prev => ({ ...prev, filterCategory: uniqueFilterCategories[0] }))
        }
        
        // Fetch distinct capture dates (most recent first)
        const { data: captureDateData, error: captureDateError } = await supabase
          .from('avalanche_dapps_topmetrics')
          .select('capture_date')
          .order('capture_date', { ascending: false })
        
        if (captureDateError) throw captureDateError
        
        const uniqueCaptureDates = Array.from(new Set(captureDateData.map(item => item.capture_date)))
        setCaptureDates(uniqueCaptureDates)
        
        // Set default to most recent date
        if (uniqueCaptureDates.length > 0) {
          setFilters(prev => ({ ...prev, captureDate: uniqueCaptureDates[0] }))
        }
      } catch (err) {
        console.error('Error fetching filter options:', err)
        setError('Failed to load filter options')
      }
    }

    fetchFilterOptions()
  }, [])

  // Fetch data based on filters
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return
    }
    
    // Only fetch if all filters are set
    if (!filters.metricType || !filters.metricRange || !filters.captureDate) {
      return
    }

    async function fetchData() {
      try {
        setLoading(true)
        
        let query = supabase
          .from('avalanche_dapps_topmetrics')
          .select('*')
          .eq('metric_type', filters.metricType)
          .eq('metric_range', filters.metricRange)
          .eq('capture_date', filters.captureDate)
        
        // Apply filter category if selected
        if (filters.filterCategory) {
          query = query.eq('filter_category', filters.filterCategory)
        }
        
        // Order by rank
        query = query.order('rank', { ascending: true })
        
        const { data: metricsData, error: metricsError } = await query
        
        if (metricsError) throw metricsError
        
        setData(metricsData)
        setError(null)
      } catch (err) {
        console.error('Error fetching metrics data:', err)
        setError('Failed to load metrics data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [filters])

  // Format value based on metric type
  const formatValue = (value: number | null, metricType: string): string => {
    if (value === null) return '-'
    
    switch (metricType.toLowerCase()) {
      case 'volume':
      case 'tvl':
      case 'revenue':
        return `$${value.toLocaleString()}`
      case 'users':
      case 'transactions':
        return value.toLocaleString()
      case 'fees':
        return `$${value.toLocaleString()}`
      default:
        return value.toString()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {/* Metric Type Filter */}
        <div className="w-48">
          <Select 
            value={filters.metricType} 
            onValueChange={(value) => setFilters(prev => ({ ...prev, metricType: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Metric" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Metric Type</SelectLabel>
                {metricTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        
        {/* Metric Range Filter */}
        <div className="w-48">
          <Select 
            value={filters.metricRange} 
            onValueChange={(value) => setFilters(prev => ({ ...prev, metricRange: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Time Range</SelectLabel>
                {metricRanges.map(range => (
                  <SelectItem key={range} value={range}>
                    {range}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        
        {/* Filter Category */}
        <div className="w-48">
          <Select 
            value={filters.filterCategory} 
            onValueChange={(value) => setFilters(prev => ({ ...prev, filterCategory: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Category</SelectLabel>
                <SelectItem value="">All Categories</SelectItem>
                {filterCategories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        
        {/* Capture Date Filter */}
        <div className="w-48">
          <Select 
            value={filters.captureDate} 
            onValueChange={(value) => setFilters(prev => ({ ...prev, captureDate: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Date</SelectLabel>
                {captureDates.map(date => (
                  <SelectItem key={date} value={date}>
                    {new Date(date).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && (
        <div className="w-full py-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="w-full py-4 px-6 rounded-md bg-red-50 text-red-600">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="w-full py-8 text-center text-gray-500">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2">No data available for the selected filters.</p>
        </div>
      )}

      {!loading && !error && data.length > 0 && (
        <div className="rounded-md border">
          <div style={{ maxHeight, overflowY: 'auto' }}>
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead className="w-[60px]">Rank</TableHead>
                  <TableHead>dApp</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">
                    {filters.metricType.charAt(0).toUpperCase() + filters.metricType.slice(1)}
                  </TableHead>
                  <TableHead className="text-right w-[120px]">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.rank}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      {item.categories ? item.categories.split(',')[0] : 'Unknown'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatValue(item.value, item.metric_type)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.percentage_change !== null && (
                        <div className={`flex items-center justify-end ${
                          item.percentage_change > 0 
                            ? 'text-green-600' 
                            : item.percentage_change < 0 
                              ? 'text-red-600' 
                              : 'text-gray-500'
                        }`}>
                          {item.percentage_change > 0 ? (
                            <TrendingUp className="h-4 w-4 mr-1" />
                          ) : item.percentage_change < 0 ? (
                            <TrendingDown className="h-4 w-4 mr-1" />
                          ) : null}
                          {Math.abs(item.percentage_change).toFixed(2)}%
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
} 