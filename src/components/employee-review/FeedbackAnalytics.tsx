import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { type RelationshipInsight, type AnalyticsMetadata } from "@/types/feedback/analysis";
import { type CoreFeedbackResponse } from '@/types/feedback/base';
import { RELATIONSHIP_ORDER, MINIMUM_REVIEWS_REQUIRED } from "@/constants/feedback";
import { normalizeRelationship, createFeedbackHash } from '@/utils/feedback';
import { processAnalysis, type AnalysisSubstep, type RelationshipType } from '@/utils/analysisProcessor';
import { MinimumReviewsMessage } from './MinimumReviewsMessage';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { AnalysisHeader } from './AnalysisHeader';
import { EmptyAnalysisState } from './EmptyAnalysisState';
import { AnalysisSection } from './AnalysisSection';

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
  analysisSubstep?: AnalysisSubstep;
  lastAnalyzedAt: string | null;
  existingAnalysis: AnalyticsMetadata | null;
  isLoading: boolean;
}

export function FeedbackAnalytics({
  feedbackResponses,
  feedbackRequestId,
}: Props) {
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

  const {
    hasMinimumReviews,
    groupedFeedback,
    currentFeedbackHash,
    insightMap,
    shouldShowAnalysis,
    needsInitialAnalysis,
    shouldShowUpdateButton
  } = useMemo(() => {
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

  const toggleSection = useCallback((relationship: RelationshipType) => {
    setExpandedSections(prev => ({
      ...prev,
      [relationship]: !prev[relationship]
    }));
  }, []);

  const handleAnalysis = useCallback(async () => {
    setState(prev => ({
      ...prev,
      isAnalyzing: true,
      error: null,
      analysisStage: 0,
      analysisSubstep: undefined
    }));

    const callbacks = {
      onStageChange: (stage: number, substep?: AnalysisSubstep) => {
        setState(prev => ({
          ...prev,
          analysisStage: stage,
          analysisSubstep: substep
        }));
      },
      onError: (error: string) => {
        setState(prev => ({
          ...prev,
          error,
          isAnalyzing: false,
          analysisStage: 0,
          analysisSubstep: undefined
        }));
      },
      onSuccess: (insights: RelationshipInsight[], timestamp: string) => {
        setState(prev => ({
          ...prev,
          isAnalyzing: false,
          analysisStage: 0,
          analysisSubstep: undefined,
          insights,
          lastAnalyzedAt: timestamp,
          existingAnalysis: {
            insights,
            feedback_hash: currentFeedbackHash,
            last_analyzed_at: timestamp
          }
        }));
      }
    };

    const cleanup = await processAnalysis(
      feedbackRequestId,
      groupedFeedback,
      currentFeedbackHash,
      callbacks
    );

    if (typeof cleanup === 'function') {
      cleanupRef.current = cleanup;
    }
  }, [feedbackRequestId, groupedFeedback, currentFeedbackHash]);

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
      <AnalysisHeader
        lastAnalyzedAt={state.lastAnalyzedAt}
        shouldShowAnalysis={shouldShowAnalysis}
        needsInitialAnalysis={needsInitialAnalysis}
        shouldShowUpdateButton={shouldShowUpdateButton}
        isAnalyzing={state.isAnalyzing}
        onAnalyze={handleAnalysis}
      />

      {needsInitialAnalysis ? (
        <EmptyAnalysisState 
          responseCount={feedbackResponses.length} 
          isInitialState={true} 
        />
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
        <EmptyAnalysisState 
          responseCount={feedbackResponses.length} 
          isInitialState={false} 
        />
      )}
    </div>
  );
}