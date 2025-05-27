"use client"

import { useState } from "react"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ChevronDown, Filter } from "lucide-react"

// Define the proposal data structure based on the database schema
type Proposal = {
  item_id: string
  item_title: string
  Status: string | null
  Track: string | null
  created_at: string
  updated_at: string
}

interface ProposalsTableProps {
  network: string
}

export function ProposalsTable({ network }: ProposalsTableProps) {
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [trackFilter, setTrackFilter] = useState<string | null>(null)

  // Mock data based on the provided database schema
  const proposals: Proposal[] = [
    {
      item_id: "ACP-1",
      item_title: "Implement Subnet Gas Fee Adjustments",
      Status: "In Progress",
      Track: "Technical",
      created_at: "2023-11-15T10:30:00Z",
      updated_at: "2023-12-01T14:45:00Z"
    },
    {
      item_id: "ACP-2",
      item_title: "Increase Validator Minimum Stake Requirements",
      Status: "Completed",
      Track: "Governance",
      created_at: "2023-11-20T09:15:00Z",
      updated_at: "2023-12-10T11:20:00Z"
    },
    {
      item_id: "ACP-3",
      item_title: "Community Fund Allocation for Developer Grants",
      Status: "Voting",
      Track: "Community",
      created_at: "2023-12-05T16:45:00Z",
      updated_at: "2023-12-15T08:30:00Z"
    },
    {
      item_id: "ACP-4",
      item_title: "Update Node Hardware Requirements",
      Status: "Voting",
      Track: "Technical",
      created_at: "2023-12-10T13:20:00Z",
      updated_at: "2023-12-18T09:45:00Z"
    },
    {
      item_id: "ACP-5",
      item_title: "Treasury Fund Allocation for Marketing",
      Status: "Proposed",
      Track: "Community",
      created_at: "2023-12-15T11:10:00Z",
      updated_at: "2023-12-19T15:30:00Z"
    },
    {
      item_id: "ACP-6",
      item_title: "Improve Documentation for Subnet Creation",
      Status: "Proposed",
      Track: "Technical",
      created_at: "2023-12-20T10:05:00Z",
      updated_at: "2023-12-22T14:15:00Z"
    },
    {
      item_id: "ACP-7",
      item_title: "Integration of New Privacy Features",
      Status: "Discussion",
      Track: "Technical",
      created_at: "2023-12-25T09:30:00Z",
      updated_at: "2023-12-28T16:40:00Z"
    },
    {
      item_id: "ACP-8",
      item_title: "Protocol Security Audit Proposal",
      Status: "Discussion",
      Track: "Security",
      created_at: "2023-12-30T13:45:00Z",
      updated_at: "2024-01-05T11:25:00Z"
    }
  ]

  // Format date to a more readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  // Get all unique statuses and tracks for filters
  const statuses = Array.from(new Set(proposals.map(p => p.Status).filter(Boolean))) as string[]
  const tracks = Array.from(new Set(proposals.map(p => p.Track).filter(Boolean))) as string[]

  // Filter proposals based on selected filters
  const filteredProposals = proposals.filter(proposal => {
    if (statusFilter && proposal.Status !== statusFilter) return false
    if (trackFilter && proposal.Track !== trackFilter) return false
    return true
  })

  // Get status color based on status value
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "Voting":
        return "bg-blue-100 text-blue-800"
      case "Completed":
        return "bg-green-100 text-green-800"
      case "In Progress":
        return "bg-yellow-100 text-yellow-800"
      case "Discussion":
        return "bg-purple-100 text-purple-800"
      case "Proposed":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Avalanche Consensus Proposals (ACPs)</h3>
        
        <div className="flex space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center">
                <Filter className="h-4 w-4 mr-1" />
                Status: {statusFilter || 'All'}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                All
              </DropdownMenuItem>
              {statuses.map(status => (
                <DropdownMenuItem key={status} onClick={() => setStatusFilter(status)}>
                  {status}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center">
                <Filter className="h-4 w-4 mr-1" />
                Track: {trackFilter || 'All'}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTrackFilter(null)}>
                All
              </DropdownMenuItem>
              {tracks.map(track => (
                <DropdownMenuItem key={track} onClick={() => setTrackFilter(track)}>
                  {track}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-[150px]">Status</TableHead>
              <TableHead className="w-[120px]">Track</TableHead>
              <TableHead className="w-[120px]">Created On</TableHead>
              <TableHead className="w-[120px]">Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProposals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                  No proposals found matching the current filters
                </TableCell>
              </TableRow>
            ) : (
              filteredProposals.map((proposal) => (
                <TableRow key={proposal.item_id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{proposal.item_id}</TableCell>
                  <TableCell>{proposal.item_title}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(proposal.Status)}`}>
                      {proposal.Status}
                    </span>
                  </TableCell>
                  <TableCell>{proposal.Track}</TableCell>
                  <TableCell>{formatDate(proposal.created_at)}</TableCell>
                  <TableCell>{formatDate(proposal.updated_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 