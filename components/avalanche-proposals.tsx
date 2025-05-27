"use client"

import { useState, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { AvalancheACPRow } from "@/lib/types"
import { ExternalLink, FileText } from "lucide-react"

interface AvalancheProposalsProps {
  showArchived?: boolean;
  filterByStatus?: string;
  maxHeight?: string;
}

export function AvalancheProposals({
  showArchived = false,
  filterByStatus,
  maxHeight = "500px", // Default max height to make it scrollable
}: AvalancheProposalsProps) {
  const [proposals, setProposals] = useState<AvalancheACPRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [configError, setConfigError] = useState(false)

  useEffect(() => {
    // Check if Supabase is configured before attempting to fetch data
    if (!isSupabaseConfigured()) {
      setConfigError(true)
      setLoading(false)
      return
    }

    async function fetchProposals() {
      try {
        setLoading(true)
        
        let query = supabase
          .from('avalanche_acp')
          .select('*')
          
        if (!showArchived) {
          query = query.eq('is_archived', false)
        }
        
        if (filterByStatus) {
          query = query.eq('Status', filterByStatus)
        }
        
        // Order by created_at in descending order
        query = query.order('created_at', { ascending: false })
        
        const { data, error: supabaseError } = await query
        
        if (supabaseError) {
          throw supabaseError
        }
        
        setProposals(data as AvalancheACPRow[])
        setError(null)
      } catch (err) {
        console.error('Error fetching Avalanche proposals:', err)
        setError('Failed to load proposals. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchProposals()
  }, [showArchived, filterByStatus])

  function getStatusColor(status: string | null) {
    if (!status) return "bg-gray-100 text-gray-800"
    
    switch (status.toLowerCase()) {
      case 'activated':
        return "bg-green-100 text-green-800"
      case 'implementable':
        return "bg-blue-100 text-blue-800"
      case 'stale':
        return "bg-gray-100 text-gray-600"
      case 'proposed':
        return "bg-yellow-100 text-yellow-800"
      case 'rejected':
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }
  
  // Helper function to format dates
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  if (loading) {
    return (
      <div className="w-full flex justify-center py-8">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full py-4 px-6 rounded-md bg-red-50 text-red-600">
        <p>{error}</p>
      </div>
    )
  }

  if (configError) {
    return (
      <div className="w-full py-4 px-6 rounded-md bg-yellow-50 text-yellow-600">
        <p>Supabase environment variables are missing. Please check your .env.local file.</p>
      </div>
    )
  }

  if (!proposals || proposals.length === 0) {
    return (
      <div className="w-full py-8 text-center text-gray-500">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2">No proposals found</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <div style={{ maxHeight, overflowY: 'auto' }}>
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10">
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Track</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {proposals.map((proposal) => (
              <TableRow key={proposal.item_id}>
                <TableCell className="font-medium">{proposal.item_title}</TableCell>
                <TableCell>{proposal.Track || '-'}</TableCell>
                <TableCell>
                  <span 
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(proposal.Status)}`}
                  >
                    {proposal.Status || 'Unknown'}
                  </span>
                </TableCell>
                <TableCell>{formatDate(proposal.created_at)}</TableCell>
                <TableCell>{formatDate(proposal.updated_at)}</TableCell>
                <TableCell className="text-right">
                  {proposal.item_url && (
                    <a 
                      href={proposal.item_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View
                    </a>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 