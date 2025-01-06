import { useEffect, useState, useMemo, useCallback, memo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { type RelationshipInsight, type AnalyticsMetadata, type OpenAIAnalysisResponse, type OpenAICompetencyScore } from "@/types/feedback/analysis";
import { RELATIONSHIP_ORDER, MINIMUM_REVIEWS_REQUIRED } from "@/constants/feedback";
import { normalizeRelationship, createFeedbackHash, formatLastAnalyzed } from "@/utils/feedback";
import { type CoreFeedbackResponse } from '@/types/feedback/base';
import { MinimumReviewsMessage } from './MinimumReviewsMessage';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { InsightContent } from './InsightContent';
import { OpenAI } from 'openai';

// Types
interface Props {
  feedbackResponses: CoreFeedbackResponse[];
  feedbackRequestId: string;
}

type RelationshipType = 'aggregate' | 'senior' | 'peer' | 'junior';

interface ExpandedSections {
  [key: string]: boolean;
  aggregate: boolean;
  senior: boolean;
  peer: boolean;
  junior: boolean;
}

interface AnalysisResult {
  insights: RelationshipInsight[];
  error?: string;
}

interface RelationshipSectionProps {
  relationshipType: string;
  insight: RelationshipInsight | undefined;
  responseCount: number;
  isExpanded: boolean;
  onToggle: () => void;
}

interface AnalysisSectionProps extends RelationshipSectionProps {
  variant: 'aggregate' | 'perspective';
}

// Memoized Components
const AnalysisSection = memo(function AnalysisSection({
  relationshipType,
  insight,
  responseCount,
  isExpanded,
  onToggle,
  variant
}: AnalysisSectionProps) {
  const isAggregate = variant === 'aggregate';
  
  return (
    <Card className={isAggregate ? "border-2" : "border border-muted"}>
      <CardHeader 
        className={cn(
          "cursor-pointer hover:bg-muted/50 transition-colors",
          isAggregate ? "bg-muted/30" : "py-3"
        )}
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className={isAggregate ? "text-xl" : "text-base"}>
              {isAggregate ? "Overall Analysis" : `${relationshipType.charAt(0).toUpperCase() + relationshipType.slice(1)} Perspective`}
            </CardTitle>
            <Badge variant="outline" className="capitalize">
              {responseCount} {responseCount === 1 ? 'response' : 'responses'}
            </Badge>
          </div>
          <ChevronDown className={cn(
            "transition-transform",
            isAggregate ? "h-5 w-5" : "h-4 w-4",
            isExpanded && "rotate-180"
          )} />
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-6">
          <InsightContent insight={insight} />
        </CardContent>
      )}
    </Card>
  );
});

// Main Component
export function FeedbackAnalytics({
  feedbackResponses,
  feedbackRequestId,
}: Props) {
  // State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState<RelationshipInsight[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [analysisStage, setAnalysisStage] = useState(0);
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>(() => ({
    aggregate: true,
    senior: false,
    peer: false,
    junior: false
  }));
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(null);
  const [existingAnalysis, setExistingAnalysis] = useState<AnalyticsMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const cleanupRef = useRef<(() => void) | undefined>();

  // Memoized values
  const hasMinimumReviews = useMemo(() => 
    feedbackResponses.length >= MINIMUM_REVIEWS_REQUIRED,
    [feedbackResponses.length]
  );

  const groupedFeedback = useMemo(() => {
    const grouped = feedbackResponses.reduce((acc, response) => {
      const relationship = normalizeRelationship(response.relationship);
      if (!acc[relationship]) acc[relationship] = [];
      acc[relationship].push(response);
      return acc;
    }, {} as Record<string, CoreFeedbackResponse[]>);

    return Object.fromEntries(
      RELATIONSHIP_ORDER.map(type => [type, grouped[type] || []])
    );
  }, [feedbackResponses]);

  const currentFeedbackHash = useMemo(() => 
    createFeedbackHash(feedbackResponses),
    [feedbackResponses]
  );

  const insightMap = useMemo(() => 
    new Map(insights.map(insight => [
      insight.relationship === 'aggregate' 
        ? 'aggregate' 
        : normalizeRelationship(insight.relationship),
      insight
    ])),
    [insights]
  );

  const hasChangedSinceLastAnalysis = useMemo(() => 
    existingAnalysis?.feedback_hash !== currentFeedbackHash,
    [existingAnalysis?.feedback_hash, currentFeedbackHash]
  );

  const shouldShowAnalysis = useMemo(() => {
    if (!existingAnalysis?.insights) return false;
    return Array.isArray(existingAnalysis.insights) && existingAnalysis.insights.length > 0;
  }, [existingAnalysis?.insights]);

  const needsInitialAnalysis = useMemo(() => 
    hasMinimumReviews && !isAnalyzing && !error && !isLoading && !shouldShowAnalysis,
    [hasMinimumReviews, isAnalyzing, error, isLoading, shouldShowAnalysis]
  );

  const shouldShowUpdateButton = useMemo(() => 
    shouldShowAnalysis && hasChangedSinceLastAnalysis && !isLoading,
    [shouldShowAnalysis, hasChangedSinceLastAnalysis, isLoading]
  );

  // Callbacks
  const toggleSection = useCallback((relationship: RelationshipType) => {
    setExpandedSections(prev => ({
      ...prev,
      [relationship]: !prev[relationship]
    }));
  }, []);

  const runAnalysis = useCallback(async () => {
    let isSubscribed = true;
    setIsAnalyzing(true);
    setError(null);
    setAnalysisStage(0);

    const cleanup = () => {
      isSubscribed = false;
    };

    try {
      // Stage 1: Generate insights
      if (!isSubscribed) return cleanup;
      setAnalysisStage(1);
      
      const openai = new OpenAI({
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true
      });

      const formattedFeedback = feedbackResponses.map(f => `
Relationship: ${f.relationship.replace('_', ' ')}
Strengths: "${f.strengths}"
Areas for Improvement: "${f.areas_for_improvement}"
`).join('\n');

      const completion = await openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert in 360-degree performance reviews and feedback analysis. Your task is to analyze feedback responses and generate a structured analysis following a specific JSON schema.

Response Requirements:
1. Return ONLY a valid JSON object
2. Follow the exact schema structure provided
3. Include all 7 competencies for each perspective
4. Use "low" confidence when evidence is limited

Required Competencies:
1. Leadership & Influence
2. Execution & Accountability
3. Collaboration & Communication
4. Innovation & Problem-Solving
5. Growth & Development
6. Technical/Functional Expertise
7. Emotional Intelligence & Culture Fit

Confidence Level Rules:
- "low": 0-1 reviewers OR limited/no specific evidence
- "medium": 2-3 reviewers WITH specific evidence
- "high": 4+ reviewers WITH specific evidence
- IMPORTANT: A perspective with only 1 response MUST use "low" confidence for all competencies

Schema Description:
- aggregate: Overall analysis combining all perspectives
  - themes: Array of key themes identified
  - competency_scores: Array of competency evaluations
- senior/peer/junior: Perspective-specific analysis
  - key_insights: Array of unique insights
  - competency_scores: Array of competency evaluations
- Each competency_scores array must include all 7 competencies
- Each competency evaluation must include:
  - name: Competency name (from list above)
  - score: Number 1-5
  - confidence: "low" | "medium" | "high"
  - description: String explaining the score
  - evidenceCount: Number of evidence pieces
  - evidenceQuotes: Array of supporting quotes`
          },
          {
            role: "user",
            content: `Analyze these feedback responses and return a JSON object matching the required schema:

${formattedFeedback}`
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      });

      let cleanedContent = completion.choices[0].message.content!;
      
      let analysisResult: OpenAIAnalysisResponse;
      try {
        analysisResult = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Malformed JSON:', cleanedContent);
        throw new Error('Failed to parse analysis results. Please try again.');
      }

      if (!isSubscribed) return cleanup;
      
      if (!analysisResult || !analysisResult.aggregate) {
        throw new Error('Invalid analysis format. Please try again.');
      }

      // Transform the OpenAI response into our expected format
      const transformedInsights: RelationshipInsight[] = [
        {
          relationship: 'aggregate',
          themes: analysisResult.aggregate.themes || [],
          competencies: analysisResult.aggregate.competency_scores?.map((score: OpenAICompetencyScore) => ({
            name: score.name,
            score: score.score,
            confidence: feedbackResponses.length <= 1 ? "low" : 
                       feedbackResponses.length <= 3 ? "medium" : "high",
            description: score.description,
            evidenceCount: score.evidenceCount,
            roleSpecificNotes: ""
          })) || [],
          responseCount: feedbackResponses.length,
          uniquePerspectives: []
        },
        {
          relationship: 'senior',
          themes: analysisResult.senior.key_insights || [],
          competencies: analysisResult.senior.competency_scores?.map((score: OpenAICompetencyScore) => ({
            name: score.name,
            score: score.score,
            confidence: (groupedFeedback.senior?.length || 0) <= 1 ? "low" :
                       (groupedFeedback.senior?.length || 0) <= 3 ? "medium" : "high",
            description: score.description,
            evidenceCount: score.evidenceCount,
            roleSpecificNotes: ""
          })) || [],
          responseCount: groupedFeedback.senior?.length || 0,
          uniquePerspectives: []
        },
        {
          relationship: 'peer',
          themes: analysisResult.peer.key_insights || [],
          competencies: analysisResult.peer.competency_scores?.map((score: OpenAICompetencyScore) => ({
            name: score.name,
            score: score.score,
            confidence: (groupedFeedback.peer?.length || 0) <= 1 ? "low" :
                       (groupedFeedback.peer?.length || 0) <= 3 ? "medium" : "high",
            description: score.description,
            evidenceCount: score.evidenceCount,
            roleSpecificNotes: ""
          })) || [],
          responseCount: groupedFeedback.peer?.length || 0,
          uniquePerspectives: []
        },
        {
          relationship: 'junior',
          themes: analysisResult.junior.key_insights || [],
          competencies: analysisResult.junior.competency_scores?.map((score: OpenAICompetencyScore) => ({
            name: score.name,
            score: score.score,
            confidence: (groupedFeedback.junior?.length || 0) <= 1 ? "low" :
                       (groupedFeedback.junior?.length || 0) <= 3 ? "medium" : "high",
            description: score.description,
            evidenceCount: score.evidenceCount,
            roleSpecificNotes: ""
          })) || [],
          responseCount: groupedFeedback.junior?.length || 0,
          uniquePerspectives: []
        }
      ];

      // Stage 2: Save to database
      if (!isSubscribed) return cleanup;
      setAnalysisStage(2);
      const timestamp = new Date().toISOString();
      
      const { error: upsertError } = await supabase
        .from('feedback_analytics')
        .upsert(
          {
            feedback_request_id: feedbackRequestId,
            insights: transformedInsights,
            feedback_hash: currentFeedbackHash,
            last_analyzed_at: timestamp
          },
          {
            onConflict: 'feedback_request_id',
            ignoreDuplicates: false
          }
        );

      if (upsertError) {
        console.error('Save error:', upsertError);
        throw new Error(upsertError.message);
      }

      // Stage 3: Update UI
      if (!isSubscribed) return cleanup;
      setAnalysisStage(3);
      setInsights(transformedInsights);
      setLastAnalyzedAt(timestamp);
      setExistingAnalysis({
        insights: transformedInsights,
        feedback_hash: currentFeedbackHash,
        last_analyzed_at: timestamp
      });

    } catch (error) {
      if (!isSubscribed) return cleanup;
      console.error('Analysis error:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to analyze feedback. Please try again later.';
      setError(errorMessage);
    } finally {
      if (isSubscribed) {
        setIsAnalyzing(false);
        setAnalysisStage(0);
      }
    }

    return cleanup;
  }, [feedbackResponses, feedbackRequestId, currentFeedbackHash]);

  // Effects
  useEffect(() => {
    if (!hasMinimumReviews || feedbackResponses.length === 0) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    
    const fetchExistingAnalysis = async () => {
      try {
        setIsLoading(true);
        const { data: existing, error: fetchError } = await supabase
          .from('feedback_analytics')
          .select('insights, feedback_hash, last_analyzed_at')
          .eq('feedback_request_id', feedbackRequestId)
          .single();

        if (!isMounted) return;

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('Fetch error:', fetchError);
          return;
        }

        if (!existing) {
          setIsLoading(false);
          return;
        }

        // Ensure insights is an array and has content
        const validInsights = Array.isArray(existing.insights) && existing.insights.length > 0
          ? existing.insights 
          : [];

        if (validInsights.length > 0) {
          setExistingAnalysis({
            ...existing,
            insights: validInsights
          });
          
          setInsights(validInsights);
          setLastAnalyzedAt(existing.last_analyzed_at);
        }

      } catch (error) {
        console.error('Fetch analysis error:', error);
        if (isMounted) {
          setError('Failed to fetch existing analysis');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchExistingAnalysis();
    
    return () => { 
      isMounted = false;
      if (cleanupRef.current) cleanupRef.current();
    };
  }, [feedbackResponses, currentFeedbackHash, hasMinimumReviews, feedbackRequestId]);

  // Handle analysis
  const handleAnalysis = useCallback(async () => {
    const cleanupFn = await runAnalysis();
    if (cleanupFn) cleanupRef.current = cleanupFn;
  }, [runAnalysis]);

  // Render conditions
  if (!hasMinimumReviews) {
    return <MinimumReviewsMessage feedbackResponses={feedbackResponses} />;
  }

  if (isAnalyzing) {
    return <LoadingState stage={analysisStage} />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (isLoading) {
    return <LoadingState stage={0} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Feedback Analytics</h2>
            <Badge variant="outline" className="text-xs font-normal bg-black text-white hover:bg-black/90 cursor-help transition-colors border-black">
              Beta
            </Badge>
          </div>
          {lastAnalyzedAt && shouldShowAnalysis && (
            <p className="text-sm text-muted-foreground">
              Last analyzed {formatLastAnalyzed(lastAnalyzedAt)}
            </p>
          )}
        </div>
        {needsInitialAnalysis ? (
          <Button
            variant="default"
            size="sm"
            onClick={handleAnalysis}
            disabled={isAnalyzing}
            className="h-8 text-xs"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="ml-1.5">Analyzing...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="ml-1.5">Generate Analysis</span>
              </>
            )}
          </Button>
        ) : shouldShowUpdateButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAnalysis}
            disabled={isAnalyzing}
            className="h-8 text-xs"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="ml-1.5">Analyzing...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="ml-1.5">Update Analysis</span>
              </>
            )}
          </Button>
        )}
      </div>

      {needsInitialAnalysis ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center text-center space-y-3">
              <div className="rounded-full bg-primary/10 p-3">
                <RefreshCw className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium">Ready to Analyze</h3>
                <p className="text-sm text-muted-foreground">
                  Click the Generate Analysis button above to analyze {feedbackResponses.length} feedback responses
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : shouldShowAnalysis ? (
        <>
          {insightMap.has('aggregate') && (
            <AnalysisSection
              variant="aggregate"
              relationshipType="aggregate"
              insight={insightMap.get('aggregate')}
              responseCount={feedbackResponses.length}
              isExpanded={expandedSections['aggregate']}
              onToggle={() => toggleSection('aggregate')}
            />
          )}

          <div className="grid grid-cols-1 gap-4 mt-6">
            {RELATIONSHIP_ORDER.map((relationshipType) => {
              const responseCount = groupedFeedback[relationshipType]?.length || 0;
              return (
                <AnalysisSection
                  key={relationshipType}
                  variant="perspective"
                  relationshipType={relationshipType}
                  insight={insightMap.get(relationshipType)}
                  responseCount={responseCount}
                  isExpanded={expandedSections[relationshipType]}
                  onToggle={() => toggleSection(relationshipType)}
                />
              );
            })}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center text-center space-y-3">
              <div className="rounded-full bg-primary/10 p-3">
                <RefreshCw className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium">Generate Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Click the Generate Analysis button above to analyze your feedback responses
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}