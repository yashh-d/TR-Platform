"use client"

import { useState, useEffect } from "react"
import {
  ChevronRight,
  ArrowUpRight,
  Download,
  DollarSign,
  Users,
  Package,
  Coins,
  Wallet,
  Hash,
  Vote,
  Award,
  Percent,
  Check,
  Shield,
  Network,
  BarChart3,
  Cpu,
  LineChart,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlotlyChart } from "@/components/plotly-chart"
import { DataTable } from "@/components/data-table"
import { PieChartComponent } from "@/components/pie-chart"
import { BentoCard } from "@/components/ui/bento-card"
import { Sidebar } from "@/components/sidebar"
import { SubnetMetricsChart } from "@/components/subnet-metrics-chart"
import { AvalancheProposals } from "@/components/avalanche-proposals"
import { AvalancheDiscussions } from "@/components/avalanche-discussions"
import { RWAMetricsChart } from "@/components/rwa-metrics-chart"
import { DAppsMetricsChart } from "@/components/dapps-metrics-chart"
import { AvalacheDAppsStats } from "@/components/avalanche-dapps-stats"
import { DAppsCategoryChart } from "@/components/dapps-category-chart"
import { DAppsTopMetricsTable } from "@/components/dapps-top-metrics-table"
import { NetworkStatsCards } from "@/components/network-stats-cards"
import { BentoCardSimple } from "@/components/ui/bento-card-simple"
import { AvalancheNetworkStats } from "@/components/avalanche-network-stats"
import { StablecoinMetricsChart } from "@/components/stablecoin-metrics-chart"
import { GovernanceStatusCards } from "@/components/governance-status-cards"
import { StakingDistributionChart } from "@/components/staking-distribution-chart"
import { DexVolumeChart } from "@/components/dex-volume-chart"
import { NetworkStatsChart } from "@/components/network-stats-chart"
import { ProtocolTVLChart } from "@/components/protocol-tvl-chart"
import { ProtocolMetricsChart } from "@/components/protocol-metrics-chart"
import { ProtocolDebug } from "@/components/protocol-debug"
import { TopProtocolsTVLChart } from "@/components/top-protocols-tvl-chart"
import { BitcoinMetricsChart } from "@/components/bitcoin-metrics-chart"
import { EthereumMetricsChart } from "@/components/ethereum-metrics-chart"
import { SubnetCountCard } from "@/components/subnet-count-card"
import { StablecoinBridgingChart } from "@/components/stablecoin-bridging-chart"
import { StablecoinStatsCards } from "@/components/stablecoin-stats-cards"
import { OverviewStablecoinCards } from "@/components/overview-stablecoin-cards"
import { TVLChart } from "@/components/tvl-chart"
import { PriceChart } from "@/components/price-chart"
import { OverviewMetricsCards } from "@/components/overview-metrics-cards"
import { OverviewNetworkMetricsCards } from "@/components/overview-network-metrics-cards"
import { ConsolidatedMetricsChart } from "@/components/consolidated-metrics-chart"
import { AvaxBurnChart } from "@/components/avax-burn-chart"
import { AvalancheDeFiTable } from "@/components/avalanche-defi-table"
import { StakingDistributionPieChart } from "@/components/staking-distribution-pie-chart"
import { ContractsDeployersChart } from "@/components/contracts-deployers-chart"
import { GasFeesChart } from "@/components/gas-fees-chart"
import { TpsGpsChart } from "@/components/tps-gps-chart"
import { TransactionsChart } from "@/components/transactions-chart"
import { AddressesChart } from "@/components/addresses-chart"
import { CChainMetricsChart } from "@/components/cchain-metrics-chart"
import { SubnetMetricsTable } from "@/components/subnet-metrics-table"
import { supabase } from "@/lib/supabase"
import { BitcoinNetworkActivityChart } from "@/components/bitcoin-network-activity-chart"
import { BitcoinMiningMetricsChart } from "@/components/bitcoin-mining-metrics-chart"
import { BitcoinMarketMetricsChart } from "@/components/bitcoin-market-metrics-chart"
import { BitcoinOverviewCards } from "@/components/bitcoin-overview-cards"
import { EthereumFinancialMetricsChart } from "@/components/ethereum-financial-metrics-chart"
import { EthereumSupplyMetricsChart } from "@/components/ethereum-supply-metrics-chart"
import { EthereumStakingMetricsChart } from "@/components/ethereum-staking-metrics-chart"
import { EthereumNetworkActivityChart } from "@/components/ethereum-network-activity-chart"
import { DexVolumePieChart } from "@/components/dex-volume-pie-chart"
import { EthereumStablecoinStatsCards } from "@/components/ethereum-stablecoin-stats-cards"
import { EthereumStablecoinMetricsChart } from "@/components/ethereum-stablecoin-metrics-chart"
import { EthereumStablecoinBridgingChart } from "@/components/ethereum-stablecoin-bridging-chart"

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("avalanche")
  const [activeSubcategory, setActiveSubcategory] = useState("overview")

  // Get subcategory tabs based on active blockchain
  const getSubcategoryTabs = (network: string) => {
    const commonTabs = ["Overview", "Network", "L1s", "DeFi", "dApps + Protocols", "Stablecoins", "Institutions + RWAs"]
    
    // Add Governance tab specifically for Avalanche
    if (network === "avalanche") {
      return [...commonTabs, "Governance"]
    }
    
    return commonTabs
  }

  // Map metric values to column names in the database
  const metricMap: Record<string, string> = {
    "activeAddresses": "activeAddresses",
    "activeSenders": "activeSenders",
    "cumulativeTxCount": "cumulativeTxCount",
    "cumulativeAddresses": "cumulativeAddresses",
    "cumulativeContracts": "cumulativeContracts",
    "cumulativeDeployers": "cumulativeDeployers",
    "gasUsed": "gasUsed",
    "txCount": "txCount",
    "avgGps": "avgGps",
    "maxGps": "maxGps",
    "avgTps": "avgTps",
    "maxTps": "maxTps",
    "maxGasPrice": "maxGasPrice",
    "feesPaid": "feesPaid",
    "avgGasPrice": "avgGasPrice"
  }

  // Get network-specific colors for cards
  const getNetworkColors = (network: string) => {
    switch (network) {
      case "bitcoin":
        return ["#F7931A", "#FFAD33", "#FFD700"]
      case "ethereum":
        return ["#627EEA", "#8A9EF5", "#B6C1F2"]
      case "solana":
        return ["#9945FF", "#14F195", "#C87FFF", "#8B5CF6", "#06FFA5"]
      case "avalanche":
        return ["#E84142", "#FF6B6B", "#FF9B9B"]
      case "polygon":
        return ["#8247E5", "#A277FF", "#C4A7FF"]
      case "core":
        return ["#FF7700", "#FF9500", "#FFB700"]
      default:
        return ["#3B82F6", "#60A5FA", "#93C5FD"]
    }
  }

  // Dynamic DEX Volume Card Component
  function DexVolumeCard({ network, colors }: { network: string, colors: string[] }) {
    const [volume, setVolume] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
      async function fetchLatestDexVolume() {
        if (network.toLowerCase() !== "avalanche") {
          setLoading(false)
          return
        }

        try {
          // Get the latest date's total volume from all DEXs
          const { data, error } = await supabase
            .from('avalanche_dex_volumes')
            .select('date, volume')
            .order('date', { ascending: false })
            .limit(100) // Get recent data to sum up for latest date

          if (error) throw error

          if (data && data.length > 0) {
            // Get the most recent date
            const latestDate = data[0].date
            
            // Sum all volumes for the latest date
            const latestDayVolumes = data.filter(item => item.date === latestDate)
            const totalVolume = latestDayVolumes.reduce((sum, item) => sum + Number(item.volume), 0)
            
            setVolume(totalVolume)
          }
        } catch (err) {
          console.error('Error fetching DEX volume:', err)
          setError('Failed to load DEX volume')
        } finally {
          setLoading(false)
        }
      }

      fetchLatestDexVolume()
    }, [network])

    const formatVolume = (volume: number): string => {
      if (volume >= 1000000000) {
        return `$${(volume / 1000000000).toFixed(2)}B`
      } else if (volume >= 1000000) {
        return `$${(volume / 1000000).toFixed(2)}M`
      } else if (volume >= 1000) {
        return `$${(volume / 1000).toFixed(2)}K`
      } else {
        return `$${volume.toFixed(2)}`
      }
    }

    if (network.toLowerCase() !== "avalanche") {
      return (
        <BentoCardSimple
          title="DEX Volume (24h)"
          value="N/A"
          subtitle="Only available for Avalanche"
          colors={colors}
          icon={<BarChart3 className="h-4 w-4" />}
        />
      )
    }

    return (
      <BentoCardSimple
        title="DEX Volume (24h)"
        value={loading ? "Loading..." : error ? "Error" : volume ? formatVolume(volume) : "N/A"}
        subtitle={loading ? "" : error ? "Failed to load" : "+12.4% vs yesterday"}
        colors={colors}
        loading={loading}
        error={error}
        icon={<BarChart3 className="h-4 w-4" />}
      />
    )
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Top Navigation */}
      <header className="border-b flex items-center justify-between px-4 py-2">
        <div className="flex items-center">
          <div className="text-xl font-semibold flex items-center">
            <span className="text-blue-600"> </span>Token Relations<span className="text-blue-600"> </span>
          </div>
          <div className="ml-6 text-xs text-gray-500 max-w-[180px]">
            Explore our ecosystems.<br />
            The best metrics in blockchain.
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - passes activeNetwork and handler */}
        <Sidebar activeNetwork={activeTab} onNetworkChange={setActiveTab} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          {/* Secondary Navigation */}
          <div className="border-b px-4 py-2 flex items-center">
            <div className="flex space-x-4 overflow-x-auto pb-1">
              {["Bitcoin", "Ethereum", "Avalanche"].map((network) => (
                <Button
                  key={network}
                  variant={activeTab === network.toLowerCase() ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab(network.toLowerCase())}
                >
                  {network}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Subcategory Navigation */}
          <div className="border-b px-4 py-2 flex items-center">
            <div className="flex space-x-4 overflow-x-auto pb-1">
              {getSubcategoryTabs(activeTab).map((subcategory) => (
                <Button
                  key={subcategory}
                  variant={activeSubcategory === subcategory.toLowerCase() ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveSubcategory(subcategory.toLowerCase())}
                >
                  {subcategory}
                </Button>
              ))}
            </div>
          </div>

          {/* Network Content */}
          <div className="p-6">
            <div className="flex items-center mb-4">
              {activeTab === "avalanche" ? (
                <div className="mr-3">
                  <img 
                    src="/Avalanche_Logomark_Red.svg" 
                    alt="Avalanche Logo" 
                    className="h-10 w-10"
                  />
                </div>
              ) : activeTab === "ethereum" ? (
                <div className="mr-3">
                  <img 
                    src="/ethereum-eth-logo.svg" 
                    alt="Ethereum Logo" 
                    className="h-10 w-10"
                  />
                </div>
              ) : activeTab === "bitcoin" ? (
                <div className="mr-3">
                  <img 
                    src="/bitcoin-btc-logo.svg" 
                    alt="Bitcoin Logo" 
                    className="h-10 w-10"
                  />
                </div>
              ) : activeTab === "solana" ? (
                <div className="mr-3">
                  <img 
                    src="/Solana Logomark - Color.svg" 
                    alt="Solana Logo" 
                    className="h-10 w-10"
                  />
                </div>
              ) : activeTab === "core" ? (
                <div className="mr-3">
                  <img 
                    src="/core-dao-core-logo.svg" 
                    alt="Core DAO Logo" 
                    className="h-10 w-10"
                  />
                </div>
              ) : (
                <div
                  className={`rounded-full p-2 mr-3 ${
                    activeTab === "polygon"
                      ? "bg-blue-600"
                      : "bg-gray-500" // Fallback color
                  }`}
                >
                  <ArrowUpRight className="h-5 w-5 text-white" />
                </div>
              )}
              <h1 className="text-2xl font-bold">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
            </div>

            <div className="text-sm text-gray-600 mb-6">
              <p className="mb-2">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Chain ID:{" "}
                <span className="text-blue-600">
                  {activeTab === "ethereum" ? "1" : 
                   activeTab === "avalanche" ? "43114" :
                   activeTab === "polygon" ? "137" :
                   activeTab === "solana" ? "N/A" :
                   activeTab === "bitcoin" ? "N/A" :
                   activeTab === "core" ? "1116" : "N/A"}
                </span>
              </p>
              <p className="max-w-3xl">
                {activeTab === "bitcoin" &&
                  "Bitcoin is the first and most well-known cryptocurrency, created in 2009 by an unknown person or group using the pseudonym Satoshi Nakamoto. It operates on a decentralized network using blockchain technology to enable peer-to-peer transactions without the need for intermediaries."}
                {activeTab === "ethereum" &&
                  "Ethereum is a decentralized, open-source blockchain platform that enables the creation of smart contracts and decentralized applications (dApps). Founded by Vitalik Buterin in 2015, it introduced the concept of programmable blockchain and is powered by its native cryptocurrency Ether (ETH)."}
                {activeTab === "solana" &&
                  "Solana is a high-performance blockchain platform designed for decentralized applications and marketplaces. Known for its high throughput and low transaction costs, Solana uses a unique combination of proof-of-stake and proof-of-history consensus mechanisms to achieve scalability."}
                {activeTab === "avalanche" &&
                  "Launched in 2020, Avalanche is a high-performance blockchain featuring three integrated chains and a rapid-finality consensus protocol. It offers EVM compatibility, enabling developers to easily deploy Ethereum-based smart contracts and dApps. The platform processes thousands of transactions per second with sub-second finality, all secured by its native AVAX token."}
                {activeTab === "polygon" &&
                  "Polygon (formerly Matic Network) is a scaling solution for Ethereum that aims to provide multiple tools to improve speed and reduce costs and complexities of transactions on blockchain networks. It uses a modified proof-of-stake consensus mechanism for security and efficiency."}
                {activeTab === "core" &&
                  "Core is an emerging blockchain platform focused on providing a secure, scalable infrastructure for decentralized applications. It emphasizes interoperability between different blockchain networks and aims to solve common challenges in blockchain adoption through innovative consensus mechanisms."}
              </p>
            </div>

            {/* Render content based on active subcategory */}
            {activeSubcategory === "overview" && (
              <>
                {activeTab === "bitcoin" ? (
                  // Bitcoin-specific overview content
                  <>
                    {/* Bitcoin Metrics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                      <BitcoinOverviewCards network={activeTab} colors={getNetworkColors(activeTab)} />
                    </div>

                    {/* Additional Network Metrics */}
                    <div className="grid grid-cols-6 gap-4 mb-8">
                      <OverviewNetworkMetricsCards network={activeTab} colors={getNetworkColors(activeTab)} />
                    </div>

                    {/* Consolidated chart */}
                    <div className="mb-12">
                      <ConsolidatedMetricsChart network={activeTab} />
                    </div>

                    {/* Bitcoin Network Activity Chart */}
                    <div className="mb-8">
                      <BitcoinNetworkActivityChart network={activeTab} />
                    </div>

                    {/* Bitcoin Mining Metrics Chart */}
                    <div className="mb-8">
                      <BitcoinMiningMetricsChart network={activeTab} />
                    </div>

                    {/* Bitcoin Market Metrics Chart */}
                    <div className="mb-8">
                      <BitcoinMarketMetricsChart network={activeTab} />
                    </div>
                  </>
                ) : (
                  // Default overview content for other networks
                  <>
                    {/* Metrics Cards */}
                    <div className="grid grid-cols-6 gap-4 mb-8">
                      <OverviewMetricsCards network={activeTab} colors={getNetworkColors(activeTab)} />
                      <OverviewNetworkMetricsCards network={activeTab} colors={getNetworkColors(activeTab)} />
                    </div>

                    {/* Replace the two charts with one consolidated chart */}
                    <div className="mb-12">
                      <ConsolidatedMetricsChart network={activeTab} />
                    </div>

                    {/* Metrics Chart - Using our updated PlotlyChart component */}
                    <div className="mb-8 mt-12">
                      {activeTab === "ethereum" ? (
                        <>
                          {/* Ethereum Financial Metrics Chart */}
                          <div className="mb-8">
                            <EthereumFinancialMetricsChart network={activeTab} />
                          </div>

                          {/* Ethereum Supply Metrics Chart */}
                          <div className="mb-8">
                            <EthereumSupplyMetricsChart network={activeTab} />
                          </div>

                          {/* Ethereum Staking Metrics Chart */}
                          <div className="mb-8">
                            <EthereumStakingMetricsChart network={activeTab} />
                          </div>

                          {/* Ethereum Network Activity Chart */}
                          <div className="mb-8">
                            <EthereumNetworkActivityChart network={activeTab} />
                          </div>
                        </>
                      ) : (
                        <PlotlyChart network={activeTab} metric="activeAddresses" />
                      )}
                    </div>

                    {/* Add Network Stats Chart for Avalanche */}
                    {activeTab === "avalanche" && (
                      <div className="mb-8 mt-12">
                        <NetworkStatsChart network={activeTab} metric="avgGps" />
                      </div>
                    )}

                    {/* Add Stablecoin Metrics Chart for Avalanche */}
                    {activeTab === "avalanche" && (
                      <div className="mb-8">
                        <StablecoinMetricsChart network={activeTab} />
                      </div>
                    )}

                    {/* Add C-Chain Metrics Chart for Avalanche */}
                    {activeTab === "avalanche" && (
                      <div className="mb-8">
                        <CChainMetricsChart network={activeTab} />
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {activeSubcategory === "network" && (
              <div>
                <h2 className="text-lg font-bold mb-4">Network Metrics</h2>
                
                {/* Replace the static cards with the dynamic component */}
                {activeTab === "avalanche" && (
                  <AvalancheNetworkStats 
                    network={activeTab} 
                    colors={getNetworkColors(activeTab)}
                  />
                )}
                
                {/* Add Ethereum Network Activity Chart for Ethereum */}
                {activeTab === "ethereum" && (
                  <div className="mb-8">
                    <EthereumNetworkActivityChart network={activeTab} />
                  </div>
                )}
                
                {/* Add the comprehensive NetworkStatsChart */}
                {activeTab === "avalanche" && (
                  <div className="mb-8">
                    <NetworkStatsChart network={activeTab} metric="avgGps" />
                  </div>
                )}
                
                {/* Add the focused charts below */}
                {activeTab === "avalanche" && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div>
                      <ContractsDeployersChart network={activeTab} />
                    </div>
                    <div>
                      <GasFeesChart network={activeTab} />
                    </div>
                    <div>
                      <TpsGpsChart network={activeTab} />
                    </div>
                    <div>
                      <TransactionsChart network={activeTab} />
                    </div>
                    <div>
                      <AddressesChart network={activeTab} />
                    </div>
                  </div>
                )}
                
                {/* Add AVAX Burn Chart for Avalanche network */}
                {activeTab === "avalanche" && (
                  <div className="mb-8">
                    <AvaxBurnChart network={activeTab} />
                  </div>
                )}
                
                {/* Add Staking Distribution Pie Chart for Avalanche network */}
                {activeTab === "avalanche" && (
                  <div className="mb-8">
                    <StakingDistributionPieChart network={activeTab} />
                  </div>
                )}
              </div>
            )}

            {activeSubcategory === "l1s" && (
              <div>
                <h2 className="text-lg font-bold mb-4">Layer 1 Performance</h2>
                
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div>
                    <BentoCardSimple
                      title="Chain Uptime"
                      value="99.99%"
                      colors={getNetworkColors(activeTab)}
                      icon={<Check className="h-4 w-4" />}
                    />
                  </div>
                  <div>
                    <BentoCardSimple
                      title="Validator Count"
                      value={activeTab === "ethereum" ? "889,423" : "1,024"}
                      colors={getNetworkColors(activeTab)}
                      icon={<Shield className="h-4 w-4" />}
                    />
                  </div>
                  <div>
                    <SubnetCountCard 
                      network={activeTab} 
                      colors={getNetworkColors(activeTab)} 
                    />
                  </div>
                </div>
                
                {/* C-Chain Metrics Chart */}
                <div className="mb-8">
                  <CChainMetricsChart network={activeTab} />
                </div>
                
                {/* Subnet Performance Overview */}
                <div className="mb-8">
                  <h3 className="text-md font-semibold mb-2">Subnet Performance Overview</h3>
                  <SubnetMetricsChart />
                </div>
                
                {/* Subnet Metrics Table */}
                <div className="mb-8">
                  <SubnetMetricsTable />
                </div>
              </div>
            )}

            {activeSubcategory === "defi" && (
              <div>
                <h2 className="text-lg font-bold mb-4">DeFi Ecosystem</h2>
                
                {/* DeFi Overview Cards */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div>
                    <BentoCardSimple
                      title="Total Value Locked"
                      value="$8.95B"
                      subtitle="+0.75% in 24h ago"
                      colors={getNetworkColors(activeTab)}
                      icon={<Coins className="h-4 w-4" />}
                    />
                  </div>
                  <div>
                    <BentoCardSimple
                      title="Active Protocols"
                      value="156"
                      subtitle="+2 new this week"
                      colors={getNetworkColors(activeTab)}
                      icon={<Package className="h-4 w-4" />}
                    />
                  </div>
                  <div>
                    <DexVolumeCard network={activeTab} colors={getNetworkColors(activeTab)} />
                  </div>
                </div>
                
                {/* Top Protocols by TVL */}
                <div className="mb-8">
                  <h3 className="text-md font-semibold mb-2">Top Protocols by TVL</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <TopProtocolsTVLChart network={activeTab} />
                    </div>
                    <div>
                      <DexVolumePieChart network={activeTab} />
                    </div>
                  </div>
                </div>
                
                {/* Protocol TVL Chart */}
                <div className="mb-8">
                  <h3 className="text-md font-semibold mb-2">Total Value Locked Over Time</h3>
                  <ProtocolTVLChart network={activeTab} />
                </div>
                
                {/* DEX Trading Volume */}
                <div className="mb-8">
                  <h3 className="text-md font-semibold mb-2">DEX Trading Volume</h3>
                  <DexVolumeChart network={activeTab} />
                </div>
                
                {/* Protocol Metrics Chart */}
                <div className="mb-8">
                  <h3 className="text-md font-semibold mb-2">Protocol Performance Metrics</h3>
                  <ProtocolMetricsChart network={activeTab} />
                </div>
                
                {/* DeFi Protocols Table */}
                <div className="mb-8">
                  <h3 className="text-md font-semibold mb-2">Top DeFi Protocols</h3>
                  <AvalancheDeFiTable network={activeTab} />
                </div>
                
                {/* Stablecoin Integration */}
                {activeTab === "avalanche" && (
                  <div className="mb-8">
                    <h3 className="text-md font-semibold mb-2">Stablecoin Circulation in DeFi</h3>
                    <StablecoinMetricsChart network={activeTab} />
                  </div>
                )}
              </div>
            )}

            {activeSubcategory === "dapps + protocols" && (
              <div>
                <h2 className="text-lg font-bold mb-4">dApps & Protocols</h2>
                <div className="grid grid-cols-6 gap-4 mb-8">
                  <div className="col-span-3">
                    <AvalacheDAppsStats 
                      network={activeTab} 
                      colors={getNetworkColors(activeTab)} 
                    />
                  </div>
                  <div className="col-span-3">
                    <BentoCardSimple
                      title="Total Value Locked"
                      value="$8.95B"
                      subtitle="+0.75% in 24h ago"
                      colors={getNetworkColors(activeTab)}
                      icon={<Coins className="h-4 w-4" />}
                    />
                  </div>
                </div>

                {/* Add the Category Breakdown Chart */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <h3 className="text-md font-semibold mb-2">dApp Categories</h3>
                    <DAppsCategoryChart network={activeTab} />
                  </div>
                  <div>
                    <h3 className="text-md font-semibold mb-2">Top Protocols</h3>
                    <TopProtocolsTVLChart network={activeTab} />
                  </div>
                </div>
                
                {/* TVL Chart - Replace with new component */}
                <div className="mb-8">
                  <ProtocolTVLChart network={activeTab} />
                </div>
                
                {/* Debug component - temporary */}
                <div className="mb-8">
                  <ProtocolDebug network={activeTab} />
                </div>
                
                {/* Protocol Metrics Chart */}
                <div className="mb-8">
                  <ProtocolMetricsChart network={activeTab} />
                </div>
                
                <div className="mb-8">
                  <h3 className="text-md font-semibold mb-2">Top dApps by Metrics</h3>
                  <DAppsTopMetricsTable network={activeTab} />
                </div>
                
                {/* Add the new DeFi table */}
                <div className="mb-8">
                  <h3 className="text-md font-semibold mb-2">Top DeFi Protocols</h3>
                  <AvalancheDeFiTable network={activeTab} />
                </div>
                
                {/* DEX volume chart */}
                <div className="mb-8">
                  <h3 className="text-md font-semibold mb-2">DEX Volumes</h3>
                  <DexVolumeChart network={activeTab} />
                </div>
              </div>
            )}

            {activeSubcategory === "stablecoins" && (
              <div>
                <h2 className="text-lg font-bold mb-4">Stablecoins</h2>
                
                {/* Use Ethereum-specific components for Ethereum, otherwise use the generic ones */}
                {activeTab === "ethereum" ? (
                  <>
                    {/* Ethereum Stablecoin Stats Cards */}
                    <div className="grid grid-cols-6 gap-4 mb-8">
                      <EthereumStablecoinStatsCards network={activeTab} colors={getNetworkColors(activeTab)} />
                    </div>
                    
                    {/* Ethereum Stablecoin Metrics Chart with toggle */}
                    <div className="mb-8">
                      <EthereumStablecoinMetricsChart network={activeTab} />
                    </div>
                    
                    {/* Ethereum Stablecoin Bridging Chart */}
                    <div className="mb-8">
                      <EthereumStablecoinBridgingChart network={activeTab} />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Replace the static grid with the dynamic component */}
                    <StablecoinStatsCards network={activeTab} colors={getNetworkColors(activeTab)} />
                    
                    <div className="mb-8">
                      <StablecoinMetricsChart network={activeTab} />
                    </div>
                    
                    <div className="mb-8">
                      <StablecoinBridgingChart network={activeTab} />
                    </div>
                  </>
                )}
              </div>
            )}

            {activeSubcategory === "institutions + rwas" && (
              <div>
                <h2 className="text-lg font-bold mb-4">Institutions & RWAs</h2>
                <div className="grid grid-cols-6 gap-4 mb-8">
                  <div className="col-span-2">
                    <BentoCardSimple
                      title="RWA Value"
                      value="$169.29M"
                      subtitle="+1.56% in 24h ago"
                      colors={getNetworkColors(activeTab)}
                      icon={<DollarSign className="h-4 w-4" />}
                    />
                  </div>
                  <div className="col-span-2">
                    <BentoCardSimple
                      title="RWA Holders"
                      value="7,588"
                      subtitle="+0.04% in 24h ago"
                      colors={getNetworkColors(activeTab)}
                      icon={<Users className="h-4 w-4" />}
                    />
                  </div>
                  <div className="col-span-2">
                    <BentoCardSimple
                      title="RWA Asset Count"
                      value="25"
                      colors={getNetworkColors(activeTab)}
                      icon={<Package className="h-4 w-4" />}
                    />
                  </div>
                </div>

                {/* Add the RWA Metrics Chart */}
                <div className="mb-8">
                  <RWAMetricsChart network={activeTab} />
                </div>
                
                <div className="mb-8">
                  <h3 className="text-md font-semibold mb-2">
                    {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} RWA League Table
                  </h3>
                  <DataTable network={activeTab} />
                </div>
              </div>
            )}

            {/* Governance Tab - Only for Avalanche */}
            {activeTab === "avalanche" && activeSubcategory === "governance" && (
              <div>
                <h2 className="text-lg font-bold mb-4">Avalanche Governance</h2>
                
                <GovernanceStatusCards colors={getNetworkColors(activeTab)} />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <div>
                    <h3 className="text-md font-semibold mb-2">Proposal History</h3>
                    <PlotlyChart network={activeTab} metric="proposalVotes" />
                  </div>
                  <div>
                    <StakingDistributionPieChart network={activeTab} />
                  </div>
                </div>
                
                <div className="mb-8">
                  <h3 className="text-md font-semibold mb-2">Avalanche Community Proposals</h3>
                  <div className="border p-4 rounded-md">
                    <AvalancheProposals showArchived={false} maxHeight="600px" />
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-md font-semibold mb-2">Avalanche Community Discussions</h3>
                  <div className="border p-4 rounded-md">
                    <AvalancheDiscussions showClosed={false} maxHeight="600px" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
