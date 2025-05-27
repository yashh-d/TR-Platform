"use client"

import { useEffect, useRef } from "react"

export function LineChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = canvas.offsetWidth
    canvas.height = 300

    // Draw chart background grid
    const drawGrid = () => {
      ctx.strokeStyle = "#e5e7eb"
      ctx.lineWidth = 1

      // Horizontal grid lines
      const yStep = canvas.height / 6
      for (let i = 1; i < 6; i++) {
        const y = i * yStep
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      // Vertical grid lines
      const xStep = canvas.width / 12
      for (let i = 0; i <= 12; i++) {
        const x = i * xStep
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
    }

    // Draw chart data
    const drawData = () => {
      // Sample data for multiple lines
      const datasets = [
        { color: "#3b82f6", data: generateRandomData(12, 0.7, 0.9) }, // Blue
        { color: "#10b981", data: generateRandomData(12, 0.5, 0.7) }, // Green
        { color: "#f59e0b", data: generateRandomData(12, 0.3, 0.5) }, // Yellow
        { color: "#ef4444", data: generateRandomData(12, 0.1, 0.3) }, // Red
      ]

      const xStep = canvas.width / 12

      // Draw each dataset
      datasets.forEach((dataset) => {
        ctx.strokeStyle = dataset.color
        ctx.lineWidth = 2
        ctx.beginPath()

        dataset.data.forEach((value, index) => {
          const x = index * xStep
          const y = canvas.height - value * canvas.height

          if (index === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })

        ctx.stroke()
      })
    }

    // Generate random data points
    function generateRandomData(count: number, min: number, max: number) {
      return Array.from({ length: count }, () => min + Math.random() * (max - min))
    }

    // Draw chart
    drawGrid()
    drawData()

    // Handle resize
    const handleResize = () => {
      if (canvas) {
        canvas.width = canvas.offsetWidth
        canvas.height = 300
        drawGrid()
        drawData()
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div className="w-full h-[300px]">
      <canvas ref={canvasRef} className="w-full h-full"></canvas>
    </div>
  )
}
