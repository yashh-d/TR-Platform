import { StaticBentoCard } from "@/components/ui/static-bento-card"

export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Page</h1>
      <div className="grid grid-cols-2 gap-4">
        <StaticBentoCard
          title="Test Card"
          value="100"
          subtitle="This is a test"
          colors={["#3B82F6", "#60A5FA"]}
        />
      </div>
    </div>
  )
} 