"use client"

import { useState, useEffect } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface DAppCategoryData {
  category: string;
  count: number;
}

interface DAppsCategoryChartProps {
  network: string;
}

export function DAppsCategoryChart({ network }: DAppsCategoryChartProps) {
  const [categoryData, setCategoryData] = useState<DAppCategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use a diverse color palette instead of network-specific colors
  const getDiverseColors = (): string[] => {
    return [
      "#E84142", // Red (Avalanche)
      "#4F46E5", // Indigo
      "#0EA5E9", // Sky blue
      "#10B981", // Emerald
      "#F59E0B", // Amber
      "#8B5CF6", // Violet
      "#EC4899", // Pink
      "#14B8A6", // Teal
      "#F97316", // Orange
      "#6366F1", // Purple
      "#22D3EE", // Cyan
      "#A3E635", // Lime
      "#FB7185", // Rose
    ]
  }

  useEffect(() => {
    // Only fetch for Avalanche network
    if (network.toLowerCase() !== "avalanche") {
      setLoading(false)
      return
    }

    if (!isSupabaseConfigured()) {
      setError("Supabase not configured properly")
      setLoading(false)
      return
    }

    async function fetchCategoryBreakdown() {
      try {
        setLoading(true)
        
        // Get all dApps with categories
        const { data, error: fetchError } = await supabase
          .from('avalanche_dapps')
          .select('categories')
          .not('categories', 'is', null)
        
        if (fetchError) {
          throw fetchError
        }
        
        // Process categories (assuming categories is a comma-separated string)
        const categoryMap = new Map<string, number>()
        
        data.forEach(item => {
          if (!item.categories) return
          
          // Split categories by comma and trim whitespace
          const categories = item.categories.split(',').map(cat => cat.trim())
          
          categories.forEach(category => {
            if (category) {
              categoryMap.set(category, (categoryMap.get(category) || 0) + 1)
            }
          })
        })
        
        // Convert to array and sort by count
        const categoryArray = Array.from(categoryMap.entries())
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
        
        // Take top categories to avoid cluttering the chart
        const topCategories = categoryArray.slice(0, 10)
        
        // If there are more, add an "Other" category
        if (categoryArray.length > 10) {
          const otherCount = categoryArray.slice(10).reduce((sum, item) => sum + item.count, 0)
          topCategories.push({ category: 'Other', count: otherCount })
        }
        
        setCategoryData(topCategories)
      } catch (err) {
        console.error('Error fetching category breakdown:', err)
        setError('Failed to load category data')
      } finally {
        setLoading(false)
      }
    }

    fetchCategoryBreakdown()
  }, [network])

  // Create Plotly pie chart data
  const createPieChartData = () => {
    const colors = getDiverseColors()
    
    return {
      data: [
        {
          type: 'pie',
          values: categoryData.map(d => d.count),
          labels: categoryData.map(d => d.category),
          textinfo: 'label',
          hoverinfo: 'label+percent',
          hovertemplate: '%{label}: %{percent}<extra></extra>',
          textposition: 'inside',
          automargin: true,
          marker: {
            colors: colors.slice(0, categoryData.length)
          },
          hole: 0.4,
          pull: Array(categoryData.length).fill(0).map((_, i) => i === 0 ? 0.05 : 0)
        }
      ],
      layout: {
        title: 'dApps by Category',
        showlegend: true,
        legend: {
          orientation: 'h',
          y: -0.1,
          itemclick: false,
          itemdoubleclick: false
        },
        margin: {
          l: 20,
          r: 20,
          t: 50,
          b: 20
        },
        autosize: true,
        paper_bgcolor: 'white'
      },
      config: {
        responsive: true,
        displayModeBar: false,
        staticPlot: false,
        scrollZoom: false,
        displaylogo: false,
        modeBarButtonsToRemove: ['toImage', 'pan2d', 'lasso2d', 'select2d', 'zoom2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d']
      }
    }
  }

  if (loading) {
    return (
      <div className="border rounded-lg p-6 h-[300px] flex items-center justify-center">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto"></div>
          <div className="h-32 w-32 bg-gray-200 rounded-full mx-auto"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border rounded-lg p-6 h-[300px] flex items-center justify-center">
        <div className="text-center text-red-500">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (network.toLowerCase() !== "avalanche") {
    return (
      <div className="border rounded-lg p-6 h-[300px] flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p>Category breakdown is only available for Avalanche.</p>
        </div>
      </div>
    )
  }

  if (!categoryData.length) {
    return (
      <div className="border rounded-lg p-6 h-[300px] flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p>No category data available.</p>
        </div>
      </div>
    )
  }

  const chartData = createPieChartData()

  return (
    <div className="border rounded-lg p-6">
      <div className="h-[300px] w-full">
        {typeof window !== 'undefined' && (
          <div
            ref={(el) => {
              if (el && typeof window !== 'undefined') {
                // @ts-ignore
                if (window.Plotly) {
                  // @ts-ignore
                  window.Plotly.newPlot(el, chartData.data, chartData.layout, chartData.config)
                } else {
                  const script = document.createElement('script')
                  script.src = 'https://cdn.plot.ly/plotly-latest.min.js'
                  script.onload = () => {
                    // @ts-ignore
                    window.Plotly.newPlot(el, chartData.data, chartData.layout, chartData.config)
                  }
                  document.head.appendChild(script)
                }
              }
            }}
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </div>
    </div>
  )
} 