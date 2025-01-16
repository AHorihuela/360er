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
          outerRadius="60%"
          data={chartData}
          startAngle={90}
          endAngle={-270}
        >
          <PolarGrid 
            stroke="#e5e7eb" 
            strokeOpacity={0.2}
            gridType="polygon"
          />
          {[0, 1, 2, 3, 4, 5].map((value) => (
            <PolarGrid
              key={value}
              stroke="#e5e7eb"
              strokeOpacity={0.1}
              gridType="circle"
              radius={(value / 5) * 100}
              fill={value % 2 ? "#f8fafc" : "#ffffff"}
              fillOpacity={0.3}
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
                  className="font-medium"
                >
                  {payload.value}
                </text>
              </g>
            )}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 5]}
            axisLine={false}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickCount={6}
            stroke="#e5e7eb"
            strokeOpacity={0.2}
          />
          <Radar
            name="Team Score"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="#3b82f6"
            fillOpacity={0.15}
            dot={{
              fill: '#3b82f6',
              strokeWidth: 0,
              r: 3
            }}
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
} 