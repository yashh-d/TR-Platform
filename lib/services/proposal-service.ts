import { supabase } from "@/lib/supabase"

export interface AvalancheProposal {
  project_id: string;
  project_number: number;
  project_title: string;
  item_id: string;
  item_type: string;
  item_number: string | null;
  item_title: string;
  item_url: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  "Parent issue": string | null;
  "Status": string | null;
  "Sub-issues progress": string | null;
  "Track": string | null;
}

export async function getProposals(
  limit = 10,
  showArchived = false,
  filterByStatus?: string
): Promise<{ data: AvalancheProposal[] | null; error: Error | null }> {
  try {
    console.log(`ProposalService: Fetching proposals (limit=${limit}, archived=${showArchived}, status=${filterByStatus || 'any'})`)
    
    let query = supabase
      .from('avalanche_acp')
      .select('*')
    
    if (!showArchived) {
      query = query.eq('is_archived', false)
    }
    
    if (filterByStatus) {
      query = query.eq('Status', filterByStatus)
    }
    
    if (limit > 0) {
      query = query.limit(limit)
    }
    
    query = query.order('created_at', { ascending: false })
    
    const { data, error } = await query
    
    if (error) {
      console.error('ProposalService: Supabase error', error)
      return { data: null, error: new Error(error.message) }
    }
    
    console.log(`ProposalService: Retrieved ${data?.length || 0} proposals`)
    return { data, error: null }
  } catch (err: any) {
    console.error('ProposalService: Unexpected error', err)
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) }
  }
} 