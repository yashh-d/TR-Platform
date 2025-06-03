# Blockchain Dashboard

A comprehensive dashboard for exploring blockchain ecosystems with the best metrics in the industry.

## Features

### Network Support
- **Bitcoin**: Core network metrics and analysis
- **Ethereum**: DeFi protocols, network stats, and ecosystem data
- **Solana**: High-performance blockchain metrics
- **Avalanche**: Complete ecosystem including DeFi, governance, and subnet data
- **Polygon**: Layer 2 scaling solution metrics
- **Core**: Bitcoin-powered blockchain analytics

### Dashboard Sections

#### Overview
- Network-specific key performance indicators
- Price charts and market data
- Transaction volume and user activity

#### Network
- Core blockchain metrics
- Transaction throughput and gas usage
- Network health indicators

#### L1s (Layer 1 Blockchains)
- Subnet metrics for Avalanche
- Cross-chain comparisons
- Block production statistics

#### dApps + Protocols
- **Top dApps by Metrics**: Comprehensive ranking of decentralized applications
- **Top DeFi Protocols**: NEW! Dedicated table for DeFi applications with:
  - Total Value Locked (TVL) and changes
  - Market capitalization and changes
  - Token prices and price changes
  - Market Cap to TVL ratios
  - Multi-chain support indicators
  - Sortable by rank, TVL, or market cap
  - Time range filtering (24h, 7d, 30d, etc.)
- Protocol TVL charts
- DEX volume analytics
- Category breakdowns

#### Stablecoins
- Stablecoin distribution and volume
- Cross-chain bridging analytics
- Market share analysis

#### Institutions + RWAs
- Real World Assets (RWA) tracking
- Institutional adoption metrics
- Asset tokenization data

#### Governance (Avalanche-specific)
- Avalanche Community Proposals (ACPs)
- Community discussions and voting
- Staking distribution
- Proposal history and analytics

## New DeFi Table Features

The **Top DeFi Protocols** table provides comprehensive insights into the DeFi ecosystem:

### Data Points
- **Rank**: Protocol ranking based on selected metric
- **Protocol Info**: Name, logo, and associated token details
- **Supported Chains**: Multi-chain protocol indicators
- **TVL**: Total Value Locked with percentage changes
- **Market Cap**: Token market capitalization with changes
- **Token Price**: Current token price with price changes
- **MC/TVL Ratio**: Market Cap to TVL ratio for valuation analysis

### Interactive Features
- **Time Range Selection**: Filter data by different time periods
- **Sorting Options**: Sort by rank, TVL, or market cap
- **Ascending/Descending**: Toggle sort order
- **Responsive Design**: Optimized for different screen sizes

### Database Schema
The feature uses the `avalanche_defi_apps` table with the following structure:
- Comprehensive DeFi protocol data
- Real-time price and TVL tracking
- Multi-chain support information
- Historical change calculations
- Active protocol filtering

## Technology Stack

- **Frontend**: Next.js 14 with TypeScript
- **UI Components**: Custom component library with Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Charts**: Plotly.js for interactive visualizations
- **Icons**: Lucide React

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables for Supabase connection
4. Run the development server: `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000)

## Database Setup

To use the DeFi table feature, ensure your Supabase database includes the `avalanche_defi_apps` table with the schema provided in the component documentation.

## Contributing

Contributions are welcome! Please ensure all new features include proper TypeScript types and follow the existing code patterns. 