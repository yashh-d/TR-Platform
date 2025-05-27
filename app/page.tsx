"use client"

import { useState } from "react"
import {
  Search,
  ChevronDown,
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

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("avalanche")
  const [activeSubcategory, setActiveSubcategory] = useState("overview")

  // Get subcategory tabs based on active blockchain
  const getSubcategoryTabs = (network: string) => {
    const commonTabs = ["Overview", "Network", "L1s", "dApps + Protocols", "Stablecoins", "Institutions + RWAs"]
    
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
        return ["#14F195", "#00C4A2", "#9945FF"]
      case "avalanche":
        return ["#E84142", "#FF6B6B", "#FF9B9B"]
      case "polygon":
        return ["#8247E5", "#A277FF", "#C4A7FF"]
      case "core":
        return ["#FF7700", "#FF9500", "#FFB700"] // Bright orange palette
      default:
        return ["#3B82F6", "#60A5FA", "#93C5FD"]
    }
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
            Explore our ecosystems. The best metrics in blockchain.
          </div>
        </div>

        <div className="flex items-center">
          <div className="relative mx-2">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search..."
              className="rounded-md border border-gray-300 pl-8 pr-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-[200px]"
            />
          </div>
          <Button variant="outline" size="sm" className="mx-1 text-xs">
            <ChevronDown className="h-3 w-3 mr-1" />
            CHAIN
          </Button>
        </div>

        <div className="flex items-center">
          <Button variant="outline" size="sm" className="mr-2">
            Sign In
          </Button>
          <Button size="sm">Contact</Button>
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
              {["Bitcoin", "Ethereum", "Solana", "Avalanche", "Polygon", "Core"].map((network) => (
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
                    <div className="grid grid-cols-6 gap-4 mb-8">
                      <div className="col-span-2">
                        <BentoCardSimple
                          title="Price"
                          value="$63,429.48"
                          subtitle="+1.24% in 24h"
                          colors={getNetworkColors(activeTab)}
                          icon={<DollarSign className="h-4 w-4" />}
                        />
                      </div>
                      <div className="col-span-2">
                        <BentoCardSimple
                          title="Market Cap"
                          value="$1.25T"
                          subtitle="+1.26% in 24h"
                          colors={getNetworkColors(activeTab)}
                          icon={<BarChart3 className="h-4 w-4" />}
                        />
                      </div>
                      <div className="col-span-2">
                        <BentoCardSimple
                          title="Circulating Supply"
                          value="19.44M BTC"
                          subtitle="92.57% of 21M"
                          colors={getNetworkColors(activeTab)}
                          icon={<Coins className="h-4 w-4" />}
                        />
                      </div>
                      <div className="col-span-2">
                        <BentoCardSimple
                          title="Hash Rate"
                          value="562.32 EH/s"
                          subtitle="+8.47% in 7d"
                          colors={getNetworkColors(activeTab)}
                          icon={<Cpu className="h-4 w-4" />}
                        />
                      </div>
                      <div className="col-span-2">
                        <BentoCardSimple
                          title="Active Addresses"
                          value="1.02M"
                          subtitle="+3.12% in 24h"
                          colors={getNetworkColors(activeTab)}
                          icon={<Users className="h-4 w-4" />}
                        />
                      </div>
                      <div className="col-span-2">
                        <BentoCardSimple
                          title="Transaction Count"
                          value="324,892"
                          subtitle="Daily average"
                          colors={getNetworkColors(activeTab)}
                          icon={<LineChart className="h-4 w-4" />}
                        />
                      </div>
                    </div>

                    {/* Bitcoin Metrics Chart */}
                    <div className="mb-8">
                      <BitcoinMetricsChart title="Bitcoin Metrics" height="500px" defaultMetric="close_price" />
                    </div>

                    {/* Additional Bitcoin Metrics */}
                    <div className="grid grid-cols-2 gap-6 mb-8">
                      <div>
                        <h3 className="text-md font-semibold mb-2">Hash Rate & Mining</h3>
                        <BitcoinMetricsChart title="Hash Rate" height="300px" defaultMetric="hash_rate" />
                      </div>
                      <div>
                        <h3 className="text-md font-semibold mb-2">Transaction Activity</h3>
                        <BitcoinMetricsChart title="Transactions" height="300px" defaultMetric="txn_count" />
                      </div>
                    </div>
                  </>
                ) : (
                  // Default overview content for other networks
                  <>
                    {/* Metrics Cards */}
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
                      <div className="col-span-2">
                        <BentoCardSimple
                          title="Stablecoin Market Cap"
                          value="$2.22B"
                          subtitle="+0.08% in 24h ago"
                          colors={getNetworkColors(activeTab)}
                          icon={<Coins className="h-4 w-4" />}
                        />
                      </div>
                      <div className="col-span-2">
                        <BentoCardSimple
                          title="Stablecoin Holders"
                          value="2.52M"
                          subtitle="+0.04% in 24h ago"
                          colors={getNetworkColors(activeTab)}
                          icon={<Wallet className="h-4 w-4" />}
                        />
                      </div>
                      <div className="col-span-2">
                        <BentoCardSimple
                          title="Stablecoin Count"
                          value="8"
                          colors={getNetworkColors(activeTab)}
                          icon={<Hash className="h-4 w-4" />}
                        />
                      </div>
                    </div>

                    {/* Metrics Chart - Using our updated PlotlyChart component */}
                    <div className="mb-8">
                      {activeTab === "ethereum" ? (
                        <EthereumMetricsChart title="Ethereum Metrics" height="500px" defaultMetric="price" />
                      ) : (
                        <PlotlyChart network={activeTab} metric="activeAddresses" />
                      )}
                    </div>

                    {/* Add the Subnet Metrics Chart */}
                    <SubnetMetricsChart network={activeTab} />
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
                
                {/* Replace the PlotlyChart components with our new NetworkStatsChart */}
                <div className="mb-8">
                  <NetworkStatsChart network={activeTab} metric="avgGps" />
                </div>
                
                {/* Remove the existing BentoCards in favor of the chart */}
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
                
                {/* Subnet Metrics Charts */}
                <div className="mb-8">
                  <h3 className="text-md font-semibold mb-2">Subnet Performance</h3>
                  <SubnetMetricsChart title="Subnet Metrics" />
                </div>
                
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <h3 className="text-md font-semibold mb-2">Gas Prices</h3>
                    <PlotlyChart network={activeTab} metric="avgGps" />
                  </div>
                  <div>
                    <h3 className="text-md font-semibold mb-2">Transaction Volume</h3>
                    <SubnetMetricsChart title="Transaction Volume" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <h3 className="text-md font-semibold mb-2">Active Addresses</h3>
                    <SubnetMetricsChart title="Active Addresses" />
                  </div>
                  <div>
                    <h3 className="text-md font-semibold mb-2">Block Production</h3>
                    <SubnetMetricsChart title="Block Production" />
                  </div>
                </div>
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
                <div className="grid grid-cols-6 gap-4 mb-8">
                  <div className="col-span-2">
                    <BentoCardSimple
                      title="Total Circulating"
                      value="$1.78B"
                      subtitle="+0.08% in 24h ago"
                      colors={getNetworkColors(activeTab)}
                      icon={<Coins className="h-4 w-4" />}
                    />
                  </div>
                  <div className="col-span-2">
                    <BentoCardSimple
                      title="USDC Circulating"
                      value="$773.60M"
                      subtitle="+0.06% in 24h ago"
                      colors={getNetworkColors(activeTab)}
                      icon={<DollarSign className="h-4 w-4" />}
                    />
                  </div>
                  <div className="col-span-2">
                    <BentoCardSimple
                      title="USDT Circulating"
                      value="$770.54M"
                      subtitle="+0.05% in 24h ago"
                      colors={getNetworkColors(activeTab)}
                      icon={<DollarSign className="h-4 w-4" />}
                    />
                  </div>
                </div>
                
                <div className="mb-8">
                  <StablecoinMetricsChart network={activeTab} />
                </div>
                
                <div className="mb-8">
                  <h3 className="text-md font-semibold mb-2">Stablecoin Distribution</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <PlotlyChart network={activeTab} metric="stablecoinVolume" />
                    </div>
                    <div>
                      <PieChartComponent network={activeTab} />
                    </div>
                  </div>
                </div>
                
                <div className="mb-8">
                  <h3 className="text-md font-semibold mb-2">Stablecoins on {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h3>
                  <DataTable network={activeTab} />
                </div>
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
                    <StakingDistributionChart network={activeTab} />
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

            {/* League Table */}
            {activeSubcategory === "overview" && (
              <div className="mb-8">
                <h2 className="text-lg font-bold mb-4">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} RWA League Table
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <DataTable network={activeTab} />
                  </div>
                  <div>
                    <PieChartComponent network={activeTab} />
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
