"use client"

import { useState, useEffect } from "react"
import { ChevronRight } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

interface SidebarProps {
  activeNetwork: string;
  onNetworkChange: (network: string) => void;
}

export function Sidebar({ activeNetwork, onNetworkChange }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  
  // Network color schemes updated to match the lighter gradient style
  const getNetworkColors = (network: string) => {
    switch (network) {
      case "bitcoin":
        return "linear-gradient(135deg, #f7931a 20%, rgba(255, 255, 255, 0.7) 100%)"
      case "ethereum":
        return "linear-gradient(135deg, #627eea 20%, rgba(255, 255, 255, 0.7) 100%)"
      case "solana":
        return "linear-gradient(135deg, #14f195 20%, rgba(255, 255, 255, 0.7) 100%)"
      case "avalanche":
        return "linear-gradient(135deg, #e84142 20%, rgba(255, 255, 255, 0.7) 100%)"
      case "polygon":
        return "linear-gradient(135deg, #8247e5 20%, rgba(255, 255, 255, 0.7) 100%)"
      case "core":
        return "linear-gradient(135deg, #FF7700 20%, rgba(255, 255, 255, 0.7) 100%)"
      default:
        return "linear-gradient(135deg, #3B82F6 20%, rgba(255, 255, 255, 0.7) 100%)"
    }
  }

  // Function to get text color based on network
  const getTextColor = () => {
    return "text-white"; // Keep text white for contrast
  }

  const textColorClass = getTextColor();

  return (
    <aside
      className="w-[200px] border-r overflow-y-auto transition-all duration-300"
      style={{ backgroundImage: getNetworkColors(activeNetwork) }}
    >
      <div className={`p-2 text-xs uppercase font-medium ${textColorClass}`}>Latest</div>

      <div className="px-2">
        <div className="flex items-center py-1.5 px-2 rounded-md bg-white bg-opacity-20 text-white">
          <ChevronRight className="h-3 w-3 mr-1" />
          <span className="text-sm">Market Overview</span>
        </div>

        <div className={`flex items-center py-1.5 px-2 rounded-md ${textColorClass}`}>
          <ChevronRight className="h-3 w-3 mr-1 opacity-0" />
          <span className="text-sm">News</span>
        </div>
      </div>

      <div className={`p-2 text-xs uppercase font-medium mt-4 ${textColorClass}`}>Networks</div>

      <div className="px-2">
        {["Bitcoin", "Ethereum", "Solana", "Avalanche", "Polygon", "Core"].map((item) => (
          <div
            key={item}
            className={`flex items-center py-1.5 px-2 rounded-md cursor-pointer ${
              activeNetwork === item.toLowerCase()
                ? "bg-white bg-opacity-20 text-white"
                : `${textColorClass} hover:bg-white hover:bg-opacity-10`
            }`}
            onClick={() => onNetworkChange(item.toLowerCase())}
          >
            <ChevronRight
              className={`h-3 w-3 mr-1 ${activeNetwork === item.toLowerCase() ? "opacity-100" : "opacity-0"}`}
            />
            <span className="text-sm">{item}</span>
          </div>
        ))}
      </div>

      <div className={`p-2 text-xs uppercase font-medium mt-4 ${textColorClass}`}>Tools</div>

      <div className="px-2">
        {["Research Blog", "Media & Citations", "Data & API Platform", "Downloads"].map((item) => (
          <div
            key={item}
            className={`flex items-center py-1.5 px-2 rounded-md ${textColorClass} hover:bg-white hover:bg-opacity-10`}
          >
            <ChevronRight className="h-3 w-3 mr-1 opacity-0" />
            <span className="text-sm">{item}</span>
            {item === "Media & Citations" && (
              <span className="ml-1 text-[10px] bg-white bg-opacity-20 text-white px-1 rounded">NEW</span>
            )}
          </div>
        ))}
      </div>
    </aside>
  )
} 