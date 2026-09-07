import React from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp } from "lucide-react";

const EfficiencyScatter = ({ data }) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-500 text-xs">
        <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
        <p>No efficiency data available</p>
      </div>
    );
  }

  // Take top collections to keep chart clean and avoid clutter
  const formattedData = [...data]
    .sort((a, b) => (b?.count || 0) - (a?.count || 0))
    .slice(0, 8)
    .map((col, index) => ({
      x: col?.count || 0, // documents
      y: parseFloat((((col?.storageSize || 0)) / 1024).toFixed(1)), // KB
      name: col?.name || 'Unknown',
      z: col?.nindexes || 1, // Size of bubble based on index count
      fill: `hsl(${210 + (index * 25)}, 80%, 60%)`,
    }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 shadow-xl text-xs max-w-xs">
          <p className="text-white font-semibold mb-1">{point.name}</p>
          <div className="space-y-0.5 text-slate-300">
            <p className="text-blue-400">Records: {point.x.toLocaleString()}</p>
            <p className="text-emerald-400">Storage: {point.y} KB</p>
            <p className="text-indigo-400">Indexes: {point.z}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="pb-3 mb-4 border-b border-slate-800">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          <span>Storage Efficiency Correlation</span>
        </h2>
        <p className="text-slate-400 text-xs mt-0.5">Documents vs Storage usage correlation</p>
      </div>
      <div>
        <ResponsiveContainer width="100%" height={260}>
          <ScatterChart margin={{ top: 10, right: 15, left: -15, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis 
              type="number" 
              dataKey="x" 
              name="Documents"
              stroke="#64748b"
              fontSize={11}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name="Storage (KB)"
              stroke="#64748b"
              fontSize={11}
              tickFormatter={(value) => `${value}KB`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Scatter 
              name="Collections" 
              data={formattedData} 
            >
              {formattedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.fill}
                  stroke="#0f172a"
                  strokeWidth={2}
                  r={Math.max(5, Math.min(14, entry.z * 2))}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EfficiencyScatter;