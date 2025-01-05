import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { type RelationshipInsight, type AnalyticsMetadata } from "@/types/feedback/analysis";
import { RELATIONSHIP_ORDER, MINIMUM_REVIEWS_REQUIRED } from "@/constants/feedback";
import { normalizeRelationship, createFeedbackHash, formatLastAnalyzed } from "@/utils/feedback";
import { type CoreFeedbackResponse } from '@/types/feedback/base';
import { MinimumReviewsMessage } from './MinimumReviewsMessage';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { InsightContent } from './InsightContent';

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

// Main Component
export function FeedbackAnalytics({
  feedbackResponses,
  feedbackRequestId,
}: Props) {
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
  const [isForceRerun, setIsForceRerun] = useState(false);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(null);
  const [existingAnalysis, setExistingAnalysis] = useState<AnalyticsMetadata | null>(null);

  // Memoized values
  const hasMinimumReviews = useMemo(() => 
    feedbackResponses.length >= MINIMUM_REVIEWS_REQUIRED,
    [feedbackResponses.length]
  );

  const groupedFeedback = useMemo(() => 
    groupFeedbackByRelationship(feedbackResponses),
    [feedbackResponses]
  );

  const currentFeedbackHash = useMemo(() => 
    createFeedbackHash(feedbackResponses),
    [feedbackResponses]
  );

  const hasChangedSinceLastAnalysis = useMemo(() => {
    if (!existingAnalysis?.feedback_hash || !currentFeedbackHash) return false;
    return existingAnalysis.feedback_hash !== currentFeedbackHash;
  }, [existingAnalysis?.feedback_hash, currentFeedbackHash]);

  // Callbacks
  const handleRerunAnalysis = useCallback(() => {
    setIsForceRerun(true);
  }, []);

  const toggleSection = useCallback((relationship: RelationshipType) => {
    setExpandedSections(prev => ({
      ...prev,
      [relationship]: !prev[relationship]
    }));
  }, []);

  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysisStage(0);

    try {
      // Step 1: Prepare data
      setAnalysisStage(0);
      const feedbackData = {
        responses: feedbackResponses,
        requestId: feedbackRequestId
      };

      // Step 2: Call analysis endpoint
      setAnalysisStage(1);
      const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('analyze-feedback', {
        body: JSON.stringify(feedbackData)
      });

      if (analysisError) throw analysisError;

      // Step 3: Process results
      setAnalysisStage(2);
      if (!analysisResult?.insights) {
        throw new Error('No insights returned from analysis');
      }

      // Step 4: Save analysis
      setAnalysisStage(3);
      const timestamp = new Date().toISOString();
      const analysisMetadata: AnalyticsMetadata = {
        insights: analysisResult.insights,
        feedback_hash: currentFeedbackHash,
        last_analyzed_at: timestamp
      };

      const { error: saveError } = await supabase
        .from('feedback_analytics')
        .upsert({
          feedback_request_id: feedbackRequestId,
          insights: analysisResult.insights,
          feedback_hash: currentFeedbackHash,
          last_analyzed_at: timestamp
        });

      if (saveError) throw saveError;

      // Step 5: Update state
      setAnalysisStage(4);
      setInsights(analysisResult.insights);
      setLastAnalyzedAt(timestamp);
      setExistingAnalysis(analysisMetadata);

    } catch (error) {
      console.error('Error in runAnalysis:', error);
      setError('Failed to analyze feedback');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStage(0);
      setIsForceRerun(false);
    }
  }, [feedbackResponses, feedbackRequestId, currentFeedbackHash]);

  // Effects
  useEffect(() => {
    let isMounted = true;
    
    const checkAndAnalyze = async () => {
      if (!hasMinimumReviews || feedbackResponses.length === 0) return;
      
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

        setExistingAnalysis(existing);

        if (existing && existing.feedback_hash === currentFeedbackHash && !isForceRerun) {
          console.log('Using cached analysis from:', existing.last_analyzed_at);
          setInsights(existing.insights);
          setLastAnalyzedAt(existing.last_analyzed_at);
          return;
        }

        if (hasMinimumReviews && (
            isForceRerun || 
            !existing || 
            existing.feedback_hash !== currentFeedbackHash
          )) {
          await runAnalysis();
        }
      } catch (error) {
        console.error('Error in checkAndAnalyze:', error);
        if (isMounted) {
          setError('Failed to analyze feedback');
        }
      }
    };

    checkAndAnalyze();
    return () => { isMounted = false; };
  }, [feedbackResponses, currentFeedbackHash, isForceRerun, hasMinimumReviews, feedbackRequestId, runAnalysis]);

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

  // Rest of the component for when we have enough reviews
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
          {lastAnalyzedAt && (
            <p className="text-sm text-muted-foreground">
              Last analyzed {formatLastAnalyzed(lastAnalyzedAt)}
            </p>
          )}
        </div>
        {hasChangedSinceLastAnalysis && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRerunAnalysis}
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
                <span className="ml-1.5">Update Available</span>
              </>
            )}
          </Button>
        )}
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
              <InsightContent insight={insights.find(i => i.relationship === 'aggregate')} />
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
              {isExpanded && (
                <CardContent className="space-y-6 pt-0">
                  <InsightContent insight={insight} />
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
} 