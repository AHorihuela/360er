import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip,
  LabelList,
  Cell,
  CartesianGrid,
  ReferenceLine
} from "recharts";
import { cn } from "@/lib/utils";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';

interface ManagerComparisonChartProps {
  managerScores: Array<{
    name: string;
    averageScore: number;
    responsesCount: number;
    questionScores: Record<string, number[]>;
    // Navigation data
    employeeId: string;
    reviewCycleId: string;
  }>;
  questionIdToTextMap: Record<string, string>;
  // New props for navigation
  reviewCycleId?: string;
  enableNavigation?: boolean;
}

interface ChartDataItem {
  name: string;
  score: number;
  responseCount: number;
  questionText: string;
  formattedScore: string;
}

export function ManagerComparisonChart({ 
  managerScores, 
  questionIdToTextMap, 
  reviewCycleId,
  enableNavigation = true 
}: ManagerComparisonChartProps) {
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('overall');
  const [showAll, setShowAll] = useState<boolean>(false);
  const navigate = useNavigate();
  
  // Function to handle manager name clicks
  const handleManagerClick = (manager: { employeeId: string; reviewCycleId: string; name: string }) => {
    if (!enableNavigation || !manager.employeeId || !manager.reviewCycleId) {
      console.warn('Navigation disabled or missing required data for manager:', manager.name);
      return;
    }
    
    // Navigate to the detailed review page
    navigate(`/reviews/${manager.reviewCycleId}/employee/${manager.employeeId}`);
  };
  
  // Configuration for how many managers to show by default
  const DEFAULT_VISIBLE_COUNT = 10;
  const isLargeDataset = managerScores.length > DEFAULT_VISIBLE_COUNT;

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
    const allData = managerScores.map(manager => {
      if (selectedQuestionId === 'overall') {
        // Use overall average
        return {
          name: manager.name,
          score: manager.averageScore,
          responseCount: manager.responsesCount,
          questionText: 'Overall Average',
          formattedScore: manager.averageScore.toFixed(1)
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
          questionText: questionIdToTextMap[selectedQuestionId] || 'Unknown Question',
          formattedScore: averageScore.toFixed(1)
        };
      }
    }).sort((a, b) => b.score - a.score); // Sort by score descending
    
    // Return limited data if not showing all and we have a large dataset
    if (isLargeDataset && !showAll) {
      return allData.slice(0, DEFAULT_VISIBLE_COUNT);
    }
    
    return allData;
  }, [managerScores, selectedQuestionId, questionIdToTextMap, showAll, isLargeDataset]);

  // Get the currently selected question text
  const selectedQuestionText = useMemo(() => {
    if (selectedQuestionId === 'overall') return 'Overall Average';
    return questionIdToTextMap[selectedQuestionId] || 'Unknown Question';
  }, [selectedQuestionId, questionIdToTextMap]);

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return '#15803d'; // green-700
    if (score >= 4) return '#16a34a'; // green-600
    if (score >= 3.5) return '#84cc16'; // lime-500
    if (score >= 3) return '#eab308'; // yellow-500
    if (score >= 2.5) return '#f97316'; // orange-500
    return '#ef4444'; // red-500
  };

  const getScoreTextColor = (score: number): string => {
    if (score >= 4.0) return '#ffffff'; // white for dark backgrounds
    return '#000000'; // black for light backgrounds
  };

  const formatScore = (score: number) => {
    return score.toFixed(1);
  };

  const renderScoreLabel = (entry: ChartDataItem): string => {
    return entry.score >= 2.5 ? entry.formattedScore : '';
  };

  // Calculate dynamic height based on number of managers being displayed
  const dynamicHeight = useMemo(() => {
    const baseHeight = 200; // Minimum height
    const itemHeight = 48; // Height per manager bar (including spacing)
    const padding = 80; // Top and bottom padding for axes and labels
    
    return Math.max(baseHeight, (chartData.length * itemHeight) + padding);
  }, [chartData.length]);

  if (managerScores.length === 0) {
    return null;
  }

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base">Manager Comparison</CardTitle>
              {isLargeDataset && (
                <Badge variant="secondary" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  {showAll ? `All ${managerScores.length}` : `Top ${DEFAULT_VISIBLE_COUNT} of ${managerScores.length}`}
                </Badge>
              )}
            </div>
            {selectedQuestionId !== 'overall' && (
              <p className="text-sm text-muted-foreground line-clamp-2 max-w-[350px] sm:max-w-[400px]" title={selectedQuestionText}>
                {selectedQuestionText}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {isLargeDataset && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAll(!showAll)}
                className="flex items-center gap-2 text-xs"
              >
                {showAll ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Show Top {DEFAULT_VISIBLE_COUNT}
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Show All {managerScores.length}
                  </>
                )}
              </Button>
            )}
            <Select
              value={selectedQuestionId}
              onValueChange={setSelectedQuestionId}
            >
              <SelectTrigger className="w-full sm:w-[300px] h-8 text-xs">
                <SelectValue placeholder="Select question" />
              </SelectTrigger>
              <SelectContent className="max-w-[95vw] w-[400px] max-h-[300px] overflow-y-auto" align="end">
                {availableQuestions.map(question => (
                  <SelectItem 
                    key={question.id} 
                    value={question.id} 
                    className="text-xs py-3"
                    title={question.text}
                  >
                    <div className="line-clamp-2">
                      {question.text}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height: `${dynamicHeight}px` }} className="mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 20, right: 60, left: 140, bottom: 20 }}
              barSize={Math.min(32, Math.max(20, 400 / chartData.length))}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
              <XAxis
                type="number"
                domain={[0, 5]}
                tickCount={6}
                tickLine={true}
                axisLine={true}
                fontSize={12}
                stroke="#94a3b8"
              />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                stroke="#94a3b8"
                interval={0}
                tick={(props) => {
                  const { x, y, payload } = props;
                  const manager = managerScores.find(m => m.name === payload.value);
                  
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text
                        x={0}
                        y={0}
                        dy={4}
                        textAnchor="end"
                        fill="#94a3b8"
                        fontSize={12}
                        style={{
                          fontFamily: 'inherit',
                          cursor: enableNavigation ? 'pointer' : 'default'
                        }}
                        onClick={() => {
                          if (manager && enableNavigation) {
                            handleManagerClick(manager);
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (enableNavigation) {
                            (e.target as SVGTextElement).style.fill = '#64748b';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (enableNavigation) {
                            (e.target as SVGTextElement).style.fill = '#94a3b8';
                          }
                        }}
                      >
                        {payload.value}
                      </text>
                    </g>
                  );
                }}
              />
              {/* Add reference lines for score benchmarks */}
              <ReferenceLine x={3} stroke="#f59e0b" strokeDasharray="3 3" />
              <ReferenceLine x={4} stroke="#10b981" strokeDasharray="3 3" />
              
              <Bar
                dataKey="score"
                background={{ fill: "#f8fafc" }}
                radius={[0, 4, 4, 0]}
                isAnimationActive={true}
                animationDuration={800}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getScoreColor(entry.score)} 
                  />
                ))}
                <LabelList 
                  dataKey="formattedScore" 
                  position="insideRight" 
                  offset={10}
                  style={{ 
                    fontSize: '12px', 
                    fontWeight: 'bold',
                    fill: '#ffffff'
                  }}
                  formatter={renderScoreLabel}
                />
              </Bar>
              
              <RechartsTooltip
                cursor={{ fill: 'rgba(236, 240, 243, 0.5)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm max-w-[350px]">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">
                          {data.name}
                        </div>
                        {selectedQuestionId !== 'overall' && (
                          <div className="text-xs text-muted-foreground">
                            {data.questionText}
                          </div>
                        )}
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
        
        {/* Show message when data is limited */}
        {isLargeDataset && !showAll && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              Showing top {DEFAULT_VISIBLE_COUNT} highest-scoring managers. 
              <button 
                onClick={() => setShowAll(true)}
                className="ml-1 text-primary hover:underline font-medium"
              >
                Click "Show All {managerScores.length}" to see complete data.
              </button>
            </p>
          </div>
        )}
        
        {/* Legend for score thresholds */}
        <div className="mt-3 flex flex-wrap justify-end items-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-600 rounded-sm"></div>
            <span>Excellent (≥4.0)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-500 rounded-sm"></div>
            <span>Good (≥3.0)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-500 rounded-sm"></div>
            <span>Needs Improvement (≤2.5)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 