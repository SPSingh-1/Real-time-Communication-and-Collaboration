import React from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp } from "lucide-react";

const EfficiencyScatter = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 flex items-center justify-center">
        <div className="text-center text-white/60">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No efficiency data available</p>
        </div>
      </div>
    );
  }

  const formattedData = data.map((col, index) => ({
    x: col.count, // documents
    y: parseFloat((col.storageSize / 1024).toFixed(2)), // KB
    name: col.name,
    z: col.nindexes || 1, // Size of bubble based on index count
    fill: `hsl(${(index * 137.508) % 360}, 70%, 60%)`, // Dynamic colors
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900/90 backdrop-blur-sm border border-white/20 rounded-xl p-4 shadow-xl max-w-xs">
          <p className="text-white font-medium mb-2">{data.name}</p>
          <div className="space-y-1 text-sm">
            <p className="text-blue-400">Documents: {data.x.toLocaleString()}</p>
            <p className="text-green-400">Storage: {data.y} KB ({(data.y / 1024).toFixed(2)} MB)</p>
            <p className="text-purple-400">Indexes: {data.z}</p>
            <p className="text-yellow-400">
              Efficiency: {data.x > 0 ? (data.y / data.x).toFixed(2) : 0} KB/doc
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden hover:bg-white/15 transition-all duration-300">
      <div className="p-6 border-b border-white/10">
        <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <TrendingUp className="w-5 h-5 text-orange-400" />
          </div>
          <span>Storage Efficiency</span>
        </h2>
        <p className="text-white/60 text-sm mt-1">Documents vs Storage usage correlation</p>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis 
              type="number" 
              dataKey="x" 
              name="Documents"
              stroke="rgba(255, 255, 255, 0.7)"
              fontSize={12}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name="Storage (KB)"
              stroke="rgba(255, 255, 255, 0.7)"
              fontSize={12}
              tickFormatter={(value) => `${value} KB`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Scatter 
              name="Collections" 
              data={formattedData} 
              filter="url(#glow)"
            >
              {formattedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.fill}
                  stroke={entry.fill}
                  strokeWidth={2}
                  r={Math.max(6, Math.min(20, entry.z * 2))} // Dynamic size based on indexes
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="mt-2 text-center">
          <p className="text-white/50 text-xs">
            Bubble size represents number of indexes • Hover for details
          </p>
        </div>
      </div>
    </div>
  );
};

export default EfficiencyScatter;