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
import { AvalancheACPDiscussionRow } from "@/lib/types"
import { ExternalLink, FileText, MessageCircle, ThumbsUp } from "lucide-react"

interface AvalancheDiscussionsProps {
  showClosed?: boolean;
  filterByCategory?: string;
  maxHeight?: string;
}

export function AvalancheDiscussions({
  showClosed = false,
  filterByCategory,
  maxHeight = "500px",
}: AvalancheDiscussionsProps) {
  const [discussions, setDiscussions] = useState<AvalancheACPDiscussionRow[]>([])
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

    async function fetchDiscussions() {
      try {
        setLoading(true)
        
        let query = supabase
          .from('avalanche_acp_discussions')
          .select('*')
          
        if (!showClosed) {
          query = query.eq('closed', false)
        }
        
        if (filterByCategory) {
          query = query.eq('category', filterByCategory)
        }
        
        // Order by created_at in descending order
        query = query.order('created_at', { ascending: false })
        
        const { data, error: supabaseError } = await query
        
        if (supabaseError) {
          throw supabaseError
        }
        
        setDiscussions(data as AvalancheACPDiscussionRow[])
        setError(null)
      } catch (err) {
        console.error('Error fetching Avalanche discussions:', err)
        setError('Failed to load discussions. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchDiscussions()
  }, [showClosed, filterByCategory])

  function getCategoryColor(category: string | null) {
    if (!category) return "bg-gray-100 text-gray-800"
    
    switch (category.toLowerCase()) {
      case 'discussions':
        return "bg-blue-100 text-blue-800"
      case 'announcements':
        return "bg-green-100 text-green-800"
      case 'brainstorming':
        return "bg-pink-100 text-pink-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }
  
  // Helper function to format dates
  function formatDate(dateString: string | null) {
    if (!dateString) return '-';
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

  if (!discussions || discussions.length === 0) {
    return (
      <div className="w-full py-8 text-center text-gray-500">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2">No discussions found</p>
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
              <TableHead>Author</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-center">Stats</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discussions.map((discussion) => (
              <TableRow key={discussion.id}>
                <TableCell className="font-medium">
                  {discussion.title}
                  {discussion.is_answered && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Answered
                    </span>
                  )}
                </TableCell>
                <TableCell>{discussion.author}</TableCell>
                <TableCell>
                  {discussion.category && (
                    <span 
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(discussion.category)}`}
                    >
                      {discussion.category}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center space-x-3 text-sm text-gray-500">
                    <span className="flex items-center">
                      <MessageCircle className="h-3.5 w-3.5 mr-1" />
                      {discussion.comment_count || 0}
                    </span>
                    <span className="flex items-center">
                      <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                      {discussion.upvote_count || 0}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{formatDate(discussion.created_at)}</TableCell>
                <TableCell>{formatDate(discussion.updated_at)}</TableCell>
                <TableCell className="text-right">
                  <a 
                    href={discussion.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View
                  </a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 