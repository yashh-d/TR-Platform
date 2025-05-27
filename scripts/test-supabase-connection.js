// Test script to verify Supabase connection and fetch from avalanche_acp table
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

async function testConnection() {
  // Read credentials directly from .env.local file
  const envPath = path.resolve('/Users/yash/Downloads/blockchain-dashboard (1)/.env.local')
  
  console.log(`Reading credentials from: ${envPath}`)
  
  try {
    if (!fs.existsSync(envPath)) {
      console.error(`ERROR: .env.local file not found at ${envPath}`)
      process.exit(1)
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8')
    const envLines = envContent.split('\n')
    
    const envVars = {}
    envLines.forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim()
        envVars[key] = value.replace(/^['"](.*)['"]$/, '$1') // Remove quotes if present
      }
    })
    
    const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('ERROR: Missing Supabase credentials in .env.local file')
      console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set')
      process.exit(1)
    }
    
    console.log('Connecting to Supabase with credentials from .env.local...')
    console.log(`URL: ${supabaseUrl.substring(0, 15)}...`)
    console.log(`Key: ${supabaseKey.substring(0, 5)}...`)
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Test 1: Verify connection and table existence with a count query
    console.log('\nTesting table existence...')
    const { data: countResult, error: countError, count } = await supabase
      .from('avalanche_acp')
      .select('*', { count: 'exact', head: true })
      
    if (countError) {
      console.error('ERROR: Failed to query table:', countError.message)
      process.exit(1)
    }
    
    console.log('Connection successful! Table exists.')
    console.log(`Total rows in avalanche_acp table: ${count}`)
    
    // Test 2: Fetch a sample of actual data
    console.log('\nFetching sample data (first 3 rows)...')
    const { data, error } = await supabase
      .from('avalanche_acp')
      .select('*')
      .limit(3)
      
    if (error) {
      console.error('ERROR: Failed to fetch data:', error.message)
      process.exit(1)
    }
    
    console.log('Data retrieved successfully!')
    console.log('Sample data:')
    console.log(JSON.stringify(data, null, 2))
    
    console.log('\nSUCCESS: Supabase connection and data retrieval working correctly.')
  } catch (err) {
    console.error('UNEXPECTED ERROR:', err.message)
    process.exit(1)
  }
}

// Run the test
testConnection() 