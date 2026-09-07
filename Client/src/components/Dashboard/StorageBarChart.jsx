import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Database } from "lucide-react";

const StorageBarChart = ({ data }) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-500 text-xs">
        <Database className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
        <p>No storage data available</p>
      </div>
    );
  }

  // Filter out 0-byte items or sort top items to display
  const formattedData = [...data]
    .filter((col) => (col && ((col.count > 0) || (col.storageSize > 0))))
    .sort((a, b) => (b?.storageSize || 0) - (a?.storageSize || 0))
    .slice(0, 7)
    .map((col) => ({
      name: col?.name || 'Unknown',
      count: col?.count || 0,
      storageKB: parseFloat((((col?.storageSize || 0)) / 1024).toFixed(1)),
      realBytes: col?.storageSize || 0
    }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload || {};
      return (
        <div className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 shadow-2xl text-xs">
          <p className="text-white font-bold mb-1">{`Module: ${label}`}</p>
          <p className="text-blue-400 font-semibold">
            {`Records: ${item.count || 0}`}
          </p>
          <p className="text-emerald-400 text-[11px]">
            {`Storage: ${item.storageKB} KB`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="pb-3 mb-4 border-b border-slate-800">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-400" />
          <span>Storage per Collection (Top Categories)</span>
        </h2>
        <p className="text-slate-400 text-xs mt-0.5">Top collection sizes in KB</p>
      </div>
      <div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={formattedData} margin={{ top: 10, right: 15, left: -15, bottom: 25 }}>
            <defs>
              <linearGradient id="storageBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis 
              dataKey="name" 
              stroke="#64748b"
              fontSize={11}
              angle={-25}
              textAnchor="end"
              interval={0}
            />
            <YAxis 
              stroke="#64748b"
              fontSize={11}
              tickFormatter={(value) => `${value}KB`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="storageKB" 
              fill="url(#storageBarGradient)"
              radius={[4, 4, 0, 0]}
              minPointSize={10}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StorageBarChart;