export interface SampleSubnet {
  blockchain_name: string;
  subnet_id: string;
  evm_id: number;
}

export interface SampleMetric {
  name: string;
  displayName: string;
  baseValue: number;
  variance: number;
  unit: string;
  trend: 'up' | 'down' | 'flat';
}

// Sample subnets for demonstration
export const SAMPLE_SUBNETS: SampleSubnet[] = [
  { blockchain_name: "Primary Network", subnet_id: "11111111111111111111111111111111LpoYY", evm_id: 1 },
  { blockchain_name: "C-Chain", subnet_id: "2oYMBNV4eNHyqk2fjjV5nVQLDbtmNJzq5s3qs3Lo6ftnC6FByM", evm_id: 2 },
  { blockchain_name: "X-Chain", subnet_id: "jnUjZSRt16TcRnZzmh5aMhavwVHz3zBrSN8GfFMTQkzUnoBxC", evm_id: 3 },
  { blockchain_name: "DeFi Kingdoms", subnet_id: "9VFT5vW8a3aly9qBtgxTBiRVoCBP1dBSirbNbwQ9LBoWmNso7", evm_id: 4 },
  { blockchain_name: "Dexalot", subnet_id: "2uD7cB9yn9nZw5SiRyZqQpV6jilF7dK3gVJZJHMvcB5AAAAs6", evm_id: 5 },
  { blockchain_name: "WAGMI", subnet_id: "5xT7eLPKRQAAuHb4U8jE8mAMvHiZxe7r8czZiknMCWvELmUQE", evm_id: 6 },
  { blockchain_name: "Swimmer", subnet_id: "8mL1VfVKNvqkRMvFFZgiLdwBJ3bqUfBSdAp8ZVQRYpShpU2TM", evm_id: 7 },
];

// Sample metrics for demonstration
export const SAMPLE_METRICS: SampleMetric[] = [
  { 
    name: "transactions_per_second", 
    displayName: "Transactions Per Second", 
    baseValue: 1500, 
    variance: 500, 
    unit: "TPS",
    trend: 'up'
  },
  { 
    name: "block_time", 
    displayName: "Block Time", 
    baseValue: 2, 
    variance: 0.5, 
    unit: "seconds",
    trend: 'down'
  },
  { 
    name: "gas_used", 
    displayName: "Gas Used", 
    baseValue: 5000000, 
    variance: 1000000, 
    unit: "gas",
    trend: 'up'
  },
  { 
    name: "average_fee", 
    displayName: "Average Fee", 
    baseValue: 0.01, 
    variance: 0.005, 
    unit: "AVAX",
    trend: 'down'
  },
  { 
    name: "active_validators", 
    displayName: "Active Validators", 
    baseValue: 150, 
    variance: 10, 
    unit: "validators",
    trend: 'up'
  },
  { 
    name: "block_size", 
    displayName: "Block Size", 
    baseValue: 2000, 
    variance: 500, 
    unit: "bytes",
    trend: 'up'
  },
  { 
    name: "transaction_success_rate", 
    displayName: "Transaction Success Rate", 
    baseValue: 99.5, 
    variance: 0.5, 
    unit: "%",
    trend: 'flat'
  }
]; 