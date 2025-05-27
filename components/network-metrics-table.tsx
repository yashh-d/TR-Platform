"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { supabase, isSupabaseConfigured, USE_MOCK_DATA } from "@/lib/supabase"
import { ArrowUpRight, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface NetworkMetricsTableProps {
  network: string
}

// Interface that matches the exact schema provided
interface AvalancheCoreMetrics {
  timestamp: number
  date: string
  activeAddresses: string
  activeSenders: string
  cumulativeTxCount: string
  cumulativeAddresses: string
  cumulativeContracts: string
  cumulativeDeployers: string
  gasUsed: string
  txCount: string
  avgGps: string
  maxGps: string
  avgTps: string
  maxTps: string
  maxGasPrice: string
  feesPaid: string
  avgGasPrice: string
}

export function NetworkMetricsTable({ network }: NetworkMetricsTableProps) {
  const [metrics, setMetrics] = useState<AvalancheCoreMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeMetricTab, setActiveMetricTab] = useState("transactions")

  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true)
      setError(null)

      try {
        // Only fetch data for Avalanche network
        if (network !== "avalanche") {
          setMetrics([])
          setLoading(false)
          return
        }

        // Check if Supabase is configured
        if (!isSupabaseConfigured()) {
          throw new Error("Supabase is not properly configured. Please check your environment variables.")
        }

        // Fetch data from the avalanche_core table
        // Note: Using the exact column names from the schema
        const { data, error } = await supabase
          .from("avalanche_core")
          .select(`
            timestamp,
            date,
            "activeAddresses",
            "activeSenders",
            "cumulativeTxCount",
            "cumulativeAddresses",
            "cumulativeContracts",
            "cumulativeDeployers",
            "gasUsed",
            "txCount",
            "avgGps",
            "maxGps",
            "avgTps",
            "maxTps",
            "maxGasPrice",
            "feesPaid",
            "avgGasPrice"
          `)
          .order("timestamp", { ascending: false })
          .limit(7)

        if (error) {
          throw new Error(`Error fetching metrics data: ${error.message}`)
        }

        if (data && data.length > 0) {
          setMetrics(data as AvalancheCoreMetrics[])
        } else {
          // No data, use empty array
          setMetrics([])
        }
      } catch (err) {
        console.error("Failed to fetch metrics data:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred")
        setMetrics([])
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [network])

  // Format large numbers with commas
  const formatNumber = (numStr: string): string => {
    if (!numStr) return "0"
    const num = Number.parseFloat(numStr)
    return num.toLocaleString()
  }

  // Fallback for loading state
  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Avalanche Core Metrics</h2>
          <Button variant="outline" size="sm" className="text-xs">
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        </div>
        <div className="h-[300px] flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading metrics data...</div>
        </div>
      </Card>
    )
  }

  // Display error message
  if (error) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Avalanche Core Metrics</h2>
          <Button variant="outline" size="sm" className="text-xs">
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        </div>
        <div className="h-[300px] flex items-center justify-center">
          <div className="text-red-500">
            <p>Error loading metrics data:</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </Card>
    )
  }

  // If not Avalanche network or no data
  if (network !== "avalanche" || metrics.length === 0) {
    return null
  }

  // Render different metric groups based on active tab
  const renderMetricTable = () => {
    switch (activeMetricTab) {
      case "transactions":
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead className="text-right">Cumulative Tx</TableHead>
                <TableHead className="text-right">Avg TPS</TableHead>
                <TableHead className="text-right">Max TPS</TableHead>
                <TableHead className="text-right">Fees Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((row) => (
                <TableRow key={row.date}>
                  <TableCell className="font-medium">{row.date}</TableCell>
                  <TableCell className="text-right">{formatNumber(row.txCount)}</TableCell>
                  <TableCell className="text-right">{formatNumber(row.cumulativeTxCount)}</TableCell>
                  <TableCell className="text-right">{row.avgTps}</TableCell>
                  <TableCell className="text-right">{row.maxTps}</TableCell>
                  <TableCell className="text-right">{row.feesPaid}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      case "addresses":
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Active Addresses</TableHead>
                <TableHead className="text-right">Active Senders</TableHead>
                <TableHead className="text-right">Cumulative Addresses</TableHead>
                <TableHead className="text-right">Cumulative Contracts</TableHead>
                <TableHead className="text-right">Cumulative Deployers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((row) => (
                <TableRow key={row.date}>
                  <TableCell className="font-medium">{row.date}</TableCell>
                  <TableCell className="text-right">{formatNumber(row.activeAddresses)}</TableCell>
                  <TableCell className="text-right">{formatNumber(row.activeSenders)}</TableCell>
                  <TableCell className="text-right">{formatNumber(row.cumulativeAddresses)}</TableCell>
                  <TableCell className="text-right">{formatNumber(row.cumulativeContracts)}</TableCell>
                  <TableCell className="text-right">{formatNumber(row.cumulativeDeployers)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      case "gas":
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Gas Used</TableHead>
                <TableHead className="text-right">Avg GPS</TableHead>
                <TableHead className="text-right">Max GPS</TableHead>
                <TableHead className="text-right">Avg Gas Price</TableHead>
                <TableHead className="text-right">Max Gas Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((row) => (
                <TableRow key={row.date}>
                  <TableCell className="font-medium">{row.date}</TableCell>
                  <TableCell className="text-right">{formatNumber(row.gasUsed)}</TableCell>
                  <TableCell className="text-right">{row.avgGps}</TableCell>
                  <TableCell className="text-right">{row.maxGps}</TableCell>
                  <TableCell className="text-right">{row.avgGasPrice}</TableCell>
                  <TableCell className="text-right">{row.maxGasPrice}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      case "all":
        return (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Active Addresses</TableHead>
                  <TableHead className="text-right">Active Senders</TableHead>
                  <TableHead className="text-right">Cumulative Tx</TableHead>
                  <TableHead className="text-right">Cumulative Addresses</TableHead>
                  <TableHead className="text-right">Cumulative Contracts</TableHead>
                  <TableHead className="text-right">Cumulative Deployers</TableHead>
                  <TableHead className="text-right">Gas Used</TableHead>
                  <TableHead className="text-right">Tx Count</TableHead>
                  <TableHead className="text-right">Avg GPS</TableHead>
                  <TableHead className="text-right">Max GPS</TableHead>
                  <TableHead className="text-right">Avg TPS</TableHead>
                  <TableHead className="text-right">Max TPS</TableHead>
                  <TableHead className="text-right">Max Gas Price</TableHead>
                  <TableHead className="text-right">Fees Paid</TableHead>
                  <TableHead className="text-right">Avg Gas Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map((row) => (
                  <TableRow key={row.date}>
                    <TableCell className="font-medium">{row.date}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.activeAddresses)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.activeSenders)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.cumulativeTxCount)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.cumulativeAddresses)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.cumulativeContracts)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.cumulativeDeployers)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.gasUsed)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.txCount)}</TableCell>
                    <TableCell className="text-right">{row.avgGps}</TableCell>
                    <TableCell className="text-right">{row.maxGps}</TableCell>
                    <TableCell className="text-right">{row.avgTps}</TableCell>
                    <TableCell className="text-right">{row.maxTps}</TableCell>
                    <TableCell className="text-right">{row.maxGasPrice}</TableCell>
                    <TableCell className="text-right">{row.feesPaid}</TableCell>
                    <TableCell className="text-right">{row.avgGasPrice}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <Card className="p-4 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Avalanche Core Metrics</h2>
        <Button variant="outline" size="sm" className="text-xs">
          <Download className="h-3 w-3 mr-1" />
          Download
        </Button>
      </div>

      <div className="mb-4">
        <Tabs defaultValue="transactions" value={activeMetricTab} onValueChange={setActiveMetricTab}>
          <TabsList className="bg-gray-100">
            <TabsTrigger value="transactions" className="text-xs">
              Transactions
            </TabsTrigger>
            <TabsTrigger value="addresses" className="text-xs">
              Addresses
            </TabsTrigger>
            <TabsTrigger value="gas" className="text-xs">
              Gas
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs">
              All Metrics
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="overflow-x-auto">{renderMetricTable()}</div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="text-sm text-gray-500">Cumulative Transactions</div>
          <div className="text-xl font-bold">{formatNumber(metrics[0]?.cumulativeTxCount || "0")}</div>
          <div className="text-xs text-green-500 flex items-center">
            <ArrowUpRight className="h-3 w-3 mr-1" />+{formatNumber(metrics[0]?.txCount || "0")} in 24h
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="text-sm text-gray-500">Cumulative Addresses</div>
          <div className="text-xl font-bold">{formatNumber(metrics[0]?.cumulativeAddresses || "0")}</div>
          <div className="text-xs text-green-500 flex items-center">
            <ArrowUpRight className="h-3 w-3 mr-1" />+{formatNumber(metrics[0]?.activeAddresses || "0")} in 24h
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="text-sm text-gray-500">Average TPS</div>
          <div className="text-xl font-bold">{metrics[0]?.avgTps || "0"}</div>
          <div className="text-xs text-gray-500">Max: {metrics[0]?.maxTps || "0"}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="text-sm text-gray-500">Average Gas Price</div>
          <div className="text-xl font-bold">{metrics[0]?.avgGasPrice || "0"} nAVAX</div>
          <div className="text-xs text-gray-500">Max: {metrics[0]?.maxGasPrice || "0"} nAVAX</div>
        </div>
      </div>
    </Card>
  )
}
