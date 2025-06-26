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
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { FileText, ArrowUp, ArrowDown } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import React from "react"

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
  metric_range: string;
  filter_category: string | null;
}

interface DAppsTopMetricsTableProps {
  network: string;
  limit?: number;
  maxHeight?: string;
}

interface RpcResponseItem {
  metric_type: string;
  metric_range: string;
  filter_category: string;
}

export function DAppsTopMetricsTable({
  network,
  limit = 10,
  maxHeight = "600px"
}: DAppsTopMetricsTableProps) {
  const [metrics, setMetrics] = useState<DAppMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metricTypes, setMetricTypes] = useState<string[]>([])
  const [metricRanges, setMetricRanges] = useState<string[]>([])
  const [filterCategories, setFilterCategories] = useState<string[]>([])
  const [selectedMetricType, setSelectedMetricType] = useState<string | null>("volume")
  const [selectedMetricRange, setSelectedMetricRange] = useState<string>("7d")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>("")
  
  // Simple test to check database connectivity
  useEffect(() => {
    async function testDatabaseConnection() {
      console.log("=== STARTING DATABASE TEST ===")
      setDebugInfo("Testing database connection...")
      
      try {
        // Test 1: Check if Supabase is configured
        console.log("1. Checking Supabase configuration...")
        if (!isSupabaseConfigured()) {
          const msg = "❌ Supabase is not configured"
          console.log(msg)
          setDebugInfo(msg)
          setError("Supabase not configured")
          setLoading(false)
          return
        }
        console.log("✅ Supabase is configured")
        
        // Test 2: Try to connect to any table first
        console.log("2. Testing basic database connection...")
        setDebugInfo("Testing basic database connection...")
        
        const { data: testData, error: testError } = await supabase
          .from('avalanche_dapps_topmetrics')
          .select('id')
          .limit(1)
        
        console.log("Basic connection test result:", { testData, testError })
        
        if (testError) {
          console.log("❌ Database connection failed:", testError)
          setDebugInfo(`❌ Database error: ${testError.message}`)
          setError(`Database connection failed: ${testError.message}`)
          setLoading(false)
          return
        }
        
        console.log("✅ Database connection successful")
        setDebugInfo("✅ Database connected, checking table...")
        
        // Test 3: Check if the table exists and has data
        console.log("3. Checking table contents...")
        const { data: tableData, error: tableError, count } = await supabase
          .from('avalanche_dapps_topmetrics')
          .select('*', { count: 'exact' })
          .limit(3)
        
        console.log("Table check result:", { tableData, tableError, count })
        
        if (tableError) {
          console.log("❌ Table access failed:", tableError)
          setDebugInfo(`❌ Table error: ${tableError.message}`)
          setError(`Table access failed: ${tableError.message}`)
          setLoading(false)
          return
        }
        
        if (!tableData || tableData.length === 0) {
          console.log("⚠️ Table exists but is empty")
          setDebugInfo(`⚠️ Table exists but is empty (${count || 0} rows)`)
          setError("No data found in table")
          setLoading(false)
          return
        }
        
        console.log('✅ Table has data:', tableData)
        setDebugInfo(`✅ Found ${count} rows in table`)
        
        // Test 4: Check what columns are available
        console.log("4. Checking available columns...")
        if (tableData && tableData.length > 0) {
          console.log("Available columns:", Object.keys(tableData[0]))
          console.log("Sample row with all columns:", tableData[0])
        }
        
        // Test 5: Extract available options
        console.log("5. Extracting filter options...")
        const availableMetricTypes = [...new Set(tableData.map(item => item.metric_type))].filter(Boolean)
        const availableRanges = [...new Set(tableData.map(item => item.metric_range))].filter(Boolean)
        const availableCategories = [...new Set(tableData.map(item => item.filter_category))].filter(Boolean)
        
        console.log("Available options:", {
          metricTypes: availableMetricTypes,
          ranges: availableRanges,
          categories: availableCategories
        })
        
        // Always include expected options, merge with database options
        const expectedMetricTypes = ["volume", "transactions", "uaw", "balance"]
        const expectedRanges = ["24h", "7d", "30d"]
        
        const allMetricTypes = [...new Set([...expectedMetricTypes, ...availableMetricTypes])]
        const allRanges = [...new Set([...expectedRanges, ...availableRanges])]
        
        setMetricTypes(allMetricTypes)
        setMetricRanges(allRanges)
        setFilterCategories(availableCategories)
        
        // Set defaults
        setSelectedMetricType("volume")
        setSelectedMetricRange("7d")
        
        setDebugInfo(`✅ Ready! Found ${allMetricTypes.length} metric types, ${allRanges.length} ranges`)
        setLoading(false)
        
      } catch (err) {
        console.error("❌ Unexpected error:", err)
        setDebugInfo(`❌ Unexpected error: ${err}`)
        setError(`Unexpected error: ${err}`)
        setLoading(false)
      }
    }
    
    if (network.toLowerCase() === "avalanche") {
      testDatabaseConnection()
    } else {
      setLoading(false)
    }
  }, [network])
  
  // Fetch metrics data based on selected filters
  useEffect(() => {
    // Only fetch for Avalanche network
    if (network.toLowerCase() !== "avalanche") {
      return
    }
    
    if (!isSupabaseConfigured()) {
      return
    }
    
    // Don't fetch if metric type isn't selected yet
    if (!selectedMetricType) return
    
    async function fetchMetrics() {
      try {
        setLoading(true)
        
        // Add debugging logs
        console.log('=== FETCHING METRICS ===')
        console.log('Fetching metrics with filters:', {
          metric_type: selectedMetricType,
          metric_range: selectedMetricRange,
          filter_category: selectedCategory,
          limit: limit
        })
        
        // First, get the latest capture_date
        const { data: latestDateData, error: dateError } = await supabase
          .from('avalanche_dapps_topmetrics')
          .select('capture_date')
          .order('capture_date', { ascending: false })
          .limit(1)
        
        if (dateError) {
          console.error('Date error:', dateError)
          throw dateError
        }
        
        if (!latestDateData || latestDateData.length === 0) {
          console.log('No dates found in table')
          setError('No data available')
          setLoading(false)
          return
        }
        
        const latestDate = latestDateData[0].capture_date
        console.log('Latest capture date:', latestDate)
        
        // Build the query
        let query = supabase
          .from('avalanche_dapps_topmetrics')
          .select('*')
          .eq('capture_date', latestDate)
          .eq('metric_type', selectedMetricType)
          .eq('metric_range', selectedMetricRange)
        
        // Apply category filter if selected
        if (selectedCategory) {
          query = query.eq('filter_category', selectedCategory)
        }
        
        // Order by rank and limit results
        query = query.order('rank', { ascending: true }).limit(limit)
        
        console.log('Executing query with filters:', {
          capture_date: latestDate,
          metric_type: selectedMetricType,
          metric_range: selectedMetricRange,
          filter_category: selectedCategory || 'none'
        })
        
        const { data, error: fetchError } = await query
        
        if (fetchError) {
          console.error('Query Error:', fetchError)
          throw fetchError
        }
        
        console.log('Query successful!')
        console.log('Received data:', data)
        console.log('Data length:', data?.length || 0)
        
        if (data && data.length > 0) {
          console.log('First row sample:', data[0])
          // Log percentage_change values specifically
          console.log('Percentage changes in data:')
          data.forEach((item, index) => {
            console.log(`  ${index + 1}. ${item.name}: ${item.percentage_change} (type: ${typeof item.percentage_change})`)
          })
        }
        
        setMetrics(data as DAppMetric[])
        setError(null)
        setDebugInfo(`✅ Loaded ${data?.length || 0} metrics for ${selectedMetricType} (${selectedMetricRange})`)
      } catch (err) {
        console.error('Error fetching metrics:', err)
        setError(`Failed to load metrics data: ${err}`)
        setDebugInfo(`❌ Failed to load metrics: ${err}`)
      } finally {
        setLoading(false)
      }
    }
    
    fetchMetrics()
  }, [selectedMetricType, selectedMetricRange, selectedCategory, limit, metricTypes])
  
  // Format value based on metric type
  const formatValue = (value: number | null, metricType: string): string => {
    if (value === null) return '-'
    
    // Format based on metric type
    if (metricType.toLowerCase().includes('tvl') || 
        metricType.toLowerCase().includes('volume')) {
      return `$${(value >= 1000000 
        ? (value / 1000000).toFixed(2) + 'M' 
        : value >= 1000 
          ? (value / 1000).toFixed(2) + 'K' 
          : value.toFixed(2))}`
    }
    
    if (metricType.toLowerCase().includes('users') || 
        metricType.toLowerCase().includes('transactions')) {
      return value.toLocaleString()
    }
    
    // Default format
    return value.toString()
  }
  
  // Format percentage change
  const formatPercentage = (percentage: number | null): React.JSX.Element => {
    if (percentage === null) return <span>-</span>
    
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
  
  // Extract categories as an array
  const getCategoryArray = (categories: string | null): string[] => {
    if (!categories) return []
    return categories.split(',').map(cat => cat.trim())
  }
  
  // Get background and text color for a category
  const getCategoryColors = (category: string): { bg: string, text: string } => {
    // Map each category to a unique ROYGBIV color with high contrast
    const categoryColorMap: Record<string, { bg: string, text: string }> = {
      // Red spectrum
      'high-risk': { bg: 'bg-red-100', text: 'text-red-800' },
      
      // Fun color for gambling - bright purple/pink (more playful)
      'gambling': { bg: 'bg-fuchsia-100', text: 'text-fuchsia-800' },
      
      // Orange spectrum
      'games': { bg: 'bg-orange-100', text: 'text-orange-800' },
      'marketplaces': { bg: 'bg-amber-100', text: 'text-amber-800' },
      
      // Yellow spectrum
      'collectibles': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      
      // Green spectrum
      'defi': { bg: 'bg-emerald-100', text: 'text-emerald-800' },
      'lending': { bg: 'bg-green-100', text: 'text-green-800' },
      'yield': { bg: 'bg-lime-100', text: 'text-lime-800' },
      
      // Blue spectrum
      'exchanges': { bg: 'bg-blue-100', text: 'text-blue-800' },
      'dexes': { bg: 'bg-sky-100', text: 'text-sky-800' },
      
      // Indigo spectrum
      'wallet': { bg: 'bg-indigo-100', text: 'text-indigo-800' },
      
      // Violet/Purple spectrum
      'social': { bg: 'bg-purple-100', text: 'text-purple-800' },
      'bridge': { bg: 'bg-violet-100', text: 'text-violet-800' },
      
      // Additional colors for other categories
      'privacy': { bg: 'bg-pink-100', text: 'text-pink-800' },
      'insurance': { bg: 'bg-slate-100', text: 'text-slate-800' },
      'derivatives': { bg: 'bg-cyan-100', text: 'text-cyan-800' },
      'staking': { bg: 'bg-teal-100', text: 'text-teal-800' },
      'analytics': { bg: 'bg-rose-100', text: 'text-rose-800' },
      'oracle': { bg: 'bg-stone-100', text: 'text-stone-800' },
      'other': { bg: 'bg-neutral-100', text: 'text-neutral-800' }
    }
    
    // For categories not in our map, generate a color based on the first character
    if (!categoryColorMap[category.toLowerCase()]) {
      const colorOptions = [
        { bg: 'bg-red-100', text: 'text-red-800' },
        { bg: 'bg-rose-100', text: 'text-rose-800' },
        { bg: 'bg-orange-100', text: 'text-orange-800' },
        { bg: 'bg-amber-100', text: 'text-amber-800' },
        { bg: 'bg-yellow-100', text: 'text-yellow-800' },
        { bg: 'bg-lime-100', text: 'text-lime-800' },
        { bg: 'bg-green-100', text: 'text-green-800' },
        { bg: 'bg-emerald-100', text: 'text-emerald-800' },
        { bg: 'bg-teal-100', text: 'text-teal-800' },
        { bg: 'bg-cyan-100', text: 'text-cyan-800' },
        { bg: 'bg-sky-100', text: 'text-sky-800' },
        { bg: 'bg-blue-100', text: 'text-blue-800' },
        { bg: 'bg-indigo-100', text: 'text-indigo-800' },
        { bg: 'bg-violet-100', text: 'text-violet-800' },
        { bg: 'bg-purple-100', text: 'text-purple-800' },
        { bg: 'bg-fuchsia-100', text: 'text-fuchsia-800' },
        { bg: 'bg-pink-100', text: 'text-pink-800' }
      ];
      
      // Use the first letter of the category to determine a consistent color
      const charCode = category.toLowerCase().charCodeAt(0);
      const colorIndex = charCode % colorOptions.length;
      return colorOptions[colorIndex];
    }
    
    return categoryColorMap[category.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-800' };
  }
  
  if (network.toLowerCase() !== "avalanche") {
    return (
      <div className="rounded-md border p-6 text-center text-gray-500">
        <p>Top metrics are currently only available for Avalanche.</p>
      </div>
    )
  }
  
  return (
    <div className="rounded-md border">
      {/* Filters */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Metric Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Metric Type</label>
            <Select 
              value={selectedMetricType || 'none'} 
              onValueChange={val => setSelectedMetricType(val === 'none' ? null : val)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Metric Types</SelectLabel>
                  {metricTypes.length > 0 ? (
                    metricTypes.map(type => (
                      <SelectItem key={type} value={type || 'none'}>
                        {type || 'None'}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="volume">Volume</SelectItem>
                      <SelectItem value="transactions">Transactions</SelectItem>
                      <SelectItem value="uaw">Unique Active Wallets</SelectItem>
                      <SelectItem value="balance">Balance</SelectItem>
                    </>
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          
          {/* Time Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
            <Select 
              value={selectedMetricRange || '7d'}
              onValueChange={setSelectedMetricRange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Time Ranges</SelectLabel>
                  {metricRanges.length > 0 ? (
                    metricRanges.map(range => (
                      <SelectItem key={range} value={range || '7d'}>
                        {range || '7d'}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="24h">24h</SelectItem>
                      <SelectItem value="7d">7d</SelectItem>
                      <SelectItem value="30d">30d</SelectItem>
                    </>
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>
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
      {!loading && !error && (!metrics || metrics.length === 0) && (
        <div className="w-full py-8 text-center text-gray-500">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2">No metrics found for the selected filters.</p>
        </div>
      )}
      
      {/* Data Table */}
      {!loading && !error && metrics && metrics.length > 0 && (
        <div style={{ maxHeight, overflowY: 'auto' }}>
          <Table className="w-full table-fixed">
            <TableHeader className="sticky top-0 bg-white z-10">
              <TableRow>
                <TableHead className="w-[40px] px-2">Rank</TableHead>
                <TableHead className="w-[30%] px-2">Name</TableHead>
                <TableHead className="w-[30%] px-2">Categories</TableHead>
                <TableHead className="w-[20%] px-2 text-right">Value</TableHead>
                <TableHead className="w-[15%] px-2 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((metric, index) => (
                <TableRow key={metric.id}>
                  <TableCell className="font-medium px-2">{index + 1}</TableCell>
                  <TableCell className="px-2">{metric.name}</TableCell>
                  <TableCell className="px-2">
                    <div className="flex flex-wrap gap-1">
                      {getCategoryArray(metric.categories).map((category, idx) => {
                        const { bg, text } = getCategoryColors(category);
                        return (
                          <span 
                            key={`${metric.id}-${idx}`}
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${bg} ${text}`}
                          >
                            {category}
                          </span>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium px-2">
                    {formatValue(metric.value, metric.metric_type)}
                  </TableCell>
                  <TableCell className="text-right px-2">
                    {formatPercentage(metric.percentage_change)}
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