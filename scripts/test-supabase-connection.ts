import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables from .env file
config()

async function testSupabaseConnection() {
  console.log('Testing Supabase connection...')
  
  // Get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log(`Supabase URL configured: ${!!supabaseUrl}`)
  console.log(`Supabase Key configured: ${!!supabaseKey}`)
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables!')
    process.exit(1)
  }
  
  try {
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Test connection by trying to get table information
    console.log('Attempting to query the avalanche_acp table...')
    
    // First try to count records
    const { count, error: countError } = await supabase
      .from('avalanche_acp')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('Error counting records:', countError)
      
      // Check if table exists
      console.log('Checking if table exists...')
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
      
      if (tablesError) {
        console.error('Error listing tables:', tablesError)
      } else {
        console.log('Available tables:', tables.map(t => t.table_name))
        
        if (tables.some(t => t.table_name === 'avalanche_acp')) {
          console.log('The avalanche_acp table exists but there might be permission issues.')
        } else {
          console.log('The avalanche_acp table does not exist in the database.')
        }
      }
    } else {
      console.log(`Connection successful! Found ${count} records in avalanche_acp table.`)
      
      // Try to fetch a few records to verify column access
      const { data, error: fetchError } = await supabase
        .from('avalanche_acp')
        .select('*')
        .limit(1)
      
      if (fetchError) {
        console.error('Error fetching records:', fetchError)
      } else {
        console.log('Successfully retrieved data:')
        console.log(JSON.stringify(data, null, 2))
        
        // Verify column names match our expectations
        if (data && data.length > 0) {
          const record = data[0]
          const expectedColumns = [
            'project_id', 'project_number', 'project_title', 
            'item_id', 'item_type', 'item_number', 'item_title', 
            'item_url', 'is_archived', 'created_at', 'updated_at',
            'Parent issue', 'Status', 'Sub-issues progress', 'Track'
          ]
          
          const missingColumns = expectedColumns.filter(col => !(col in record))
          if (missingColumns.length > 0) {
            console.warn('Missing expected columns:', missingColumns)
          } else {
            console.log('All expected columns are present!')
          }
        }
      }
    }
  } catch (err) {
    console.error('Unexpected error testing Supabase connection:', err)
  }
}

// Run the test
testSupabaseConnection()
  .then(() => console.log('Test completed'))
  .catch(err => console.error('Test failed:', err)) 