"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Download, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface SubnetMetricsTableProps {
  maxBlockchains?: number
}

interface BlockchainMetrics {
  blockchain_name: string
  subnet_count: number
  activeAddresses: number
  activeSenders: number
  cumulativeTxCount: number
  cumulativeAddresses: number
  cumulativeContracts: number
  cumulativeDeployers: number
  gasUsed: number
  txCount: number
  avgGps: number
  maxGps: number
  avgTps: number
  maxTps: number
  maxGasPrice: number
  feesPaid: number
  avgGasPrice: number
}

type SortField = keyof BlockchainMetrics
type SortDirection = 'asc' | 'desc'

export function SubnetMetricsTable({ maxBlockchains = 20 }: SubnetMetricsTableProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tableData, setTableData] = useState<BlockchainMetrics[]>([])
  const [sortField, setSortField] = useState<SortField>('activeAddresses')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Column configuration
  const columns = [
    { key: 'blockchain_name' as SortField, label: 'Blockchain', format: (value: string | number) => String(value) },
    { key: 'activeAddresses' as SortField, label: 'Active Addresses', format: (value: string | number) => formatNumber(Number(value)) },
    { key: 'activeSenders' as SortField, label: 'Active Senders', format: (value: string | number) => formatNumber(Number(value)) },
    { key: 'txCount' as SortField, label: 'Transactions', format: (value: string | number) => formatNumber(Number(value)) },
    { key: 'gasUsed' as SortField, label: 'Gas Used', format: (value: string | number) => formatNumber(Number(value)) },
    { key: 'feesPaid' as SortField, label: 'Fees Paid', format: (value: string | number) => formatCurrency(Number(value)) },
    { key: 'avgTps' as SortField, label: 'Avg TPS', format: (value: string | number) => Number(value).toFixed(2) },
    { key: 'maxTps' as SortField, label: 'Max TPS', format: (value: string | number) => Number(value).toFixed(2) },
    { key: 'avgGasPrice' as SortField, label: 'Avg Gas Price', format: (value: string | number) => formatNumber(Number(value)) },
    { key: 'cumulativeTxCount' as SortField, label: 'Total Txs', format: (value: string | number) => formatNumber(Number(value)) },
    { key: 'cumulativeAddresses' as SortField, label: 'Total Addresses', format: (value: string | number) => formatNumber(Number(value)) }
  ]

  // Fetch and aggregate blockchain metrics
  useEffect(() => {
    async function fetchBlockchainMetrics() {
      setLoading(true)
      setError(null)
      
      try {
        if (!isSupabaseConfigured()) {
          throw new Error("Supabase is not properly configured")
        }

        // Get recent data for all metrics
        const { data: metricsData, error: metricsError } = await supabase
          .from('subnet_metrics')
          .select('blockchain_name, subnet_id, metric, value')
          .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days for latest values
          .order('date', { ascending: false })

        if (metricsError) {
          throw new Error(`Error fetching metrics: ${metricsError.message}`)
        }

        if (!metricsData || metricsData.length === 0) {
          throw new Error("No recent metrics data found")
        }

        // Aggregate by blockchain and metric
        const blockchainMap = new Map<string, Map<string, { total: number, count: number, subnets: Set<string> }>>()

        metricsData.forEach(item => {
          if (!blockchainMap.has(item.blockchain_name)) {
            blockchainMap.set(item.blockchain_name, new Map())
          }
          
          const blockchainMetrics = blockchainMap.get(item.blockchain_name)!
          
          if (!blockchainMetrics.has(item.metric)) {
            blockchainMetrics.set(item.metric, { total: 0, count: 0, subnets: new Set() })
          }
          
          const metricData = blockchainMetrics.get(item.metric)!
          metricData.total += Number(item.value || 0)
          metricData.count += 1
          metricData.subnets.add(item.subnet_id)
        })

        // Convert to table format
        const blockchainMetrics: BlockchainMetrics[] = Array.from(blockchainMap.entries())
          .map(([blockchainName, metrics]) => {
            const getMetricValue = (metricName: string) => {
              const metricData = metrics.get(metricName)
              if (!metricData) return 0
              
              // For cumulative metrics, use sum; for rates/prices, use average
              const isCumulative = metricName.includes('cumulative') || 
                                 metricName === 'gasUsed' || 
                                 metricName === 'txCount' || 
                                 metricName === 'feesPaid' ||
                                 metricName === 'activeAddresses' ||
                                 metricName === 'activeSenders'
              
              return isCumulative ? metricData.total : metricData.total / metricData.count
            }

            // Get unique subnet count
            const allSubnets = new Set<string>()
            metrics.forEach(metricData => {
              metricData.subnets.forEach(subnet => allSubnets.add(subnet))
            })

            return {
              blockchain_name: blockchainName,
              subnet_count: allSubnets.size,
              activeAddresses: getMetricValue('activeAddresses'),
              activeSenders: getMetricValue('activeSenders'),
              cumulativeTxCount: getMetricValue('cumulativeTxCount'),
              cumulativeAddresses: getMetricValue('cumulativeAddresses'),
              cumulativeContracts: getMetricValue('cumulativeContracts'),
              cumulativeDeployers: getMetricValue('cumulativeDeployers'),
              gasUsed: getMetricValue('gasUsed'),
              txCount: getMetricValue('txCount'),
              avgGps: getMetricValue('avgGps'),
              maxGps: getMetricValue('maxGps'),
              avgTps: getMetricValue('avgTps'),
              maxTps: getMetricValue('maxTps'),
              maxGasPrice: getMetricValue('maxGasPrice'),
              feesPaid: getMetricValue('feesPaid'),
              avgGasPrice: getMetricValue('avgGasPrice')
            }
          })
          .filter(blockchain => blockchain.activeAddresses > 0) // Only show active blockchains
          .slice(0, maxBlockchains)

        setTableData(blockchainMetrics)

      } catch (err) {
        console.error("Failed to fetch blockchain metrics:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchBlockchainMetrics()
  }, [maxBlockchains])

  // Sort data when sort field or direction changes
  const sortedData = [...tableData].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }
    
    const aNum = Number(aValue) || 0
    const bNum = Number(bValue) || 0
    
    return sortDirection === 'asc' ? aNum - bNum : bNum - aNum
  })

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Format large numbers
  const formatNumber = (value: number): string => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toFixed(0)
  }

  // Format currency values
  const formatCurrency = (value: number): string => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
    return `$${value.toFixed(2)}`
  }

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3" />
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3" />
      : <ArrowDown className="h-3 w-3" />
  }

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Blockchain Metrics Comparison</h3>
          <Button variant="outline" size="sm" className="text-xs">
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        </div>
        <div className="h-[400px] flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading blockchain metrics...</div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Blockchain Metrics Comparison</h3>
          <Button variant="outline" size="sm" className="text-xs">
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        </div>
        <div className="h-[400px] flex items-center justify-center">
          <div className="text-red-500 text-center">
            <p>Error loading metrics data:</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Blockchain Metrics Comparison</h3>
        <Button variant="outline" size="sm" className="text-xs">
          <Download className="h-3 w-3 mr-1" />
          Download
        </Button>
      </div>
      
      <div className="text-sm text-gray-600 mb-4">
        Showing top {maxBlockchains} blockchains by activity (last 7 days data). Click column headers to sort.
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {getSortIcon(column.key)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((blockchain, index) => (
              <TableRow key={blockchain.blockchain_name} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <TableCell key={column.key} className="font-medium">
                    {column.format(blockchain[column.key])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {sortedData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No blockchain metrics data available
        </div>
      )}
    </Card>
  )
} 