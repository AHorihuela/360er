import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip,
  Legend,
  Cell,
  CartesianGrid
} from "recharts";
import { cn } from "@/lib/utils";
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ManagerComparisonChartProps {
  managerScores: Array<{
    name: string;
    averageScore: number;
    responsesCount: number;
    questionScores: Record<string, number[]>;
  }>;
  questionIdToTextMap: Record<string, string>;
}

export function ManagerComparisonChart({ managerScores, questionIdToTextMap }: ManagerComparisonChartProps) {
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('overall');

  // Get all available questions from the first manager's questionScores
  const availableQuestions = useMemo(() => {
    const questions: Array<{ id: string, text: string }> = [
      { id: 'overall', text: 'Overall Average' }
    ];
    
    if (managerScores.length === 0) return questions;
    
    // Get all questions from the first manager's data
    const firstManager = managerScores[0];
    Object.keys(firstManager.questionScores).forEach(questionId => {
      if (questionIdToTextMap[questionId]) {
        questions.push({
          id: questionId,
          text: questionIdToTextMap[questionId]
        });
      }
    });
    
    return questions;
  }, [managerScores, questionIdToTextMap]);

  // Prepare data for the chart based on selected question
  const chartData = useMemo(() => {
    return managerScores.map(manager => {
      if (selectedQuestionId === 'overall') {
        // Use overall average
        return {
          name: manager.name,
          score: manager.averageScore,
          responseCount: manager.responsesCount,
        };
      } else {
        // Use specific question scores
        const questionScores = manager.questionScores[selectedQuestionId] || [];
        const averageScore = questionScores.length > 0
          ? questionScores.reduce((sum, score) => sum + score, 0) / questionScores.length
          : 0;
        
        return {
          name: manager.name,
          score: averageScore,
          responseCount: questionScores.length,
        };
      }
    }).sort((a, b) => b.score - a.score); // Sort by score descending
  }, [managerScores, selectedQuestionId]);

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return '#15803d'; // green-700
    if (score >= 4) return '#16a34a'; // green-600
    if (score >= 3.5) return '#84cc16'; // lime-500
    if (score >= 3) return '#eab308'; // yellow-500
    if (score >= 2.5) return '#f97316'; // orange-500
    return '#ef4444'; // red-500
  };

  const formatScore = (score: number) => {
    return score.toFixed(1);
  };

  if (managerScores.length === 0) {
    return null;
  }

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <CardTitle className="text-sm">Manager Comparison</CardTitle>
          <Select
            value={selectedQuestionId}
            onValueChange={setSelectedQuestionId}
          >
            <SelectTrigger className="w-full sm:w-[300px] h-8 text-xs">
              <SelectValue placeholder="Select question" />
            </SelectTrigger>
            <SelectContent>
              {availableQuestions.map(question => (
                <SelectItem key={question.id} value={question.id} className="text-xs">
                  {question.text}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              barSize={20}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis
                type="number"
                domain={[0, 5]}
                tickCount={6}
                tickLine={true}
                axisLine={true}
                fontSize={12}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Bar
                dataKey="score"
                background={{ fill: "#f8fafc" }}
                radius={[0, 4, 4, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
                ))}
              </Bar>
              <RechartsTooltip
                cursor={{ fill: 'transparent' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {data.name}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs">Score:</span>
                          <span className="text-sm font-medium">{formatScore(data.score)}</span>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs">
                            {data.responseCount} {data.responseCount === 1 ? 'response' : 'responses'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
} 