import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { BarChart3 } from "lucide-react";

const DocumentsVsIndexesChart = ({ data }) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-500 text-xs">
        <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
        <p>No comparison data available</p>
      </div>
    );
  }

  // Filter top collections to keep X-axis clean
  const formattedData = [...data]
    .sort((a, b) => (b?.count || 0) - (a?.count || 0))
    .slice(0, 6)
    .map((col) => ({
      name: col?.name || 'Unknown',
      documents: col?.count || 0,
      indexes: col?.nindexes || 0,
    }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 shadow-xl text-xs">
          <p className="text-white font-semibold mb-1">{`Collection: ${label}`}</p>
          <div className="space-y-0.5">
            {payload.map((entry, index) => (
              <p key={index} style={{ color: entry.color }} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                {`${entry.dataKey}: ${entry.value.toLocaleString()}`}
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = (props) => {
    const { payload } = props;
    return (
      <div className="flex justify-center space-x-4 mt-2">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center space-x-1.5">
            <div 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ backgroundColor: entry.color }}
            ></div>
            <span className="text-slate-300 text-xs">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="pb-3 mb-4 border-b border-slate-800">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          <span>Documents vs Indexes</span>
        </h2>
        <p className="text-slate-400 text-xs mt-0.5">Performance optimization insights</p>
      </div>
      <div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={formattedData} margin={{ top: 10, right: 15, left: -15, bottom: 25 }}>
            <defs>
              <linearGradient id="documentsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.5} />
              </linearGradient>
              <linearGradient id="indexesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.5} />
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
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            <Bar 
              dataKey="documents" 
              fill="url(#documentsGradient)"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="indexes" 
              fill="url(#indexesGradient)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DocumentsVsIndexesChart;