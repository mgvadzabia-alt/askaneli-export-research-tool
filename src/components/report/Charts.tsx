"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { PieLabelRenderProps } from "recharts/types/polar/Pie";
import type {
  ChannelMixPoint,
  CompetitorPricePoint,
  MarketSizeTrendPoint,
} from "@/lib/research/reportSchema";

const PIE_COLORS = ["#0f172a", "#2563eb", "#0891b2", "#ca8a04", "#dc2626", "#7c3aed"];

export function MarketSizeTrendChart({ data }: { data: MarketSizeTrendPoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-neutral-500">No market size trend data available.</p>;
  }
  const unit = data[0]?.unit ?? "";
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} label={{ value: unit, angle: -90, position: "insideLeft", fontSize: 12 }} />
          <Tooltip formatter={(value: ValueType | undefined) => [`${value} ${unit}`, "Market size"]} />
          <Line type="monotone" dataKey="value" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CompetitorPriceChart({ data }: { data: CompetitorPricePoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-neutral-500">No competitor price data available.</p>;
  }
  const currency = data[0]?.currency ?? "";
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="competitor" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 12 }} label={{ value: currency, angle: -90, position: "insideLeft", fontSize: 12 }} />
          <Tooltip formatter={(value: ValueType | undefined) => [`${value} ${currency}`, "Price"]} />
          <Bar dataKey="price" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChannelMixChart({ data }: { data: ChannelMixPoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-neutral-500">No channel mix data available.</p>;
  }
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="sharePercent"
            nameKey="channel"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={(props: PieLabelRenderProps) => `${props.name}: ${props.value}%`}
          >
            {data.map((entry, index) => (
              <Cell key={entry.channel} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: ValueType | undefined) => [`${value}%`, "Share"]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
