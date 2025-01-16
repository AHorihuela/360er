import { useEffect, useState, useMemo, useCallback, memo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { type RelationshipInsight, type AnalyticsMetadata, type OpenAICompetencyScore } from "@/types/feedback/analysis";
import { RELATIONSHIP_ORDER, MINIMUM_REVIEWS_REQUIRED, DETAILED_ANALYSIS_STAGES, RELATIONSHIP_WEIGHTS } from "@/constants/feedback";
import { normalizeRelationship, createFeedbackHash, formatLastAnalyzed, analyzeRelationshipFeedback, analyzeAggregatePatterns } from "@/utils/feedback";
import { type CoreFeedbackResponse } from '@/types/feedback/base';
import { MinimumReviewsMessage } from './MinimumReviewsMessage';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { InsightContent } from './InsightContent';
import { OpenAI } from 'openai';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Optimized types
type RelationshipType = 'aggregate' | 'senior' | 'peer' | 'junior';
type ExpandedSections = Record<RelationshipType, boolean>;

interface Props {
  feedbackResponses: CoreFeedbackResponse[];
  feedbackRequestId: string;
}

interface AnalysisState {
  isAnalyzing: boolean;
  insights: RelationshipInsight[];
  error: string | null;
  analysisStage: number;
  analysisSubstep?: keyof typeof DETAILED_ANALYSIS_STAGES.PROCESSING.substeps;
  lastAnalyzedAt: string | null;
  existingAnalysis: AnalyticsMetadata | null;
  isLoading: boolean;
}

// Memoized Components
const AnalysisSection = memo(function AnalysisSection({
  relationshipType,
  insight,
  responseCount,
  isExpanded,
  onToggle,
  variant
}: {
  relationshipType: string;
  insight: RelationshipInsight | undefined;
  responseCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  variant: 'aggregate' | 'perspective';
}) {
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
  // State with optimized initial values
  const [state, setState] = useState<AnalysisState>({
    isAnalyzing: false,
    insights: [],
    error: null,
    analysisStage: 0,
    analysisSubstep: undefined,
    lastAnalyzedAt: null,
    existingAnalysis: null,
    isLoading: true
  });

  const [expandedSections, setExpandedSections] = useState<ExpandedSections>(() => ({
    aggregate: true,
    senior: false,
    peer: false,
    junior: false
  }));

  const cleanupRef = useRef<(() => void) | undefined>();

  // Memoized values
  const {
    hasMinimumReviews,
    groupedFeedback,
    currentFeedbackHash,
    insightMap,
    shouldShowAnalysis,
    needsInitialAnalysis,
    shouldShowUpdateButton
  } = useMemo((): {
    hasMinimumReviews: boolean;
    groupedFeedback: Record<string, CoreFeedbackResponse[]>;
    currentFeedbackHash: string;
    insightMap: Map<string, RelationshipInsight>;
    shouldShowAnalysis: boolean;
    needsInitialAnalysis: boolean;
    shouldShowUpdateButton: boolean;
  } => {
    const feedbackHash = createFeedbackHash(feedbackResponses);
    
    return {
      hasMinimumReviews: feedbackResponses.length >= MINIMUM_REVIEWS_REQUIRED,
      groupedFeedback: RELATIONSHIP_ORDER.reduce((acc, type) => {
        acc[type] = feedbackResponses
          .filter(response => normalizeRelationship(response.relationship) === type);
        return acc;
      }, {} as Record<string, CoreFeedbackResponse[]>),
      currentFeedbackHash: feedbackHash,
      insightMap: new Map(state.insights.map(insight => [
        insight.relationship === 'aggregate' 
          ? 'aggregate' 
          : normalizeRelationship(insight.relationship),
        insight
      ])),
      shouldShowAnalysis: Boolean(state.existingAnalysis?.insights?.length),
      needsInitialAnalysis: feedbackResponses.length >= MINIMUM_REVIEWS_REQUIRED && 
                          !state.isAnalyzing && 
                          !state.error && 
                          !state.isLoading && 
                          !Boolean(state.existingAnalysis?.insights?.length),
      shouldShowUpdateButton: Boolean(state.existingAnalysis?.insights?.length) && 
                            state.existingAnalysis?.feedback_hash !== feedbackHash && 
                            !state.isLoading
    };
  }, [feedbackResponses, state]);

  // Optimized callbacks
  const toggleSection = useCallback((relationship: RelationshipType) => {
    setExpandedSections(prev => ({
      ...prev,
      [relationship]: !prev[relationship]
    }));
  }, []);

  const runAnalysis = useCallback(async () => {
    let isSubscribed = true;
    setState(prev => ({
      ...prev,
      isAnalyzing: true,
      error: null,
      analysisStage: 0,
      analysisSubstep: undefined
    }));

    const cleanup = () => {
      isSubscribed = false;
    };

    try {
      // Stage 1: Prepare data
      if (!isSubscribed) return cleanup;
      const openai = new OpenAI({
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true
      });

      // Stage 2: Process each type
      setState(prev => ({
        ...prev,
        analysisStage: 1,
        analysisSubstep: 'SENIOR'
      }));

      // Analyze senior feedback first
      const seniorAnalysis = await analyzeRelationshipFeedback(
        'senior',
        groupedFeedback.senior,
        openai
      );
      if (!isSubscribed) return cleanup;

      // Analyze peer feedback
      setState(prev => ({ ...prev, analysisSubstep: 'PEER' }));
      const peerAnalysis = await analyzeRelationshipFeedback(
        'peer',
        groupedFeedback.peer,
        openai
      );
      if (!isSubscribed) return cleanup;

      // Analyze junior feedback
      setState(prev => ({ ...prev, analysisSubstep: 'JUNIOR' }));
      const juniorAnalysis = await analyzeRelationshipFeedback(
        'junior',
        groupedFeedback.junior,
        openai
      );
      if (!isSubscribed) return cleanup;

      // Calculate aggregate scores from relationship analyses
      setState(prev => ({ ...prev, analysisSubstep: 'AGGREGATE' }));
      
      // Get all unique competency names
      const competencyNames = new Set([
        ...(seniorAnalysis.competency_scores || []).map(s => s.name),
        ...(peerAnalysis.competency_scores || []).map(s => s.name),
        ...(juniorAnalysis.competency_scores || []).map(s => s.name)
      ]);

      // Calculate aggregate themes
      const allThemes = [
        ...(seniorAnalysis.key_insights || []),
        ...(peerAnalysis.key_insights || []),
        ...(juniorAnalysis.key_insights || [])
      ];

      // Transform the analyses into our expected format
      const transformedInsights: RelationshipInsight[] = [
        {
          relationship: 'aggregate',
          themes: allThemes,
          competencies: Array.from(competencyNames).map(name => {
            // Find corresponding competency scores from each relationship type
            const seniorScore = seniorAnalysis.competency_scores?.find(s => s.name === name);
            const peerScore = peerAnalysis.competency_scores?.find(s => s.name === name);
            const juniorScore = juniorAnalysis.competency_scores?.find(s => s.name === name);
            
            // Calculate weighted average based on relationship weights and response counts
            const seniorWeight = groupedFeedback.senior.length > 0 ? RELATIONSHIP_WEIGHTS.senior : 0;
            const peerWeight = groupedFeedback.peer.length > 0 ? RELATIONSHIP_WEIGHTS.peer : 0;
            const juniorWeight = groupedFeedback.junior.length > 0 ? RELATIONSHIP_WEIGHTS.junior : 0;
            
            // Normalize weights based on available relationships
            const totalWeight = seniorWeight + peerWeight + juniorWeight;
            const normalizedSeniorWeight = totalWeight > 0 ? seniorWeight / totalWeight : 0;
            const normalizedPeerWeight = totalWeight > 0 ? peerWeight / totalWeight : 0;
            const normalizedJuniorWeight = totalWeight > 0 ? juniorWeight / totalWeight : 0;
            
            // Calculate weighted score
            const weightedScore = (
              (seniorScore?.score || 0) * normalizedSeniorWeight +
              (peerScore?.score || 0) * normalizedPeerWeight +
              (juniorScore?.score || 0) * normalizedJuniorWeight
            );

            // Combine evidence quotes from all perspectives
            const evidenceQuotes = [
              ...(seniorScore?.evidenceQuotes || []),
              ...(peerScore?.evidenceQuotes || []),
              ...(juniorScore?.evidenceQuotes || [])
            ];

            // Calculate aggregate confidence based on evidence and consistency
            const totalEvidence = (seniorScore?.evidenceCount || 0) + 
                                (peerScore?.evidenceCount || 0) + 
                                (juniorScore?.evidenceCount || 0);
            
            // Calculate score variance to affect confidence
            const scores = [
              seniorScore?.score,
              peerScore?.score,
              juniorScore?.score
            ].filter((s): s is number => s !== undefined);
            
            const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
            const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;
            
            // Determine confidence level
            let confidence: 'low' | 'medium' | 'high' = 'low';
            if (totalEvidence >= 10 && variance < 1 && scores.length >= 2) {
              confidence = 'high';
            } else if (totalEvidence >= 5 && variance < 2 && scores.length >= 2) {
              confidence = 'medium';
            }

            return {
              name,
              score: weightedScore,
              confidence,
              description: "", // Will be filled from competency definitions
              evidenceCount: totalEvidence,
              roleSpecificNotes: "",
              evidenceQuotes: evidenceQuotes.length > 0 ? evidenceQuotes : undefined
            };
          }),
          responseCount: feedbackResponses.length,
          uniquePerspectives: []
        },
        {
          relationship: 'senior',
          themes: seniorAnalysis.key_insights || [],
          competencies: seniorAnalysis.competency_scores?.map((score: OpenAICompetencyScore) => ({
            name: score.name,
            score: score.score,
            confidence: score.confidence,
            description: score.description,
            evidenceCount: score.evidenceCount,
            roleSpecificNotes: "",
            evidenceQuotes: score.evidenceQuotes
          })) || [],
          responseCount: groupedFeedback.senior.length,
          uniquePerspectives: []
        },
        {
          relationship: 'peer',
          themes: peerAnalysis.key_insights || [],
          competencies: peerAnalysis.competency_scores?.map((score: OpenAICompetencyScore) => ({
            name: score.name,
            score: score.score,
            confidence: score.confidence,
            description: score.description,
            evidenceCount: score.evidenceCount,
            roleSpecificNotes: "",
            evidenceQuotes: score.evidenceQuotes
          })) || [],
          responseCount: groupedFeedback.peer.length,
          uniquePerspectives: []
        },
        {
          relationship: 'junior',
          themes: juniorAnalysis.key_insights || [],
          competencies: juniorAnalysis.competency_scores?.map((score: OpenAICompetencyScore) => ({
            name: score.name,
            score: score.score,
            confidence: score.confidence,
            description: score.description,
            evidenceCount: score.evidenceCount,
            roleSpecificNotes: "",
            evidenceQuotes: score.evidenceQuotes
          })) || [],
          responseCount: groupedFeedback.junior.length,
          uniquePerspectives: []
        }
      ];

      // Stage 3: Save to database
      if (!isSubscribed) return cleanup;
      setState(prev => ({
        ...prev,
        analysisStage: 2,
        analysisSubstep: undefined
      }));
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

      // Stage 4: Update UI
      if (!isSubscribed) return cleanup;
      setState(prev => ({
        ...prev,
        analysisStage: 3,
        analysisSubstep: undefined,
        insights: transformedInsights,
        lastAnalyzedAt: timestamp,
        existingAnalysis: {
          insights: transformedInsights,
          feedback_hash: currentFeedbackHash,
          last_analyzed_at: timestamp
        }
      }));

    } catch (error) {
      if (!isSubscribed) return cleanup;
      console.error('Analysis error:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to analyze feedback. Please try again later.';
      setState(prev => ({
        ...prev,
        error: errorMessage
      }));
    } finally {
      if (isSubscribed) {
        setState(prev => ({
          ...prev,
          isAnalyzing: false,
          analysisStage: 0,
          analysisSubstep: undefined
        }));
      }
    }

    return cleanup;
  }, [feedbackResponses, feedbackRequestId, currentFeedbackHash, groupedFeedback]);

  // Effects
  useEffect(() => {
    if (!hasMinimumReviews || feedbackResponses.length === 0) {
      setState(prev => ({
        ...prev,
        isLoading: false
      }));
      return;
    }

    let isMounted = true;
    
    const fetchExistingAnalysis = async () => {
      try {
        setState(prev => ({
          ...prev,
          isLoading: true
        }));
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
          setState(prev => ({
            ...prev,
            isLoading: false
          }));
          return;
        }

        // Ensure insights is an array and has content
        const validInsights = Array.isArray(existing.insights) && existing.insights.length > 0
          ? existing.insights 
          : [];

        if (validInsights.length > 0) {
          setState(prev => ({
            ...prev,
            existingAnalysis: {
              ...existing,
              insights: validInsights
            },
            insights: validInsights,
            lastAnalyzedAt: existing.last_analyzed_at
          }));
        }

      } catch (error) {
        console.error('Fetch analysis error:', error);
        if (isMounted) {
          setState(prev => ({
            ...prev,
            error: 'Failed to fetch existing analysis'
          }));
        }
      } finally {
        if (isMounted) {
          setState(prev => ({
            ...prev,
            isLoading: false
          }));
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

  if (state.isAnalyzing) {
    return <LoadingState stage={state.analysisStage} substep={state.analysisSubstep} />;
  }

  if (state.error) {
    return <ErrorState error={state.error} />;
  }

  if (state.isLoading) {
    return <LoadingState stage={0} />;
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
                <TooltipContent side="right" align="start" className="max-w-[300px] p-4">
                  <div className="space-y-2">
                    <p className="font-medium">AI-Powered Analysis</p>
                    <p className="text-sm text-muted-foreground">
                      This feature uses AI to analyze feedback responses and identify patterns. Results may vary based on:
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
                      <li>Number of responses</li>
                      <li>Detail level in feedback</li>
                      <li>Consistency across reviewers</li>
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {state.lastAnalyzedAt && shouldShowAnalysis && (
            <p className="text-sm text-muted-foreground">
              Last analyzed {formatLastAnalyzed(state.lastAnalyzedAt)}
            </p>
          )}
        </div>
        {needsInitialAnalysis ? (
          <Button
            variant="default"
            size="sm"
            onClick={handleAnalysis}
            disabled={state.isAnalyzing}
            className="h-8 text-xs"
          >
            {state.isAnalyzing ? (
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
            disabled={state.isAnalyzing}
            className="h-8 text-xs"
          >
            {state.isAnalyzing ? (
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