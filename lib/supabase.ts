"use client"

import { createClient } from "@supabase/supabase-js"

// Get the environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Log environment variable status (will be removed in production)
console.log("Supabase URL available:", !!supabaseUrl)
console.log("Supabase Key available:", !!supabaseAnonKey)

// Ensure environment variables are present
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing Supabase environment variables. Please check your .env.local file."
  )
  // Don't throw an error here, as it would break SSR
}

// Create and export the Supabase client
export const supabase = createClient(
  supabaseUrl || "", 
  supabaseAnonKey || ""
)

// Helper function to check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  return !!supabaseUrl && !!supabaseAnonKey
}
