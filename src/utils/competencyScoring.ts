import { type ScoreWithOutlier } from "@/components/dashboard/types";
import { RELATIONSHIP_WEIGHTS } from "@/components/dashboard/constants";
import { calculateConfidence as calculateComprehensiveConfidence } from "@/components/dashboard/utils";
import { type RelationshipType as BaseRelationshipType } from "@/types/feedback/base";

export type RelationshipType = 'senior' | 'peer' | 'junior' | 'aggregate';

export function normalizeRelationship(relationship: BaseRelationshipType): RelationshipType {
  switch (relationship) {
    case 'senior_colleague':
      return 'senior';
    case 'equal_colleague':
      return 'peer';
    case 'junior_colleague':
      return 'junior';
    default:
      return 'peer'; // Default to peer if unknown
  }
}

export interface ScoreInput {
  score: number;
  relationship: BaseRelationshipType;
  evidence?: string;
}

export interface ProcessedScore {
  weightedAverage: number;
  rawAverage: number;
  confidenceLevel: number;
  outliers: ScoreWithOutlier[];
  relationshipBreakdown: Record<RelationshipType, number>;
  scoreDistribution: number[];
  stats: {
    min: number;
    max: number;
    median: number;
    mode: number;
    stdDev: number;
  };
  evidenceQuotes: string[];
  adjustmentDetails?: {
    originalScore: number;
    adjustedScore: number;
    reason: string;
  };
}

export function processCompetencyScores(scores: ScoreInput[], competencyName: string, isMultiEmployee: boolean = false): ProcessedScore | null {
  if (!scores || scores.length === 0) return null;

  // Calculate weighted average
  let totalWeightedScore = 0;
  let totalWeight = 0;
  let rawTotal = 0;
  const evidenceQuotes: string[] = [];
  const scoreValues: number[] = [];
  const relationshipBreakdown: Record<RelationshipType, { total: number; count: number }> = {
    senior: { total: 0, count: 0 },
    peer: { total: 0, count: 0 },
    junior: { total: 0, count: 0 },
    aggregate: { total: 0, count: 0 }
  };

  scores.forEach(({ score, relationship, evidence }) => {
    if (evidence) evidenceQuotes.push(evidence);
    
    const normalizedRelationship = normalizeRelationship(relationship);
    const weight = isMultiEmployee ? 1 : RELATIONSHIP_WEIGHTS[normalizedRelationship];
    totalWeightedScore += score * weight;
    totalWeight += weight;
    rawTotal += score;
    scoreValues.push(score);
    
    relationshipBreakdown[normalizedRelationship].total += score;
    relationshipBreakdown[normalizedRelationship].count++;
  });

  const weightedAverage = totalWeightedScore / totalWeight;
  const rawAverage = rawTotal / scores.length;

  // Calculate statistics
  scoreValues.sort((a, b) => a - b);
  const min = scoreValues[0];
  const max = scoreValues[scoreValues.length - 1];
  const median = scoreValues[Math.floor(scoreValues.length / 2)];
  
  // Calculate mode
  const frequency: Record<number, number> = {};
  let mode = scoreValues[0];
  let maxFreq = 1;
  scoreValues.forEach(score => {
    frequency[score] = (frequency[score] || 0) + 1;
    if (frequency[score] > maxFreq) {
      maxFreq = frequency[score];
      mode = score;
    }
  });

  // Calculate standard deviation
  const mean = rawAverage;
  const squareDiffs = scoreValues.map(score => Math.pow(score - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, diff) => sum + diff, 0) / squareDiffs.length;
  const stdDev = Math.sqrt(avgSquareDiff);

  // Map scores to ScoreWithOutlier format for outlier detection
  const scoresForOutlierDetection: ScoreWithOutlier[] = scores.map(({ score, relationship }) => ({
    name: competencyName,
    score,
    confidence: 'medium', // Default confidence
    description: '',
    evidenceCount: 1,
    effectiveEvidenceCount: 1,
    relationship: normalizeRelationship(relationship),
    hasOutliers: false
  }));

  // Calculate outliers
  const outliers: ScoreWithOutlier[] = scoresForOutlierDetection
    .map(score => {
      const zScore = (score.score - mean) / stdDev;
      const isOutlier = Math.abs(zScore) > 2;
      return {
        ...score,
        hasOutliers: isOutlier
      };
    })
    .filter(score => score.hasOutliers);

  // Calculate final relationship breakdown
  const finalRelationshipBreakdown = Object.entries(relationshipBreakdown).reduce(
    (acc, [relationship, { total, count }]) => ({
      ...acc,
      [relationship]: count > 0 ? total / count : 0
    }),
    {} as Record<RelationshipType, number>
  );

  // Calculate confidence level (0-1 scale)
  const confidenceLevel = Math.min(scores.length / 10, 1); // Simple confidence calculation based on number of scores

  return {
    weightedAverage,
    rawAverage,
    confidenceLevel,
    outliers,
    relationshipBreakdown: finalRelationshipBreakdown,
    scoreDistribution: scoreValues,
    stats: {
      min,
      max,
      median,
      mode,
      stdDev
    },
    evidenceQuotes
  };
}
