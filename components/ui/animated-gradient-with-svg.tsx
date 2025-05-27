"use client"

import { useRef, useState, useEffect } from "react"
import { cn } from "@/lib/utils"

type BlurStrength = "none" | "light" | "medium" | "heavy"

interface AnimatedGradientProps {
  children?: React.ReactNode
  colors: string[]
  speed?: number
  blur?: BlurStrength
}

export function AnimatedGradient({ 
  children,
  colors,
  speed = 0.05,
  blur = "none"
}: AnimatedGradientProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isClient, setIsClient] = useState(false)
  
  // This will run only on the client side after hydration
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Set blur strength
  let blurClass = ""
  switch (blur) {
    case "light":
      blurClass = "backdrop-blur-sm"
      break
    case "medium":
      blurClass = "backdrop-blur-md"
      break
    case "heavy":
      blurClass = "backdrop-blur-lg"
      break
  }

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-lg w-full h-full">
      <div className={cn(`absolute inset-0`, blurClass)}>
        {isClient && colors.map((color, index) => {
          // Only generate random values on the client
          const top = `${Math.random() * 50}%`
          const left = `${Math.random() * 50}%`
          const tx1 = (Math.random() * 2 - 1).toString()
          const ty1 = (Math.random() * 2 - 1).toString()
          const tx2 = (Math.random() * 2 - 1).toString()
          const ty2 = (Math.random() * 2 - 1).toString()
          const tx3 = (Math.random() * 2 - 1).toString()
          const ty3 = (Math.random() * 2 - 1).toString()
          const tx4 = (Math.random() * 2 - 1).toString()
          const ty4 = (Math.random() * 2 - 1).toString()
          
          return (
            <svg
              key={index}
              className="absolute animate-background-gradient"
              style={{
                top,
                left,
                "--background-gradient-speed": `${speed * 400}s`,
                "--tx-1": tx1,
                "--ty-1": ty1,
                "--tx-2": tx2, 
                "--ty-2": ty2,
                "--tx-3": tx3,
                "--ty-3": ty3,
                "--tx-4": tx4,
                "--ty-4": ty4,
              } as React.CSSProperties}
              width={0}
              height={0}
              viewBox="0 0 100 100"
            >
              <defs>
                <radialGradient
                  id={`gradient-${index}`}
                  cx="50%"
                  cy="50%"
                  r="50%"
                  fx="50%"
                  fy="50%"
                >
                  <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="50" cy="50" r="50" fill={`url(#gradient-${index})`} />
            </svg>
          )
        })}
      </div>
      {children}
    </div>
  )
}
