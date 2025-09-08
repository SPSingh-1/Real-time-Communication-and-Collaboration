import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Database } from "lucide-react";

const StorageBarChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 flex items-center justify-center">
        <div className="text-center text-white/60">
          <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No storage data available</p>
        </div>
      </div>
    );
  }

  const formattedData = data.map((col) => ({
    name: col.name,
    storageKB: parseFloat((col.storageSize / 1024).toFixed(2)),
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/90 backdrop-blur-sm border border-white/20 rounded-xl p-3 shadow-xl">
          <p className="text-white font-medium">{`Collection: ${label}`}</p>
          <p className="text-blue-400">
            {`Storage: ${payload[0].value} KB`}
          </p>
          <p className="text-blue-300 text-sm">
            {`${(payload[0].value / 1024).toFixed(2)} MB`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden hover:bg-white/15 transition-all duration-300">
      <div className="p-6 border-b border-white/10">
        <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Database className="w-5 h-5 text-blue-400" />
          </div>
          <span>Storage per Collection</span>
        </h2>
        <p className="text-white/60 text-sm mt-1">Storage usage breakdown by collection</p>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="storageGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#1D4ED8" stopOpacity={1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis 
              dataKey="name" 
              stroke="rgba(255, 255, 255, 0.7)"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="rgba(255, 255, 255, 0.7)"
              fontSize={12}
              tickFormatter={(value) => `${value} KB`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="storageKB" 
              fill="url(#storageGradient)"
              radius={[4, 4, 0, 0]}
              stroke="rgba(59, 130, 246, 0.5)"
              strokeWidth={1}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StorageBarChart;