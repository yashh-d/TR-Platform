"use client"

import { createClient } from "@supabase/supabase-js"

// Get the environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Enhanced logging for debugging
console.log("Supabase Configuration Status:")
console.log("- URL available:", !!supabaseUrl)
console.log("- URL value:", supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'Missing')
console.log("- Key available:", !!supabaseAnonKey)
console.log("- Key format:", supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}... (${supabaseAnonKey.length} chars)` : 'Missing')

// Ensure environment variables are present
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "❌ Missing Supabase environment variables. Please check your .env.local file."
  )
  console.error("Required variables:")
  console.error("- NEXT_PUBLIC_SUPABASE_URL")
  console.error("- NEXT_PUBLIC_SUPABASE_ANON_KEY")
  // Don't throw an error here, as it would break SSR
}

// Create and export the Supabase client
export const supabase = createClient(
  supabaseUrl || "", 
  supabaseAnonKey || "",
  {
    auth: {
      persistSession: false, // Don't persist auth session in localStorage
    },
    global: {
      headers: {
        'X-Client-Info': 'tr-platform-web'
      }
    }
  }
)

// Helper function to check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  const isConfigured = !!(supabaseUrl && supabaseAnonKey)
  
  if (!isConfigured) {
    console.warn("⚠️  Supabase is not properly configured")
  }
  
  return isConfigured
}

// Helper function to test Supabase connection
export async function testSupabaseConnection(): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase not configured" }
  }
  
  try {
    // Test with a simple RPC call that should always work
    const { error } = await supabase.rpc('version')
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (err) {
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    }
  }
}
