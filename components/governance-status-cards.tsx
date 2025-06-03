"use client"

import { Vote } from "lucide-react"
import { BentoCardSimple } from "@/components/ui/bento-card-simple"
import { useProposalCounts } from "@/lib/hooks/use-proposal-counts"

// Pass the colors as a prop instead of importing from a non-existent module
interface GovernanceStatusCardsProps {
  colors: string[];
}

export function GovernanceStatusCards({ colors }: GovernanceStatusCardsProps) {
  const { activated, proposed, implementable, loading, error } = useProposalCounts()
  
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-6 bg-gray-300 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="mb-8 p-4 bg-red-50 text-red-700 rounded-lg">
        <p>Error loading proposal counts: {error}</p>
      </div>
    )
  }
  
  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      <div>
        <BentoCardSimple
          title="Activated Proposals"
          value={activated.toString()}
          colors={colors}
          icon={<Vote className="h-4 w-4" />}
        />
      </div>
      <div>
        <BentoCardSimple
          title="Proposed Proposals"
          value={proposed.toString()}
          colors={colors}
          icon={<Vote className="h-4 w-4" />}
        />
      </div>
      <div>
        <BentoCardSimple
          title="Implementable Proposals"
          value={implementable.toString()}
          colors={colors}
          icon={<Vote className="h-4 w-4" />}
        />
      </div>
    </div>
  )
} 