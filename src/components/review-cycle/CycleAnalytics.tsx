import { Card } from "@/components/ui/card";
import { ReviewCycle, FeedbackRequest } from '@/types/review';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { CORE_COMPETENCIES } from '@/lib/competencies';

interface Props {
  reviewCycle: ReviewCycle;
}

interface CompetencyScore {
  score: number | null;
  confidence: 'low' | 'medium' | 'high';
  sampleSize: number;
  evidenceCount: number;
  effectiveEvidenceCount?: number;  // Optional since it may not be available in legacy data
  isInsufficientData?: boolean;
  totalWeight?: number;
}

interface AggregateAnalytics {
  [key: string]: CompetencyScore;
}

export interface Competency {
  name: string;
  score: number;
  confidence: 'low' | 'medium' | 'high';
  description: string;
  evidenceCount: number;
}

// Add relationship weight constants at the top level
const RELATIONSHIP_WEIGHTS = {
  senior: 0.4,
  peer: 0.35,
  junior: 0.25,
  aggregate: 1 // Used for already aggregated scores
};

function calculateConfidence(employeeScores: Array<{
  score: number;
  confidence: 'low' | 'medium' | 'high';
  evidenceCount: number;
  relationship: string;
}>): 'low' | 'medium' | 'high' {
  // Calculate variance
  const scores = employeeScores.map(s => s.score);
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
  const variance = Math.sqrt(squaredDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length);

  // Count unique relationship types
  const uniqueRelationships = new Set(employeeScores.map(s => s.relationship)).size;

  // Thresholds
  const MIN_MENTIONS = 5;        // At least 5 reviews should mention this
  const MAX_VARIANCE = 1.2;      // Score variance should be low
  const MIN_RELATIONSHIPS = 3;    // From at least 3 relationship types

  // High confidence requires all criteria
  if (
    employeeScores.length >= MIN_MENTIONS &&
    variance <= MAX_VARIANCE &&
    uniqueRelationships >= MIN_RELATIONSHIPS
  ) {
    return 'high';
  }

  // Low confidence if we don't meet base requirements
  if (
    employeeScores.length < MIN_MENTIONS / 2 ||    // Less than 3 reviews mention this
    variance > MAX_VARIANCE * 1.5 ||               // High variance in scores
    uniqueRelationships < 2                        // Only 1 relationship type
  ) {
    return 'low';
  }

  // Medium confidence for everything else
  return 'medium';
}

export function CycleAnalytics({ reviewCycle }: Props) {
  return null;
} 