import Image from "next/image"
import { Coins } from "lucide-react"

interface StablecoinIconProps {
  size?: number;
  className?: string;
}

export const USDCIcon = ({ size = 16, className = "h-4 w-4" }: StablecoinIconProps) => (
  <Image 
    src="/usd-coin-usdc-logo.svg" 
    alt="USDC" 
    width={size} 
    height={size} 
    className={className}
  />
)

export const USDTIcon = ({ size = 16, className = "h-4 w-4" }: StablecoinIconProps) => (
  <Image 
    src="/tether-usdt-logo.svg" 
    alt="USDT" 
    width={size} 
    height={size} 
    className={className}
  />
)

export const StablecoinIcon = ({ size = 16, className = "h-4 w-4" }: StablecoinIconProps) => (
  <Coins className={className} />
)

// Helper function to get the right icon for a stablecoin
export const getStablecoinIcon = (symbol: string, props?: StablecoinIconProps) => {
  switch (symbol.toUpperCase()) {
    case 'USDC':
      return <USDCIcon {...props} />
    case 'USDT':
      return <USDTIcon {...props} />
    default:
      return <StablecoinIcon {...props} />
  }
} 