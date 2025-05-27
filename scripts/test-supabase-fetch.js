// Simple script to test Supabase connection and fetch from avalanche_acp table

require('dotenv').config(); // Load environment variables from .env file
const { createClient } = require('@supabase/supabase-js');

async function testSupabaseFetch() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('Supabase URL:', supabaseUrl ? 'Configured ✓' : 'Missing ✗');
  console.log('Supabase Key:', supabaseKey ? 'Configured ✓' : 'Missing ✗');

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase credentials');
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('Testing connection...');
    
    // Test table existence first
    const { count, error: countError } = await supabase
      .from('avalanche_acp')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      console.error('Error checking table:', countError.message);
      return;
    }
    
    console.log(`Table exists and contains ${count} rows`);
    
    // Try to fetch some actual data
    const { data, error } = await supabase
      .from('avalanche_acp')
      .select('*')
      .limit(3);
      
    if (error) {
      console.error('Error fetching data:', error.message);
      return;
    }
    
    console.log('Successfully fetched data:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (err) {
    console.error('Unexpected error:', err.message);
  }
}

testSupabaseFetch()
  .then(() => console.log('Test completed'))
  .catch(err => console.error('Fatal error:', err)); 