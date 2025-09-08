import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { BarChart3 } from "lucide-react";

const DocumentsVsIndexesChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 flex items-center justify-center">
        <div className="text-center text-white/60">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No comparison data available</p>
        </div>
      </div>
    );
  }

  const formattedData = data.map((col) => ({
    name: col.name,
    documents: col.count,
    indexes: col.nindexes,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/90 backdrop-blur-sm border border-white/20 rounded-xl p-4 shadow-xl">
          <p className="text-white font-medium mb-2">{`Collection: ${label}`}</p>
          <div className="space-y-1">
            {payload.map((entry, index) => (
              <p key={index} style={{ color: entry.color }} className="flex items-center">
                <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
                {`${entry.dataKey}: ${entry.value.toLocaleString()}`}
              </p>
            ))}
          </div>
          {payload.length === 2 && (
            <div className="mt-2 pt-2 border-t border-white/20">
              <p className="text-white/70 text-sm">
                Index Ratio: {payload[0].value > 0 ? (payload[1].value / payload[0].value).toFixed(2) : 0}
              </p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomLegend = (props) => {
    const { payload } = props;
    return (
      <div className="flex justify-center space-x-6 mt-4">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            ></div>
            <span className="text-white text-sm font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden hover:bg-white/15 transition-all duration-300">
      <div className="p-6 border-b border-white/10">
        <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <BarChart3 className="w-5 h-5 text-green-400" />
          </div>
          <span>Documents vs Indexes</span>
        </h2>
        <p className="text-white/60 text-sm mt-1">Performance optimization insights</p>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="documentsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#059669" stopOpacity={1} />
              </linearGradient>
              <linearGradient id="indexesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#7C3AED" stopOpacity={1} />
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
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            <Bar 
              dataKey="documents" 
              fill="url(#documentsGradient)"
              radius={[4, 4, 0, 0]}
              stroke="rgba(16, 185, 129, 0.5)"
              strokeWidth={1}
            />
            <Bar 
              dataKey="indexes" 
              fill="url(#indexesGradient)"
              radius={[4, 4, 0, 0]}
              stroke="rgba(139, 92, 246, 0.5)"
              strokeWidth={1}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 text-center">
          <p className="text-white/50 text-xs">
            Higher index-to-document ratios indicate better query performance
          </p>
        </div>
      </div>
    </div>
  );
};

export default DocumentsVsIndexesChart;