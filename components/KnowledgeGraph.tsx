
import React from 'react';
import { KnowledgeGraph as KGType } from '../types';
import Card from './Card';

interface KnowledgeGraphProps {
  knowledgeGraph: KGType;
  stats: { nodes: number; edges: number };
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ knowledgeGraph, stats }) => {
  const width = 350;
  const height = 350;
  const positions: { [key: string]: { x: number; y: number } } = {};
  
  // Simple circular layout calculation
  knowledgeGraph.nodes.forEach((node, i) => {
    const angle = (i / knowledgeGraph.nodes.length) * 2 * Math.PI;
    positions[node.id] = {
      x: width / 2 + (width / 2 - 40) * Math.cos(angle),
      y: height / 2 + (height / 2 - 40) * Math.sin(angle),
    };
  });

  const nodeColor = (type: string) => {
    switch (type) {
      case 'concept': return '#2dd4bf'; // teal-400
      case 'directive': return '#fbbf24'; // amber-400
      case 'goal': return '#60a5fa'; // blue-400
      default: return '#9ca3af'; // gray-400
    }
  }

  return (
    <Card title="Knowledge Graph" icon={<GraphIcon />}>
      <div className="flex justify-between items-center mb-4 text-sm bg-gray-700/50 p-2 rounded-md">
        <span>Nodes: <span className="font-bold text-cyan-400">{stats.nodes}</span></span>
        <span>Edges: <span className="font-bold text-cyan-400">{stats.edges}</span></span>
      </div>
      <div className="flex justify-center items-center bg-gray-900/50 rounded-lg p-2">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {knowledgeGraph.edges.map((edge, i) => {
            const sourcePos = positions[edge.source];
            const targetPos = positions[edge.target];
            if (!sourcePos || !targetPos) return null;
            return (
              <g key={i}>
                <line
                  x1={sourcePos.x}
                  y1={sourcePos.y}
                  x2={targetPos.x}
                  y2={targetPos.y}
                  stroke="#4a5568"
                  strokeWidth="1"
                />
                <text
                  x={(sourcePos.x + targetPos.x) / 2}
                  y={(sourcePos.y + targetPos.y) / 2}
                  fill="#a0aec0"
                  fontSize="8"
                  textAnchor="middle"
                  dy="-3"
                >
                  {edge.label}
                </text>
              </g>
            );
          })}
          {knowledgeGraph.nodes.map(node => {
            const pos = positions[node.id];
            if (!pos) return null;
            return (
              <g key={node.id}>
                <circle cx={pos.x} cy={pos.y} r="8" fill={nodeColor(node.type)} />
                <text
                  x={pos.x}
                  y={pos.y + 20}
                  fill="#e2e8f0"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </Card>
  );
};

const GraphIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
)

export default KnowledgeGraph;
