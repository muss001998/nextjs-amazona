'use client'

import useColorStore from '@/hooks/use-color-store'
import React from 'react'
import {
  PieChart,
  Pie,
  ResponsiveContainer,
  Cell,
  PieLabelRenderProps,
} from 'recharts'

type SalesCategoryData = {
  _id: string
  totalSales: number
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7f50', '#a4de6c', '#d0ed57']

export default function SalesCategoryPieChart({ data }: { data: SalesCategoryData[] }) {
  const { cssColors } = useColorStore()

  const RADIAN = Math.PI / 180

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    index,
  }: PieLabelRenderProps & { index: number }) => {
    if (
      cx == null ||
      cy == null ||
      innerRadius == null ||
      outerRadius == null ||
      midAngle == null
    ) {
      return null
    }

    const radius =
      Number(innerRadius) + (Number(outerRadius) - Number(innerRadius)) * 0.5
    const x = Number(cx) + radius * Math.cos(-Number(midAngle) * RADIAN)
    const y = Number(cy) + radius * Math.sin(-Number(midAngle) * RADIAN)

    return (
      <text
        x={x}
        y={y}
        textAnchor={x > Number(cx) ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs fill-current"
      >
        {`${data[index]._id}: ${new Intl.NumberFormat().format(data[index].totalSales)} sales`}
      </text>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={data}
          dataKey="totalSales"
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          isAnimationActive={true}
        >
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length] || `hsl(${cssColors['--primary']})`}
            />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}
