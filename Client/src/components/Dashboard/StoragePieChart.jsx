import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#a83279", "#32a852"];

const StoragePieChart = ({ data }) => {
  if (!data || data.length === 0) return <p>No data available</p>;

  const formattedData = data.map((col) => ({
    name: col.name,
    value: (col.storageSize / 1024).toFixed(2), // KB
  }));

  return (
    <div className="bg-white shadow rounded-lg p-4 w-full">
      <h2 className="text-lg font-semibold mb-2">Storage Distribution</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={formattedData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label
          >
            {formattedData.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StoragePieChart;
