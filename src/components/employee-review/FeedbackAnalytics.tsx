import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown, RefreshCw, Info } from 'lucide-react';
import { openai } from '@/lib/openai';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { type RelationshipInsight, type Competency, type AnalyticsMetadata } from "@/types/feedback/analysis";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CORE_COMPETENCIES, ANALYSIS_STAGES, RELATIONSHIP_TYPES, RELATIONSHIP_ORDER } from "@/constants/feedback";
import { normalizeRelationship, createFeedbackHash, validateConfidenceLevel, formatLastAnalyzed } from "@/utils/feedback";
import { type CoreFeedbackResponse } from '@/types/feedback/base';

interface Props {
  feedbackResponses: CoreFeedbackResponse[];
  employeeName: string;
  employeeRole: string;
  feedbackRequestId: string;
}

// Memoized helper functions
const groupFeedbackByRelationship = (feedbackResponses: CoreFeedbackResponse[]) => {
  const grouped = feedbackResponses.reduce((acc, response) => {
    const relationship = normalizeRelationship(response.relationship);
    if (!acc[relationship]) acc[relationship] = [];
    acc[relationship].push(response);
    return acc;
  }, {} as Record<string, CoreFeedbackResponse[]>);

  // Ensure all relationship types exist
  RELATIONSHIP_ORDER.forEach(type => {
    if (!grouped[type]) grouped[type] = [];
  });

  return grouped;
};

export function FeedbackAnalytics({ 
  feedbackResponses, 
  employeeName, 
  employeeRole,
  feedbackRequestId 
}: Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState<RelationshipInsight[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [analysisStage, setAnalysisStage] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => ({
    aggregate: true,
    [RELATIONSHIP_TYPES.SENIOR]: false,
    [RELATIONSHIP_TYPES.PEER]: false,
    [RELATIONSHIP_TYPES.JUNIOR]: false
  }));
  const [isForceRerun, setIsForceRerun] = useState(false);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(null);
  const [existingAnalysis, setExistingAnalysis] = useState<AnalyticsMetadata | null>(null);

  const MINIMUM_REVIEWS_REQUIRED = 5;
  const hasMinimumReviews = feedbackResponses.length >= MINIMUM_REVIEWS_REQUIRED;

  // If there aren't enough reviews, show a message instead of the analysis
  if (!hasMinimumReviews) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="rounded-full bg-primary/10 p-4 shrink-0">
              <Info className="h-6 w-6 text-primary" />
            </div>
            
            <div className="flex-1">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">AI-Powered Feedback Analysis</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Once {MINIMUM_REVIEWS_REQUIRED} reviews are collected, our AI will analyze the feedback to provide detailed insights.
                </p>
              </div>

              <div className="bg-muted/30 rounded-lg px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium">Collection Progress</p>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-2xl font-semibold">{feedbackResponses.length}</span>
                      <span className="text-sm text-muted-foreground">of {MINIMUM_REVIEWS_REQUIRED} reviews</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-primary">
                      {Math.round((feedbackResponses.length / MINIMUM_REVIEWS_REQUIRED) * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {MINIMUM_REVIEWS_REQUIRED - feedbackResponses.length} more needed
                    </div>
                  </div>
                </div>
                <Progress 
                  value={(feedbackResponses.length / MINIMUM_REVIEWS_REQUIRED) * 100} 
                  className="h-2"
                />
              </div>

              {feedbackResponses.length > 0 && (
                <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-primary/50" />
                  <span>Analysis will automatically unlock at {MINIMUM_REVIEWS_REQUIRED} reviews</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Memoized values
  const groupedFeedback = useMemo(() => 
    groupFeedbackByRelationship(feedbackResponses),
    [feedbackResponses]
  );

  const currentFeedbackHash = useMemo(() => 
    createFeedbackHash(feedbackResponses),
    [feedbackResponses]
  );

  // Check for existing analysis or run new analysis
  useEffect(() => {
    let isMounted = true;
    
    const checkAndAnalyze = async () => {
      if (feedbackResponses.length === 0) return;
      
      try {
        const { data: existing, error: fetchError } = await supabase
          .from('feedback_analytics')
          .select('insights, feedback_hash, last_analyzed_at')
          .eq('feedback_request_id', feedbackRequestId)
          .single();

        if (!isMounted) return;

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('Error fetching existing analysis:', fetchError);
          return;
        }

        // Store the existing analysis
        setExistingAnalysis(existing);

        // If we have a valid cached analysis and we're not forcing a rerun, use it
        if (existing && existing.feedback_hash === currentFeedbackHash && !isForceRerun) {
          console.log('Using cached analysis from:', existing.last_analyzed_at);
          setInsights(existing.insights);
          setLastAnalyzedAt(existing.last_analyzed_at);
          return;
        }

        // Run new analysis if:
        // 1. Force rerun is requested, or
        // 2. No existing analysis and we have enough reviews, or
        // 3. Existing analysis hash doesn't match current feedback hash
        if (isForceRerun || 
            (!existing && feedbackResponses.length >= MINIMUM_REVIEWS_REQUIRED) ||
            (existing && existing.feedback_hash !== currentFeedbackHash)) {
          console.log('Running new analysis - ' + 
            (isForceRerun ? 'Force rerun requested' : 
             !existing ? 'No existing analysis' : 
             'Update available'));
          await analyzeFeedback(currentFeedbackHash);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error in checkAndAnalyze:', error);
          setError('Failed to check or analyze feedback');
        }
      } finally {
        if (isMounted) {
          setIsForceRerun(false);
        }
      }
    };

    checkAndAnalyze();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [currentFeedbackHash, feedbackRequestId, isForceRerun, feedbackResponses.length]);

  const analyzeFeedback = async (currentHash: string) => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysisStage(0);
    
    try {
      let progressText = '';
      let startTime = Date.now();

      // Move to stage 1 after a brief delay to show preparation
      setTimeout(() => {
        if (Date.now() - startTime < 30000) { // Only advance if we haven't finished
          setAnalysisStage(1);
        }
      }, 1000);

      const completion = await openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        messages: [
          {
            role: "system",
            content: `Analyze the 360-degree feedback for ${employeeName} (${employeeRole}). First create an aggregate analysis across all relationships, then group insights by organizational relationship (senior, peer, junior) and provide structured analysis using our competency framework.

Note: 'Equal' and 'Peer' relationships should be analyzed together under the 'Peer' category.

STRICT Confidence Level Rules (MUST BE FOLLOWED):
1. LOW confidence:
   - When there is only 1 response mentioning the competency
   - When a competency is not explicitly mentioned in any responses
   - Default to LOW if unsure about evidence count

2. MEDIUM confidence:
   - When 2-3 responses explicitly mention or provide evidence for the competency
   - Must have clear examples from different responses

3. HIGH confidence:
   - Only when 4 or more responses explicitly mention or provide evidence
   - Must have multiple concrete examples from different responses

IMPORTANT VALIDATION RULES:
- Count each response only ONCE per competency
- A response must EXPLICITLY mention or demonstrate the competency to be counted
- General or vague mentions do not count as evidence
- If a response doesn't mention a competency, it CANNOT contribute to that competency's confidence
- Single response groups CANNOT have HIGH confidence ratings
- Confidence must be based on ACTUAL evidence count, not interpretation quality

For each relationship type AND the aggregate view, evaluate these core competencies using the following detailed rubrics:

${Object.entries(CORE_COMPETENCIES).map(([_key, comp]) => `
  ${comp.name}:
  Key aspects: ${comp.aspects.join(', ')}
`).join('\n\n')}

Analysis Guidelines:
1. Role Context: 
   - For Managers: Emphasize formal leadership, delegation, mentoring, driving team goals
   - For ICs: Focus on informal leadership, individual ownership, professional growth

2. Sample Size Handling:
   - Mark ratings with "Low Confidence" if fewer than 2 references exist
   - Group feedback by role (senior, peer, junior) for clearer patterns
   - Note when feedback is mixed or contradictory

3. Bias Detection:
   - Flag significant outliers for investigation
   - Note if one role's feedback differs notably from others
   - Identify potential patterns in feedback discrepancies

4. Evidence Requirements:
   - Each score must be supported by specific examples
   - Count only explicit mentions of competencies
   - Track the exact number of responses supporting each rating

Return a JSON response with this structure:
{
  "insights": [
    {
      "relationship": "aggregate" | "senior" | "peer" | "junior",
      "responseCount": number,
      "themes": string[],
      "uniquePerspectives": string[],
      "competencies": [
        {
          "name": string (must match one of our core competencies),
          "score": number (1-5),
          "confidence": "low" | "medium" | "high",
          "description": string (explain the score with specific evidence),
          "roleSpecificNotes": string (if significant differences exist between reviewer roles),
          "evidenceCount": number (exact count of responses that mentioned this competency)
        }
      ]
    }
  ]
}

Important:
- Base scores ONLY on concrete evidence from feedback
- Consider role context when interpreting feedback
- Provide specific examples to justify each score
- STRICTLY follow the confidence level rules
- Include exact evidence count for each competency
- Flag any potential biases or outliers
- Note role-specific differences in perception`
          },
          {
            role: "user",
            content: JSON.stringify({
              employeeRole: employeeRole,
              relationships: Object.entries(groupedFeedback).map(([relationship, responses]) => ({
                relationship,
                responseCount: responses.length,
                feedback: responses.map(r => ({
                  strengths: r.strengths,
                  areas_for_improvement: r.areas_for_improvement
                }))
              }))
            })
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        stream: true
      });

      let lastProgressUpdate = Date.now();
      let responseStarted = false;
      let aggregateFound = false;
      let seniorFound = false;
      let peerFound = false;

      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content || '';
        progressText += content;
        
        // Only process progress updates every 500ms to avoid too frequent updates
        if (Date.now() - lastProgressUpdate < 500) continue;
        lastProgressUpdate = Date.now();

        // Start of response detection
        if (!responseStarted && content.includes('{')) {
          responseStarted = true;
          setAnalysisStage(2);
        }

        // Detect different sections being processed
        if (!aggregateFound && progressText.includes('"relationship": "aggregate"')) {
          aggregateFound = true;
          setAnalysisStage(2);
        } else if (!seniorFound && progressText.includes('"relationship": "senior"')) {
          seniorFound = true;
          setAnalysisStage(3);
        } else if (!peerFound && progressText.includes('"relationship": "peer"')) {
          peerFound = true;
          setAnalysisStage(4);
        } else if (progressText.includes('"relationship": "junior"')) {
          setAnalysisStage(5);
        }

        // Detect completion
        if (content.includes('}]}')){
          setAnalysisStage(ANALYSIS_STAGES.length - 1);
        }
      }

      // Parse and validate the response
      let analysis;
      try {
        analysis = JSON.parse(progressText);
        if (!analysis.insights || !Array.isArray(analysis.insights)) {
          throw new Error('Invalid response format');
        }

        // Validate and correct confidence levels
        analysis.insights = analysis.insights.map((insight: RelationshipInsight) => ({
          ...insight,
          competencies: insight.competencies.map((comp: Competency) => ({
            ...comp,
            // Override confidence based on actual evidence count
            confidence: validateConfidenceLevel(comp.evidenceCount || 0)
          }))
        }));

      } catch (parseError) {
        console.error('Error parsing analysis response:', parseError);
        throw new Error('Failed to parse analysis results');
      }

      const timestamp = new Date().toISOString();
      
      // Store results
      const { error: upsertError } = await supabase
        .from('feedback_analytics')
        .upsert(
          {
            feedback_request_id: feedbackRequestId,
            insights: analysis.insights,
            feedback_hash: currentHash,
            last_analyzed_at: timestamp,
            updated_at: timestamp,
            created_at: timestamp
          },
          {
            onConflict: 'feedback_request_id',
            ignoreDuplicates: false
          }
        );

      if (upsertError) {
        console.error('Error storing analysis:', upsertError);
        throw new Error('Failed to store analysis results');
      }

      setInsights(analysis.insights);
      setLastAnalyzedAt(timestamp);
      console.log('Successfully stored analysis in database');
      
    } catch (err) {
      console.error('Error analyzing feedback:', err);
      setError('Failed to analyze feedback');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStage(0);
    }
  };

  const handleRerunAnalysis = () => {
    setIsForceRerun(true);
  };

  const toggleSection = (relationship: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [relationship]: !prev[relationship]
    }));
  };

  if (isAnalyzing) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-primary">
              {ANALYSIS_STAGES[analysisStage]}
            </p>
            <div className="w-full max-w-xs space-y-2">
              <Progress 
                value={((analysisStage + 1) / ANALYSIS_STAGES.length) * 100} 
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Stage {analysisStage + 1} of {ANALYSIS_STAGES.length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-sm text-destructive text-center">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Feedback Analytics</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="text-xs font-normal bg-black text-white hover:bg-black/90 cursor-help transition-colors border-black">
                    Beta
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={5} className="max-w-[220px] p-3">
                  <p className="text-sm">
                    This experimental feature uses AI to analyze feedback patterns and provide insights.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {lastAnalyzedAt && (
            <p className="text-sm text-muted-foreground">
              Last analyzed {formatLastAnalyzed(lastAnalyzedAt)}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRerunAnalysis}
          disabled={isAnalyzing || feedbackResponses.length === 0}
          className={cn(
            "h-8 text-xs flex items-center gap-1.5",
            // Add subtle highlight when updates available
            existingAnalysis?.feedback_hash !== currentFeedbackHash && "border-primary"
          )}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Analyzing...
            </>
          ) : existingAnalysis?.feedback_hash !== currentFeedbackHash ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 text-primary" />
              Update Available
            </>
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              Rerun Analysis
            </>
          )}
        </Button>
      </div>

      {/* Aggregate Analysis Section */}
      {insights.find(i => i.relationship === 'aggregate') && (
        <Card className="border-2">
          <CardHeader 
            className="cursor-pointer hover:bg-muted/50 transition-colors bg-muted/30"
            onClick={() => toggleSection('aggregate')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl">
                  Overall Analysis
                </CardTitle>
                <Badge variant="outline" className="capitalize">
                  {feedbackResponses.length} {feedbackResponses.length === 1 ? 'response' : 'responses'}
                </Badge>
              </div>
              <ChevronDown className={cn("h-5 w-5 transition-transform", expandedSections['aggregate'] && "rotate-180")} />
            </div>
          </CardHeader>
          {expandedSections['aggregate'] && (
            <CardContent className="space-y-6">
              {/* Render aggregate insights similar to relationship insights */}
              {renderInsightContent(insights.find(i => i.relationship === 'aggregate')!)}
            </CardContent>
          )}
        </Card>
      )}

      {/* Perspective Sections */}
      <div className="grid grid-cols-1 gap-4 mt-6">
        {RELATIONSHIP_ORDER.map((relationshipType) => {
          const insight = insights.find(i => normalizeRelationship(i.relationship) === relationshipType);
          const responseCount = groupedFeedback[relationshipType]?.length || 0;
          const isExpanded = expandedSections[relationshipType] || false;

          return (
            <Card key={relationshipType} className="border border-muted">
              <CardHeader 
                className="cursor-pointer hover:bg-muted/50 transition-colors py-3"
                onClick={() => toggleSection(relationshipType)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">
                      {relationshipType.charAt(0).toUpperCase() + relationshipType.slice(1)} Perspective
                    </CardTitle>
                    <Badge variant="outline" className="capitalize">
                      {responseCount} {responseCount === 1 ? 'response' : 'responses'}
                    </Badge>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                </div>
              </CardHeader>
              {isExpanded && insight && (
                <CardContent className="space-y-6 pt-0">
                  {renderInsightContent(insight)}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );

  // Helper function to render insight content (reduces code duplication)
  function renderInsightContent(insight: RelationshipInsight) {
    return (
      <>
        {/* Key Themes and Unique Insights in a grid */}
        <div className="grid grid-cols-2 gap-8">
          {/* Key Themes Column */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Key Themes</h4>
            <div className="grid gap-2">
              {insight.themes.map((theme, i) => (
                <div key={i} className="text-sm text-muted-foreground">
                  • {theme}
                </div>
              ))}
            </div>
          </div>

          {/* Unique Insights Column */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Unique Insights</h4>
            <div className="grid gap-2">
              {insight.uniquePerspectives.map((perspective, i) => (
                <div key={i} className="text-sm text-muted-foreground">
                  • {perspective}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Competencies */}
        <div className="space-y-4 mt-8">
          <h4 className="text-sm font-medium">Competency Assessment</h4>
          {insight.competencies.map((competency, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{competency.name}</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="cursor-help">
                        <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent side="right" align="start" className="max-w-[280px] p-3">
                        <div className="space-y-2">
                          <div>
                            <p className="font-medium mb-1">Score Components:</p>
                            <div className="flex items-center gap-2 mb-1">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                competency.confidence === 'low' ? "bg-destructive/50" :
                                competency.confidence === 'medium' ? "bg-yellow-500" :
                                "bg-primary"
                              )} />
                              <p className="text-sm capitalize">{competency.confidence} Confidence</p>
                            </div>
                          </div>
                          <div>
                            <p className="font-medium mb-1">Key Aspects:</p>
                            <div className="grid gap-1">
                              {Object.entries(CORE_COMPETENCIES).find(([_, comp]) => 
                                comp.name === competency.name
                              )?.[1].aspects.map((aspect, i) => (
                                <div key={i} className="flex items-baseline gap-2 text-sm">
                                  <div className="w-1 h-1 rounded-full bg-primary/50 mt-1.5" />
                                  <span>{aspect}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="font-medium mb-1">Score Meaning ({competency.score}/5):</p>
                            <p className="text-sm">
                              {(() => {
                                const foundComp = Object.entries(CORE_COMPETENCIES).find(([_, comp]) => 
                                  comp.name === competency.name
                                )?.[1];
                                return foundComp?.rubric[competency.score as keyof typeof foundComp.rubric];
                              })()}
                            </p>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge 
                          variant={competency.confidence === 'low' ? 'destructive' : 
                                 competency.confidence === 'medium' ? 'outline' : 
                                 'secondary'}
                          className={cn(
                            "text-xs capitalize cursor-help",
                            competency.confidence === 'medium' && "bg-yellow-50 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-700",
                            competency.confidence === 'high' && "bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700"
                          )}
                        >
                          {competency.confidence}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="center" className="p-2">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Confidence Level</p>
                          <p className="text-sm text-muted-foreground">
                            {competency.confidence === 'low' ? 'Based on 0-2 reviewers providing specific evidence' :
                             competency.confidence === 'medium' ? 'Based on 2-3 reviewers providing specific evidence' :
                             'Based on 4+ reviewers providing specific evidence'}
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="font-medium w-8 text-right">{competency.score}/5</span>
                </div>
              </div>
              <div className="relative">
                <Progress 
                  value={(competency.score / 5) * 100} 
                  className={cn(
                    "h-2",
                    competency.confidence === 'low' ? "bg-destructive/10 [&>div]:bg-destructive/50" :
                    competency.confidence === 'medium' ? "bg-yellow-100 [&>div]:bg-yellow-500" :
                    "bg-primary/10 [&>div]:bg-primary"
                  )}
                />
                <div className="absolute inset-0 grid grid-cols-5 -mx-[1px]">
                  {[1,2,3,4,5].map(n => (
                    <div key={n} className="border-l border-muted last:border-r" />
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{competency.description}</p>
              {competency.roleSpecificNotes && (
                <p className="text-sm text-muted-foreground italic mt-1">
                  Note: {competency.roleSpecificNotes}
                </p>
              )}
            </div>
          ))}
        </div>
      </>
    );
  }
} 