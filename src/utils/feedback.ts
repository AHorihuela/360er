import { RELATIONSHIP_TYPES } from "@/constants/feedback";
import { CoreFeedbackResponse } from "@/types/feedback/base";
import { OpenAI } from "openai";
import { OpenAIPerspectiveSection, OpenAIAggregateSection } from "@/types/feedback/analysis";

export function normalizeRelationship(relationship: string): string {
  const normalized = relationship.toLowerCase().replace(/[_\s]+/g, '');
  if (normalized.includes('senior')) return RELATIONSHIP_TYPES.SENIOR;
  if (normalized.includes('peer') || normalized.includes('equal')) return RELATIONSHIP_TYPES.PEER;
  if (normalized.includes('junior')) return RELATIONSHIP_TYPES.JUNIOR;
  return RELATIONSHIP_TYPES.PEER;
}

export function createFeedbackHash(responses: CoreFeedbackResponse[]): string {
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

interface GroupedFeedback {
  senior: CoreFeedbackResponse[];
  peer: CoreFeedbackResponse[];
  junior: CoreFeedbackResponse[];
}

export function groupFeedbackByRelationship(feedbackResponses: CoreFeedbackResponse[]): GroupedFeedback {
  return {
    senior: feedbackResponses.filter(r => normalizeRelationship(r.relationship) === 'senior'),
    peer: feedbackResponses.filter(r => normalizeRelationship(r.relationship) === 'peer'),
    junior: feedbackResponses.filter(r => normalizeRelationship(r.relationship) === 'junior')
  };
}

export async function analyzeRelationshipFeedback(
  relationship: string,
  feedbackResponses: CoreFeedbackResponse[],
  openai: OpenAI
): Promise<OpenAIPerspectiveSection> {
  const formattedFeedback = feedbackResponses.map(f => `
Relationship: ${f.relationship.replace('_', ' ')}
Strengths: "${f.strengths}"
Areas for Improvement: "${f.areas_for_improvement}"
`).join('\n');

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Analyze feedback for ${relationship} perspective. You must evaluate all 7 required competencies and provide specific evidence.

Required Competencies:
1. Leadership & Influence
2. Execution & Accountability
3. Collaboration & Communication
4. Innovation & Problem-Solving
5. Growth & Development
6. Technical/Functional Expertise
7. Emotional Intelligence & Culture Fit

Confidence Level Rules:
- Confidence levels are determined PER COMPETENCY based on specific evidence:
  - "low": 0-1 pieces of specific evidence for this competency
  - "medium": 2-3 pieces of specific evidence for this competency
  - "high": 4+ pieces of specific evidence for this competency
- Evidence must be directly related to the competency being evaluated
- General feedback that doesn't specifically address a competency should not count as evidence
- Even if there are many reviewers, if few mention a specific competency, confidence should be low

Return a JSON object with:
- key_insights: Array of unique insights from this perspective
- competency_scores: Array of competency evaluations, each containing:
  - name: Competency name (from list above)
  - score: Number 1-5
  - confidence: "low" | "medium" | "high"
  - description: String explaining the score and evidence
  - evidenceCount: Number of specific evidence pieces
  - evidenceQuotes: Array of supporting quotes (REQUIRED for non-zero scores)`
      },
      {
        role: "user",
        content: `Analyze these ${relationship} feedback responses:

${formattedFeedback}`
      }
    ],
    temperature: 0.3,
    max_tokens: 2000,
    response_format: { type: "json_object" }
  });

  return JSON.parse(completion.choices[0].message.content!);
}

export async function analyzeAggregatePatterns(
  feedbackResponses: CoreFeedbackResponse[],
  openai: OpenAI
): Promise<OpenAIAggregateSection> {
  const formattedFeedback = feedbackResponses.map(f => `
Relationship: ${f.relationship.replace('_', ' ')}
Strengths: "${f.strengths}"
Areas for Improvement: "${f.areas_for_improvement}"
`).join('\n');

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Analyze overall patterns across all feedback. You must evaluate all 7 required competencies and provide specific evidence.

Required Competencies:
1. Leadership & Influence
2. Execution & Accountability
3. Collaboration & Communication
4. Innovation & Problem-Solving
5. Growth & Development
6. Technical/Functional Expertise
7. Emotional Intelligence & Culture Fit

Confidence Level Rules:
- Confidence levels are determined PER COMPETENCY based on specific evidence:
  - "low": 0-1 pieces of specific evidence for this competency
  - "medium": 2-3 pieces of specific evidence for this competency
  - "high": 4+ pieces of specific evidence for this competency
- Evidence must be directly related to the competency being evaluated
- General feedback that doesn't specifically address a competency should not count as evidence
- Even if there are many reviewers, if few mention a specific competency, confidence should be low

Return a JSON object with:
- themes: Array of key themes identified across all perspectives
- competency_scores: Array of competency evaluations, each containing:
  - name: Competency name (from list above)
  - score: Number 1-5
  - confidence: "low" | "medium" | "high"
  - description: String explaining the score and evidence
  - evidenceCount: Number of specific evidence pieces
  - evidenceQuotes: Array of supporting quotes (REQUIRED for non-zero scores)`
      },
      {
        role: "user",
        content: `Analyze these feedback responses for overall patterns:

${formattedFeedback}`
      }
    ],
    temperature: 0.3,
    max_tokens: 2000,
    response_format: { type: "json_object" }
  });

  return JSON.parse(completion.choices[0].message.content!);
} 