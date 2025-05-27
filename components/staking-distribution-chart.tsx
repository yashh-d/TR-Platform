"use client"

import { useState, useEffect } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { PieChart, FileWarning } from "lucide-react"

interface StakingDistributionChartProps {
  network: string;
}

interface VersionData {
  version: string;
  amount: number;
  validators: number;
}

export function StakingDistributionChart({ network }: StakingDistributionChartProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [versionData, setVersionData] = useState<VersionData[]>([])
  const [totalStaked, setTotalStaked] = useState(0)

  useEffect(() => {
    async function fetchStakingDistribution() {
      setLoading(true)
      setError(null)

      try {
        // Only fetch data for Avalanche network
        if (network.toLowerCase() !== "avalanche") {
          setLoading(false)
          return
        }

        // Check if Supabase is configured
        if (!isSupabaseConfigured()) {
          throw new Error("Supabase is not properly configured. Please check your environment variables.")
        }

        // Fetch latest network stats
        const { data, error } = await supabase
          .rpc('get_latest_network_stats')

        if (error) {
          throw new Error(`Error fetching network stats: ${error.message}`)
        }

        // Handle the response
        if (data && Array.isArray(data) && data.length > 0) {
          const statsData = data[0];
          
          // Parse the stakingDistributionByVersion string
          // Format: "offline:2281724783379030:62|avalanchego/1.13.0:233295221355140744:1313"
          if (statsData.stakingDistributionByVersion) {
            const parsedData = parseStakingDistribution(statsData.stakingDistributionByVersion)
            setVersionData(parsedData.versions)
            setTotalStaked(parsedData.total)
          }
        } else if (data && !Array.isArray(data)) {
          // Handle case where data is not an array
          if (data.stakingDistributionByVersion) {
            const parsedData = parseStakingDistribution(data.stakingDistributionByVersion)
            setVersionData(parsedData.versions)
            setTotalStaked(parsedData.total)
          }
        }
      } catch (err) {
        console.error("Failed to fetch staking distribution:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchStakingDistribution()
  }, [network])

  // Parse staking distribution string into structured data
  const parseStakingDistribution = (distributionString: string) => {
    const parts = distributionString.split('|')
    const versions: VersionData[] = []
    let total = 0

    parts.forEach(part => {
      const [version, amountStr, validatorsStr] = part.split(':')
      const amount = parseInt(amountStr, 10)
      const validators = parseInt(validatorsStr, 10)
      
      versions.push({
        version,
        amount,
        validators
      })
      
      total += amount
    })

    // Sort by amount descending
    versions.sort((a, b) => b.amount - a.amount)
    
    return { versions, total }
  }

  // Format amount to be more readable
  const formatAmount = (amount: number): string => {
    if (amount >= 1000000000000) {
      return `${(amount / 1000000000000).toFixed(2)}T AVAX`
    } else if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(2)}B AVAX`
    } else if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M AVAX`
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}K AVAX`
    }
    return `${amount} AVAX`
  }

  // Calculate percentage
  const getPercentage = (amount: number): string => {
    if (totalStaked === 0) return "0%"
    return `${((amount / totalStaked) * 100).toFixed(2)}%`
  }

  // Get color based on version
  const getVersionColor = (version: string): string => {
    if (version.toLowerCase() === 'offline') {
      return 'bg-red-500'
    } else if (version.includes('1.13')) {
      return 'bg-green-500'
    } else if (version.includes('1.12')) {
      return 'bg-blue-500'
    } else if (version.includes('1.11')) {
      return 'bg-purple-500'
    } else if (version.includes('1.10')) {
      return 'bg-yellow-500'
    } else {
      return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="border rounded-lg p-6 animate-pulse">
        <div className="mb-4">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
        <div className="h-48 bg-gray-100 rounded-md flex items-center justify-center">
          <div className="text-gray-400">Loading...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Staking Distribution by Version</h3>
        </div>
        <div className="bg-red-50 text-red-600 p-4 rounded-md flex items-center">
          <FileWarning className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  if (network.toLowerCase() !== "avalanche") {
    return (
      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Staking Distribution by Version</h3>
        </div>
        <div className="bg-gray-50 text-gray-600 p-4 rounded-md flex items-center justify-center">
          <span>Staking distribution data is only available for Avalanche.</span>
        </div>
      </div>
    )
  }

  if (!versionData || versionData.length === 0) {
    return (
      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Staking Distribution by Version</h3>
        </div>
        <div className="bg-gray-50 text-gray-600 p-4 rounded-md flex items-center justify-center">
          <span>No staking distribution data available.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Staking Distribution by Version</h3>
        <div className="text-sm text-gray-500">
          {versionData.reduce((acc, v) => acc + v.validators, 0)} validators
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Distribution Chart - Client-side rendering */}
        <div className="flex items-center justify-center h-[250px]">
          {typeof window !== 'undefined' && (
            <div className="relative w-[250px] h-[250px] flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center">
                <PieChart className="h-6 w-6 text-gray-400" />
              </div>
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {versionData.reduce((acc, data, index) => {
                  const percentage = (data.amount / totalStaked) * 100
                  const previousPercentage = acc.previousPercentage
                  
                  // Calculate SVG arc parameters
                  const x1 = 50 + 40 * Math.cos(2 * Math.PI * previousPercentage / 100)
                  const y1 = 50 + 40 * Math.sin(2 * Math.PI * previousPercentage / 100)
                  const x2 = 50 + 40 * Math.cos(2 * Math.PI * (previousPercentage + percentage) / 100)
                  const y2 = 50 + 40 * Math.sin(2 * Math.PI * (previousPercentage + percentage) / 100)
                  const largeArcFlag = percentage > 50 ? 1 : 0
                  
                  const path = (
                    <path 
                      key={index}
                      d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                      className={getVersionColor(data.version)}
                      stroke="white"
                      strokeWidth="0.5"
                    />
                  )
                  
                  return {
                    paths: [...acc.paths, path],
                    previousPercentage: previousPercentage + percentage
                  }
                }, { paths: [] as React.ReactNode[], previousPercentage: 0 }).paths}
              </svg>
            </div>
          )}
        </div>
        
        {/* Legend */}
        <div className="space-y-2">
          {versionData.map((data, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${getVersionColor(data.version)}`}></div>
                <span className="text-sm" title={data.version}>
                  {data.version}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium">{getPercentage(data.amount)}</span>
                <span className="text-xs text-gray-500">{data.validators} validators</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t text-center text-sm text-gray-500">
        Total Staked: {formatAmount(totalStaked)}
      </div>
    </div>
  )
} 