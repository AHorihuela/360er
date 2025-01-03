import { RELATIONSHIP_TYPES } from "@/constants/feedback";
import type { FeedbackResponse } from "@/types/feedback";

export function normalizeRelationship(relationship: string): string {
  const normalized = relationship.toLowerCase().replace(/[_\s]+/g, '');
  if (normalized.includes('senior')) return RELATIONSHIP_TYPES.SENIOR;
  if (normalized.includes('peer') || normalized.includes('equal')) return RELATIONSHIP_TYPES.PEER;
  if (normalized.includes('junior')) return RELATIONSHIP_TYPES.JUNIOR;
  return RELATIONSHIP_TYPES.PEER;
}

export function createFeedbackHash(responses: FeedbackResponse[]): string {
  return responses
    .map(r => `${r.id}-${r.submitted_at}`)
    .sort()
    .join('|');
}

export function validateConfidenceLevel(evidenceCount: number): string {
  if (evidenceCount <= 2) return 'low';     // 0-2 reviewers = low
  if (evidenceCount === 3) return 'medium'; // exactly 3 reviewers = medium
  return 'high';                            // 4+ reviewers = high
}

export function formatLastAnalyzed(timestamp: string | null) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
} 