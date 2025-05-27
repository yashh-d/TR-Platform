"use client"

interface BentoCardSimpleProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  colors?: string[];
  delay?: number;
  loading?: boolean;
  error?: string | null;
}

export function BentoCardSimple({
  title,
  value,
  subtitle,
  icon,
  colors = ["#3B82F6", "#60A5FA", "#93C5FD"],
  delay = 0,
  loading = false,
  error = null
}: BentoCardSimpleProps) {
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
    <div
      className="rounded-lg p-4 h-full relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${colors[0]} 20%, rgba(255, 255, 255, 0.7) 100%)`,
      }}
    >
      <div className="relative z-10">
        <div className="flex items-center mb-1">
          {icon && <span className="mr-2 text-white">{icon}</span>}
          <h3 className="text-sm font-medium text-white">{title}</h3>
        </div>
        <p className="text-2xl font-bold text-white">{value}</p>
        {subtitle && (
          <p className="text-xs text-white opacity-90 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  )
} 