"use client"

import { AvalancheProposals } from "@/components/avalanche-proposals"

export default function TestProposalsPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Avalanche Proposals - Test Page</h1>
      <div className="border p-6 rounded-lg">
        <AvalancheProposals limit={10} showArchived={false} />
      </div>
    </div>
  )
} 