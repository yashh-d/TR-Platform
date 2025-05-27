import { render, screen, waitFor } from '@testing-library/react'
import { AvalancheProposals } from './avalanche-proposals'
import { supabase } from '@/lib/supabase'
import { vi } from 'vitest'

// Mock the Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  }
}))

describe('AvalancheProposals component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    // Mock the Supabase response to never resolve
    vi.spyOn(supabase, 'from').mockImplementation(() => ({
      select: () => new Promise(() => {}),
      eq: () => new Promise(() => {}),
      order: () => new Promise(() => {}),
      limit: () => new Promise(() => {}),
    }))

    render(<AvalancheProposals />)
    
    expect(screen.getByTestId('loading-proposals')).toBeInTheDocument()
  })

  it('renders proposals when data is loaded', async () => {
    // Mock successful Supabase response
    const mockProposals = [
      {
        project_id: 'project1',
        project_number: 1,
        project_title: 'Test Project',
        item_id: 'item1',
        item_type: 'proposal',
        item_number: '1',
        item_title: 'Test Proposal',
        item_url: 'https://example.com',
        is_archived: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        'Parent issue': null,
        'Status': 'Open',
        'Sub-issues progress': null,
        'Track': 'Governance'
      }
    ]

    vi.spyOn(supabase, 'from').mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: mockProposals, error: null })
          })
        })
      })
    }))

    render(<AvalancheProposals />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Proposal')).toBeInTheDocument()
      expect(screen.getByText('Governance')).toBeInTheDocument()
      expect(screen.getByText('Open')).toBeInTheDocument()
    })
  })

  it('renders error state when there is an error', async () => {
    // Mock Supabase error response
    vi.spyOn(supabase, 'from').mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: null, error: { message: 'Error loading data' } })
          })
        })
      })
    }))

    render(<AvalancheProposals />)
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load proposals. Please try again later.')).toBeInTheDocument()
    })
  })

  it('renders empty state when no proposals are found', async () => {
    // Mock empty Supabase response
    vi.spyOn(supabase, 'from').mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null })
          })
        })
      })
    }))

    render(<AvalancheProposals />)
    
    await waitFor(() => {
      expect(screen.getByText('No proposals found')).toBeInTheDocument()
    })
  })
}) 