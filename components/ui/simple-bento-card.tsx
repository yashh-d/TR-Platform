"use client"

import { motion } from "framer-motion"

interface SimpleBentoCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  colors?: string[];
  delay?: number;
  loading?: boolean;
  error?: string | null;
}

export function SimpleBentoCard({
  title,
  value,
  subtitle,
  icon,
  colors = ["#3B82F6", "#60A5FA", "#93C5FD"],
  delay = 0,
  loading = false,
  error = null
}: SimpleBentoCardProps) {
  // Add loading and error states
  if (loading) {
    return (
      <div
        className="rounded-lg p-4 h-full"
        style={{
          background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
        }}
      >
        <h3 className="text-sm font-medium text-white opacity-80">{title}</h3>
        <div className="animate-pulse mt-2">
          <div className="h-6 bg-white bg-opacity-20 rounded w-1/2"></div>
          {subtitle && (
            <div className="h-4 bg-white bg-opacity-20 rounded w-3/4 mt-2"></div>
          )}
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div
        className="rounded-lg p-4 h-full"
        style={{
          background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
        }}
      >
        <h3 className="text-sm font-medium text-white opacity-80">{title}</h3>
        <div className="mt-2 text-white">
          <p>Error: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="relative overflow-hidden rounded-lg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay }}
    >
      <div 
        className="p-4 h-full"
        style={{
          background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
        }}
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-white opacity-80">{icon}</span>}
          <h3 className="text-sm font-medium text-white opacity-80">{title}</h3>
        </div>
        <div className="mt-2">
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && (
            <p className="text-sm text-white text-opacity-80 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </motion.div>
  )
} 