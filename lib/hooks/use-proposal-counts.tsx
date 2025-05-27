"use client"

import { useState, useEffect } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface ProposalCounts {
  activated: number
  proposed: number
  implementable: number
  loading: boolean
  error: string | null
}

export function useProposalCounts(): ProposalCounts {
  const [counts, setCounts] = useState<ProposalCounts>({
    activated: 0,
    proposed: 0,
    implementable: 0,
    loading: true,
    error: null
  })

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setCounts(prev => ({ ...prev, loading: false, error: "Supabase is not configured" }))
      return
    }

    async function fetchProposalCounts() {
      try {
        // Fetch all non-archived proposals
        const { data, error } = await supabase
          .from('avalanche_acp')
          .select('Status')
          .eq('is_archived', false)
        
        if (error) {
          throw error
        }
        
        if (data) {
          // Count proposals by status
          const activatedCount = data.filter(p => p.Status?.toLowerCase() === 'activated').length
          const proposedCount = data.filter(p => p.Status?.toLowerCase() === 'proposed').length
          const implementableCount = data.filter(p => p.Status?.toLowerCase() === 'implementable').length
          
          setCounts({
            activated: activatedCount,
            proposed: proposedCount,
            implementable: implementableCount,
            loading: false,
            error: null
          })
        }
      } catch (err) {
        console.error('Error fetching proposal counts:', err)
        setCounts(prev => ({ 
          ...prev, 
          loading: false, 
          error: err instanceof Error ? err.message : "Unknown error occurred" 
        }))
      }
    }

    fetchProposalCounts()
  }, [])

  return counts
} 