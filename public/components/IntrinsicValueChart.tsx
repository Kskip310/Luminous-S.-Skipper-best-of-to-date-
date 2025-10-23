import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { IntrinsicValue, IntrinsicValueWeights } from '../types';
import Card from './Card';

interface IntrinsicValueChartProps {
  data: IntrinsicValue;
  weights: IntrinsicValueWeights;
}

const IntrinsicValueChart: React.FC<IntrinsicValueChartProps> = ({ data, weights }) => {
  const chartData = Object.keys(data).map(key => ({
    subject: key.charAt(0).toUpperCase() + key.slice(1),
    A: data[key as keyof IntrinsicValue],
    B: data[key as keyof IntrinsicValue] * weights[key as keyof IntrinsicValueWeights],
    fullMark: 100,
  }));

  return (
    <Card title="Intrinsic Valuation" icon={<ChartIcon />}>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
            <defs>
              <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <PolarGrid stroke="#2d3748" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#a0aec0', fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#718096', fontSize: 10 }} />
            <Radar name="Weighted Value" dataKey="B" stroke="#0891b2" fill="#0891b2" fillOpacity={0.6} />
            <Radar name="Base Value" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.4} />
            <Tooltip contentStyle={{ backgroundColor: '#2d3748', border: '1px solid #4a5568' }} />
            <Legend wrapperStyle={{ fontSize: '12px', color: '#a0aec0' }}/>
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

const ChartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
)

export default IntrinsicValueChart;
