import { OpenAI } from 'openai';
import { supabase } from '@/lib/supabase';
import { type RelationshipInsight, type OpenAICompetencyScore } from "@/types/feedback/analysis";
import { type CoreFeedbackResponse } from '@/types/feedback/base';
import { RELATIONSHIP_WEIGHTS } from "@/constants/feedback";
import { analyzeRelationshipFeedback } from './feedback';
import { calculateConfidence as calculateComprehensiveConfidence } from "@/components/dashboard/utils";
import type { ScoreWithOutlier } from "@/components/dashboard/types";

interface GroupedFeedback {
  [key: string]: CoreFeedbackResponse[];
}

export type RelationshipType = 'senior' | 'peer' | 'junior' | 'aggregate';
export type AnalysisSubstep = 'SENIOR' | 'PEER' | 'JUNIOR' | 'AGGREGATE';

interface AnalysisCallbacks {
  onStageChange: (stage: number, substep?: AnalysisSubstep) => void;
  onError: (error: string) => void;
  onSuccess: (insights: RelationshipInsight[], timestamp: string) => void;
}

export async function processAnalysis(
  feedbackRequestId: string,
  groupedFeedback: GroupedFeedback,
  currentFeedbackHash: string,
  callbacks: AnalysisCallbacks
) {
  try {
    // Stage 0: Prepare
    callbacks.onStageChange(0);
    const openai = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true
    });

    // Stage 1: Process feedback
    callbacks.onStageChange(1, 'SENIOR');
    const seniorAnalysis = await analyzeRelationshipFeedback(
      'senior',
      groupedFeedback.senior,
      openai
    );

    callbacks.onStageChange(1, 'PEER');
    const peerAnalysis = await analyzeRelationshipFeedback(
      'peer',
      groupedFeedback.peer,
      openai
    );

    callbacks.onStageChange(1, 'JUNIOR');
    const juniorAnalysis = await analyzeRelationshipFeedback(
      'junior',
      groupedFeedback.junior,
      openai
    );

    callbacks.onStageChange(1, 'AGGREGATE');
    const transformedInsights = calculateAggregateInsights(
      seniorAnalysis,
      peerAnalysis,
      juniorAnalysis,
      groupedFeedback
    );

    // Stage 2: Save to database
    callbacks.onStageChange(2);
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

    if (upsertError) throw new Error(upsertError.message);

    // Stage 3: Complete
    callbacks.onStageChange(3);
    callbacks.onSuccess(transformedInsights, timestamp);

  } catch (error) {
    console.error('Analysis error:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to analyze feedback. Please try again later.';
    callbacks.onError(errorMessage);
  }
}

function calculateAggregateInsights(
  seniorAnalysis: any,
  peerAnalysis: any,
  juniorAnalysis: any,
  groupedFeedback: GroupedFeedback
): RelationshipInsight[] {
  // Get all unique competency names
  const competencyNames = new Set([
    ...(seniorAnalysis.competency_scores || []).map((s: OpenAICompetencyScore) => s.name),
    ...(peerAnalysis.competency_scores || []).map((s: OpenAICompetencyScore) => s.name),
    ...(juniorAnalysis.competency_scores || []).map((s: OpenAICompetencyScore) => s.name)
  ]);

  // Calculate aggregate themes
  const allThemes = [
    ...(seniorAnalysis.key_insights || []),
    ...(peerAnalysis.key_insights || []),
    ...(juniorAnalysis.key_insights || [])
  ];

  const totalResponses = Object.values(groupedFeedback).reduce(
    (sum, responses) => sum + responses.length, 
    0
  );

  return [
    {
      relationship: 'aggregate',
      themes: allThemes,
      competencies: calculateAggregateCompetencies(
        Array.from(competencyNames),
        seniorAnalysis,
        peerAnalysis,
        juniorAnalysis,
        groupedFeedback
      ),
      responseCount: totalResponses,
      uniquePerspectives: []
    },
    createRelationshipInsight('senior', seniorAnalysis, groupedFeedback.senior.length),
    createRelationshipInsight('peer', peerAnalysis, groupedFeedback.peer.length),
    createRelationshipInsight('junior', juniorAnalysis, groupedFeedback.junior.length)
  ];
}

function calculateAggregateCompetencies(
  competencyNames: string[],
  seniorAnalysis: any,
  peerAnalysis: any,
  juniorAnalysis: any,
  groupedFeedback: GroupedFeedback
) {
  return competencyNames.map(name => {
    const seniorScore = seniorAnalysis.competency_scores?.find((s: OpenAICompetencyScore) => s.name === name);
    const peerScore = peerAnalysis.competency_scores?.find((s: OpenAICompetencyScore) => s.name === name);
    const juniorScore = juniorAnalysis.competency_scores?.find((s: OpenAICompetencyScore) => s.name === name);
    
    const weights = calculateWeights(groupedFeedback);
    const weightedScore = calculateWeightedScore(seniorScore, peerScore, juniorScore, weights);
    const evidenceQuotes = combineEvidenceQuotes(seniorScore, peerScore, juniorScore);
    const confidence = calculateConfidence(seniorScore, peerScore, juniorScore);

    return {
      name,
      score: weightedScore,
      confidence,
      description: "",
      evidenceCount: calculateTotalEvidence(seniorScore, peerScore, juniorScore),
      roleSpecificNotes: "",
      evidenceQuotes: evidenceQuotes.length > 0 ? evidenceQuotes : undefined
    };
  });
}

function createRelationshipInsight(
  relationship: RelationshipType,
  analysis: any,
  responseCount: number
): RelationshipInsight {
  return {
    relationship,
    themes: analysis.key_insights || [],
    competencies: analysis.competency_scores?.map((score: OpenAICompetencyScore) => ({
      name: score.name,
      score: score.score,
      confidence: score.confidence,
      description: score.description,
      evidenceCount: score.evidenceCount,
      roleSpecificNotes: "",
      evidenceQuotes: score.evidenceQuotes
    })) || [],
    responseCount,
    uniquePerspectives: []
  };
}

function calculateWeights(groupedFeedback: GroupedFeedback) {
  const seniorWeight = groupedFeedback.senior.length > 0 ? RELATIONSHIP_WEIGHTS.senior : 0;
  const peerWeight = groupedFeedback.peer.length > 0 ? RELATIONSHIP_WEIGHTS.peer : 0;
  const juniorWeight = groupedFeedback.junior.length > 0 ? RELATIONSHIP_WEIGHTS.junior : 0;
  
  const totalWeight = seniorWeight + peerWeight + juniorWeight;
  
  return {
    senior: totalWeight > 0 ? seniorWeight / totalWeight : 0,
    peer: totalWeight > 0 ? peerWeight / totalWeight : 0,
    junior: totalWeight > 0 ? juniorWeight / totalWeight : 0
  };
}

function calculateWeightedScore(
  seniorScore: OpenAICompetencyScore | undefined,
  peerScore: OpenAICompetencyScore | undefined,
  juniorScore: OpenAICompetencyScore | undefined,
  weights: { senior: number; peer: number; junior: number }
) {
  return (
    (seniorScore?.score ?? 0) * weights.senior +
    (peerScore?.score ?? 0) * weights.peer +
    (juniorScore?.score ?? 0) * weights.junior
  );
}

function combineEvidenceQuotes(
  seniorScore?: OpenAICompetencyScore,
  peerScore?: OpenAICompetencyScore,
  juniorScore?: OpenAICompetencyScore
) {
  return [
    ...(seniorScore?.evidenceQuotes ?? []),
    ...(peerScore?.evidenceQuotes ?? []),
    ...(juniorScore?.evidenceQuotes ?? [])
  ];
}

function calculateTotalEvidence(
  seniorScore?: OpenAICompetencyScore,
  peerScore?: OpenAICompetencyScore,
  juniorScore?: OpenAICompetencyScore
) {
  return (
    (seniorScore?.evidenceCount ?? 0) +
    (peerScore?.evidenceCount ?? 0) +
    (juniorScore?.evidenceCount ?? 0)
  );
}

function calculateConfidence(
  seniorScore?: OpenAICompetencyScore,
  peerScore?: OpenAICompetencyScore,
  juniorScore?: OpenAICompetencyScore
): 'low' | 'medium' | 'high' {
  // Convert scores to ScoreWithOutlier format for comprehensive confidence calculation
  const scores: ScoreWithOutlier[] = [];
  
  if (seniorScore) {
    scores.push({
      name: seniorScore.name,
      score: seniorScore.score,
      confidence: seniorScore.confidence,
      description: seniorScore.description || '',
      evidenceCount: seniorScore.evidenceCount,
      effectiveEvidenceCount: seniorScore.evidenceCount,
      relationship: 'senior',
      evidenceQuotes: seniorScore.evidenceQuotes,
      hasOutliers: false,
      adjustmentDetails: undefined,
      scoreDistribution: undefined,
      averageScore: seniorScore.score,
      scoreSpread: undefined,
      adjustedWeight: undefined,
      confidenceMetrics: {
        evidenceScore: 1,
        consistencyScore: 1,
        relationshipScore: 1,
        finalScore: 1,
        factors: {
          evidenceCount: seniorScore.evidenceCount,
          variance: 0,
          relationshipCount: 1,
          distributionQuality: 1
        }
      },
      relationshipBreakdown: {
        senior: seniorScore.evidenceCount,
        peer: 0,
        junior: 0
      }
    });
  }

  if (peerScore) {
    scores.push({
      name: peerScore.name,
      score: peerScore.score,
      confidence: peerScore.confidence,
      description: peerScore.description || '',
      evidenceCount: peerScore.evidenceCount,
      effectiveEvidenceCount: peerScore.evidenceCount,
      relationship: 'peer',
      evidenceQuotes: peerScore.evidenceQuotes,
      hasOutliers: false,
      adjustmentDetails: undefined,
      scoreDistribution: undefined,
      averageScore: peerScore.score,
      scoreSpread: undefined,
      adjustedWeight: undefined,
      confidenceMetrics: {
        evidenceScore: 1,
        consistencyScore: 1,
        relationshipScore: 1,
        finalScore: 1,
        factors: {
          evidenceCount: peerScore.evidenceCount,
          variance: 0,
          relationshipCount: 1,
          distributionQuality: 1
        }
      },
      relationshipBreakdown: {
        senior: 0,
        peer: peerScore.evidenceCount,
        junior: 0
      }
    });
  }

  if (juniorScore) {
    scores.push({
      name: juniorScore.name,
      score: juniorScore.score,
      confidence: juniorScore.confidence,
      description: juniorScore.description || '',
      evidenceCount: juniorScore.evidenceCount,
      effectiveEvidenceCount: juniorScore.evidenceCount,
      relationship: 'junior',
      evidenceQuotes: juniorScore.evidenceQuotes,
      hasOutliers: false,
      adjustmentDetails: undefined,
      scoreDistribution: undefined,
      averageScore: juniorScore.score,
      scoreSpread: undefined,
      adjustedWeight: undefined,
      confidenceMetrics: {
        evidenceScore: 1,
        consistencyScore: 1,
        relationshipScore: 1,
        finalScore: 1,
        factors: {
          evidenceCount: juniorScore.evidenceCount,
          variance: 0,
          relationshipCount: 1,
          distributionQuality: 1
        }
      },
      relationshipBreakdown: {
        senior: 0,
        peer: 0,
        junior: juniorScore.evidenceCount
      }
    });
  }

  return calculateComprehensiveConfidence(scores).level;
} 