const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Get the environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key to bypass RLS

// Ensure environment variables are present
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

// Create the Supabase client with service role key for admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Sample data for the avalanche_core table
const avalancheCoreData = [
  {
    timestamp: 1737139200000, // 2025-05-11
    date: '2025-05-11',
    activeAddresses: '125600',
    activeSenders: '89400',
    cumulativeTxCount: '287541365',
    cumulativeAddresses: '2934521',
    cumulativeContracts: '45621',
    cumulativeDeployers: '12432',
    gasUsed: '8762345128',
    txCount: '3216745',
    avgGps: '101.5',
    maxGps: '243.2',
    avgTps: '37.2',
    maxTps: '89.6',
    maxGasPrice: '35.6',
    feesPaid: '1245.34',
    avgGasPrice: '25.2'
  },
  {
    timestamp: 1737052800000, // 2025-05-10
    date: '2025-05-10',
    activeAddresses: '118700',
    activeSenders: '84200',
    cumulativeTxCount: '284324620',
    cumulativeAddresses: '2923410',
    cumulativeContracts: '45530',
    cumulativeDeployers: '12380',
    gasUsed: '7645234671',
    txCount: '2987234',
    avgGps: '88.5',
    maxGps: '197.3',
    avgTps: '34.6',
    maxTps: '76.8',
    maxGasPrice: '38.1',
    feesPaid: '1142.87',
    avgGasPrice: '26.4'
  },
  {
    timestamp: 1736966400000, // 2025-05-09
    date: '2025-05-09',
    activeAddresses: '132400',
    activeSenders: '93600',
    cumulativeTxCount: '281337386',
    cumulativeAddresses: '2912350',
    cumulativeContracts: '45470',
    cumulativeDeployers: '12340',
    gasUsed: '8342156723',
    txCount: '3412345',
    avgGps: '96.6',
    maxGps: '221.4',
    avgTps: '39.5',
    maxTps: '92.7',
    maxGasPrice: '34.2',
    feesPaid: '1298.56',
    avgGasPrice: '24.8'
  },
  {
    timestamp: 1736880000000, // 2025-05-08
    date: '2025-05-08',
    activeAddresses: '115800',
    activeSenders: '82100',
    cumulativeTxCount: '277925041',
    cumulativeAddresses: '2902180',
    cumulativeContracts: '45380',
    cumulativeDeployers: '12290',
    gasUsed: '7125867423',
    txCount: '2756123',
    avgGps: '82.7',
    maxGps: '187.5',
    avgTps: '31.9',
    maxTps: '72.3',
    maxGasPrice: '39.5',
    feesPaid: '1087.21',
    avgGasPrice: '27.1'
  },
  {
    timestamp: 1736793600000, // 2025-05-07
    date: '2025-05-07',
    activeAddresses: '127900',
    activeSenders: '91200',
    cumulativeTxCount: '275168918',
    cumulativeAddresses: '2891320',
    cumulativeContracts: '45290',
    cumulativeDeployers: '12250',
    gasUsed: '8056732145',
    txCount: '3234567',
    avgGps: '93.2',
    maxGps: '215.6',
    avgTps: '37.4',
    maxTps: '88.9',
    maxGasPrice: '36.8',
    feesPaid: '1276.43',
    avgGasPrice: '25.9'
  },
  {
    timestamp: 1736707200000, // 2025-05-06
    date: '2025-05-06',
    activeAddresses: '121300',
    activeSenders: '86700',
    cumulativeTxCount: '271934351',
    cumulativeAddresses: '2880210',
    cumulativeContracts: '45210',
    cumulativeDeployers: '12190',
    gasUsed: '7789346218',
    txCount: '2987651',
    avgGps: '90.2',
    maxGps: '203.8',
    avgTps: '34.6',
    maxTps: '79.2',
    maxGasPrice: '37.4',
    feesPaid: '1178.32',
    avgGasPrice: '26.8'
  },
  {
    timestamp: 1736620800000, // 2025-05-05
    date: '2025-05-05',
    activeAddresses: '130800',
    activeSenders: '92300',
    cumulativeTxCount: '268946700',
    cumulativeAddresses: '2868940',
    cumulativeContracts: '45120',
    cumulativeDeployers: '12140',
    gasUsed: '8267891543',
    txCount: '3298764',
    avgGps: '95.6',
    maxGps: '218.7',
    avgTps: '38.2',
    maxTps: '91.5',
    maxGasPrice: '35.1',
    feesPaid: '1289.76',
    avgGasPrice: '25.4'
  }
]

// Function to seed the database
async function seedAvalancheCoreData() {
  console.log('Starting to seed avalanche_core data...')
  
  try {
    // First, let's check if RLS is enabled on the table
    console.log('Checking table policies...')
    
    // Try to disable RLS temporarily for this operation (requires superuser privileges)
    console.log('Attempting to insert data bypassing RLS with service role key...')
    
    // Clear existing data
    const { error: deleteError } = await supabase
      .from('avalanche_core')
      .delete()
      .neq('date', '') // Delete all records
    
    if (deleteError) {
      console.error('Error clearing existing data:', deleteError)
      console.log('Attempting to insert without clearing...')
    } else {
      console.log('Cleared existing data successfully.')
    }
    
    // Insert new data
    const { error: insertError } = await supabase
      .from('avalanche_core')
      .insert(avalancheCoreData)
    
    if (insertError) {
      console.error('Error inserting data:', insertError)
      
      // Alternative approach: Try the REST API with auth headers
      console.log('Trying alternative approach with upsert...')
      const { error: upsertError } = await supabase
        .from('avalanche_core')
        .upsert(avalancheCoreData, { onConflict: 'date' })
      
      if (upsertError) {
        console.error('Error upserting data:', upsertError)
        return
      } else {
        console.log('Successfully upserted avalanche_core table with sample data!')
      }
    } else {
      console.log('Successfully seeded avalanche_core table with sample data!')
    }
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Run the seed function
seedAvalancheCoreData() 