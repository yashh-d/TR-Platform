interface StaticBentoCardProps {
  title: string;
  value: string;
  subtitle?: string;
  colors?: string[];
}

export function StaticBentoCard({
  title,
  value,
  subtitle,
  colors = ["#3B82F6", "#60A5FA", "#93C5FD"],
}: StaticBentoCardProps) {
  return (
    <div 
      className="rounded-lg p-4 h-full"
      style={{
        background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
      }}
    >
      <h3 className="text-sm font-medium text-white opacity-80">{title}</h3>
      <div className="mt-2">
        <p className="text-2xl font-bold text-white">{value}</p>
        {subtitle && (
          <p className="text-sm text-white text-opacity-80 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  )
} 