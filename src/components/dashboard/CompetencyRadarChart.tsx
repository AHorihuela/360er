import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer 
} from 'recharts';
import { ChartDataPoint } from './types';

interface CompetencyRadarChartProps {
  chartData: ChartDataPoint[];
}

export function CompetencyRadarChart({ chartData }: CompetencyRadarChartProps) {
  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart 
          cx="50%" 
          cy="50%" 
          outerRadius="65%" 
          data={chartData}
          startAngle={90}
          endAngle={-270}
        >
          <PolarGrid 
            stroke="#e5e7eb" 
            strokeOpacity={0.3}
            gridType="polygon"
          />
          {[1, 2, 3, 4, 5].map((value) => (
            <PolarGrid
              key={value}
              stroke="none"
              gridType="circle"
              radius={value * 20}
              fill={value % 2 ? "#f8fafc" : "#ffffff"}
              fillOpacity={0.5}
            />
          ))}
          <PolarAngleAxis
            dataKey="subject"
            tick={({ x, y, payload }) => (
              <g transform={`translate(${x},${y})`}>
                <text
                  x={0}
                  y={0}
                  dy={-4}
                  textAnchor="middle"
                  fill="#6b7280"
                  fontSize={11}
                >
                  {payload.value}
                </text>
              </g>
            )}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 5]}
            axisLine={false}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            stroke="#e5e7eb"
            strokeOpacity={0.3}
          />
          <Radar
            name="Team Score"
            dataKey="value"
            stroke="#2563eb"
            fill="#3b82f6"
            fillOpacity={0.7}
            dot
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
} 