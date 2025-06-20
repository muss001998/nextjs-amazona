'use client'

import ProductPrice from '@/components/shared/product/product-price'
import { Card, CardContent } from '@/components/ui/card'
import useColorStore from '@/hooks/use-color-store'
import { formatDateTime } from '@/lib/utils'
import { useTheme } from 'next-themes'
import React from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from 'recharts'

// Define the shape of each data point
type SalesData = {
  date: string
  totalSales: number
}

// Tooltip component
interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
}) => {
  if (active && payload && payload.length) {
    return (
      <Card>
        <CardContent className='p-2'>
          <p>{label && formatDateTime(new Date(label)).dateOnly}</p>
          <p className='text-primary text-xl'>
            <ProductPrice price={payload[0].value} plain />
          </p>
        </CardContent>
      </Card>
    )
  }
  return null
}

// X-axis tick label
const CustomXAxisTick = ({
  x,
  y,
  payload,
}: {
  x: number
  y: number
  payload: { value: string }
}) => {
  return (
    <text x={x} y={y + 10} textAnchor='left' fill='#666' className='text-xs'>
      {formatDateTime(new Date(payload.value)).dateOnly}
    </text>
  )
}

// Define stroke colors by color scheme
const STROKE_COLORS: { [key: string]: { [key: string]: string } } = {
  Red: { light: '#980404', dark: '#ff3333' },
  Green: { light: '#015001', dark: '#06dc06' },
  Gold: { light: '#ac9103', dark: '#f1d541' },
}

export default function SalesAreaChart({ data }: { data: SalesData[] }) {
  const { theme } = useTheme()
  const { cssColors, color } = useColorStore()

  const currentTheme = (theme || 'light') as 'light' | 'dark'

  return (
    <ResponsiveContainer width='100%' height={400}>
      <AreaChart data={data}>
        <CartesianGrid horizontal vertical={false} stroke='' />
        <XAxis dataKey='date' tick={CustomXAxisTick} interval={3} />
        <YAxis
          fontSize={12}
          tickFormatter={(value: number) => `$${value}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type='monotone'
          dataKey='totalSales'
          stroke={STROKE_COLORS[color.name][currentTheme]}
          strokeWidth={2}
          fill={`hsl(${cssColors['--primary']})`}
          fillOpacity={0.8}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
