import { describe, it, expect } from 'vitest';
import {
  normalizeRelationship,
  processCompetencyScores,
  type ScoreInput,
  type RelationshipType
} from '../competencyScoring';
import { type RelationshipType as BaseRelationshipType } from '@/types/feedback/base';

describe('Competency Scoring Utils', () => {
  describe('normalizeRelationship', () => {
    it('should normalize senior_colleague to senior', () => {
      expect(normalizeRelationship('senior_colleague')).toBe('senior');
    });

    it('should normalize equal_colleague to peer', () => {
      expect(normalizeRelationship('equal_colleague')).toBe('peer');
    });

    it('should normalize junior_colleague to junior', () => {
      expect(normalizeRelationship('junior_colleague')).toBe('junior');
    });

    it('should default unknown relationships to peer', () => {
      expect(normalizeRelationship('unknown_type' as BaseRelationshipType)).toBe('peer');
    });
  });

  describe('processCompetencyScores', () => {
    describe('Basic Score Processing', () => {
      it('should return null for empty scores array', () => {
        const result = processCompetencyScores([], 'Leadership');
        expect(result).toBeNull();
      });

      it('should calculate simple weighted average for single score', () => {
        const scores: ScoreInput[] = [
          { score: 4, relationship: 'senior_colleague', evidence: 'Strong leadership skills' }
        ];

        const result = processCompetencyScores(scores, 'Leadership');

        expect(result).not.toBeNull();
        expect(result!.weightedAverage).toBe(4);
        expect(result!.rawAverage).toBe(4);
        expect(result!.evidenceQuotes).toEqual(['Strong leadership skills']);
      });

      it('should calculate weighted average for multiple scores', () => {
        const scores: ScoreInput[] = [
          { score: 5, relationship: 'senior_colleague', evidence: 'Excellent leadership' },
          { score: 4, relationship: 'equal_colleague', evidence: 'Good collaboration' },
          { score: 3, relationship: 'junior_colleague', evidence: 'Supportive mentor' }
        ];

        const result = processCompetencyScores(scores, 'Leadership');

        expect(result).not.toBeNull();
        expect(result!.rawAverage).toBe((5 + 4 + 3) / 3);
        // Weighted should be different due to RELATIONSHIP_WEIGHTS
        expect(result!.weightedAverage).not.toBe(result!.rawAverage);
        expect(result!.evidenceQuotes).toHaveLength(3);
      });
    });

    describe('Relationship Breakdown', () => {
      it('should group scores by relationship type correctly', () => {
        const scores: ScoreInput[] = [
          { score: 5, relationship: 'senior_colleague' },
          { score: 4, relationship: 'senior_colleague' },
          { score: 3, relationship: 'equal_colleague' },
          { score: 2, relationship: 'junior_colleague' }
        ];

        const result = processCompetencyScores(scores, 'Leadership');

        expect(result!.relationshipBreakdown.senior).toBe(4.5); // (5+4)/2
        expect(result!.relationshipBreakdown.peer).toBe(3);     // 3/1
        expect(result!.relationshipBreakdown.junior).toBe(2);   // 2/1
        expect(result!.relationshipBreakdown.aggregate).toBe(0); // Not used in this context
      });

      it('should handle missing relationship types', () => {
        const scores: ScoreInput[] = [
          { score: 4, relationship: 'senior_colleague' }
        ];

        const result = processCompetencyScores(scores, 'Leadership');

        expect(result!.relationshipBreakdown.senior).toBe(4);
        expect(result!.relationshipBreakdown.peer).toBe(0);
        expect(result!.relationshipBreakdown.junior).toBe(0);
      });
    });

    describe('Statistics Calculation', () => {
      it('should calculate correct statistics for score distribution', () => {
        const scores: ScoreInput[] = [
          { score: 1, relationship: 'senior_colleague' },
          { score: 2, relationship: 'equal_colleague' },
          { score: 3, relationship: 'junior_colleague' },
          { score: 4, relationship: 'senior_colleague' },
          { score: 5, relationship: 'equal_colleague' }
        ];

        const result = processCompetencyScores(scores, 'Leadership');

        expect(result!.stats.min).toBe(1);
        expect(result!.stats.max).toBe(5);
        expect(result!.stats.median).toBe(3);
        expect(result!.scoreDistribution).toEqual([1, 2, 3, 4, 5]);
        expect(result!.stats.stdDev).toBeGreaterThan(0);
      });

      it('should calculate mode correctly', () => {
        const scores: ScoreInput[] = [
          { score: 3, relationship: 'senior_colleague' },
          { score: 4, relationship: 'equal_colleague' },
          { score: 4, relationship: 'junior_colleague' },
          { score: 4, relationship: 'senior_colleague' },
          { score: 5, relationship: 'equal_colleague' }
        ];

        const result = processCompetencyScores(scores, 'Leadership');

        expect(result!.stats.mode).toBe(4); // Most frequent score
      });

      it('should handle single score statistics', () => {
        const scores: ScoreInput[] = [
          { score: 3, relationship: 'senior_colleague' }
        ];

        const result = processCompetencyScores(scores, 'Leadership');

        expect(result!.stats.min).toBe(3);
        expect(result!.stats.max).toBe(3);
        expect(result!.stats.median).toBe(3);
        expect(result!.stats.mode).toBe(3);
        expect(result!.stats.stdDev).toBe(0);
      });
    });

    describe('Outlier Detection', () => {
      it('should identify outliers using z-score', () => {
        const scores: ScoreInput[] = [
          { score: 4, relationship: 'senior_colleague' },
          { score: 4, relationship: 'equal_colleague' },
          { score: 4, relationship: 'junior_colleague' },
          { score: 1, relationship: 'senior_colleague' }, // Outlier
          { score: 4, relationship: 'equal_colleague' }
        ];

        const result = processCompetencyScores(scores, 'Leadership');

        expect(result!.outliers.length).toBeGreaterThan(0);
        const outlierScores = result!.outliers.map(o => o.score);
        expect(outlierScores).toContain(1);
      });

      it('should not identify outliers in normal distribution', () => {
        const scores: ScoreInput[] = [
          { score: 3, relationship: 'senior_colleague' },
          { score: 4, relationship: 'equal_colleague' },
          { score: 4, relationship: 'junior_colleague' },
          { score: 4, relationship: 'senior_colleague' },
          { score: 5, relationship: 'equal_colleague' }
        ];

        const result = processCompetencyScores(scores, 'Leadership');

        expect(result!.outliers.length).toBe(0);
      });
    });

    describe('Confidence Level Calculation', () => {
      it('should calculate confidence based on number of scores', () => {
        const scores1: ScoreInput[] = [
          { score: 4, relationship: 'senior_colleague' }
        ];

        const scores10: ScoreInput[] = Array(10).fill(null).map((_, i) => ({
          score: 4,
          relationship: 'senior_colleague' as BaseRelationshipType
        }));

        const result1 = processCompetencyScores(scores1, 'Leadership');
        const result10 = processCompetencyScores(scores10, 'Leadership');

        expect(result1!.confidenceLevel).toBeLessThan(result10!.confidenceLevel);
        expect(result10!.confidenceLevel).toBe(1); // 10+ scores = max confidence
      });

      it('should cap confidence at 1.0', () => {
        const scores: ScoreInput[] = Array(20).fill(null).map(() => ({
          score: 4,
          relationship: 'senior_colleague' as BaseRelationshipType
        }));

        const result = processCompetencyScores(scores, 'Leadership');

        expect(result!.confidenceLevel).toBe(1);
      });
    });

    describe('Multi-Employee Mode', () => {
      it('should use equal weights when isMultiEmployee is true', () => {
        const scores: ScoreInput[] = [
          { score: 5, relationship: 'senior_colleague' },
          { score: 3, relationship: 'junior_colleague' }
        ];

        const singleEmployeeResult = processCompetencyScores(scores, 'Leadership', false);
        const multiEmployeeResult = processCompetencyScores(scores, 'Leadership', true);

        // Multi-employee should weight equally, single-employee should use relationship weights
        expect(multiEmployeeResult!.weightedAverage).toBe(4); // (5+3)/2
        expect(singleEmployeeResult!.weightedAverage).not.toBe(4);
      });
    });

    describe('Evidence Handling', () => {
      it('should collect evidence quotes from all scores', () => {
        const scores: ScoreInput[] = [
          { score: 4, relationship: 'senior_colleague', evidence: 'Evidence 1' },
          { score: 3, relationship: 'equal_colleague', evidence: 'Evidence 2' },
          { score: 5, relationship: 'junior_colleague' } // No evidence
        ];

        const result = processCompetencyScores(scores, 'Leadership');

        expect(result!.evidenceQuotes).toEqual(['Evidence 1', 'Evidence 2']);
      });

      it('should handle scores without evidence', () => {
        const scores: ScoreInput[] = [
          { score: 4, relationship: 'senior_colleague' },
          { score: 3, relationship: 'equal_colleague' }
        ];

        const result = processCompetencyScores(scores, 'Leadership');

        expect(result!.evidenceQuotes).toEqual([]);
      });
    });

    describe('Edge Cases', () => {
      it('should handle undefined scores input', () => {
        const result = processCompetencyScores(undefined as any, 'Leadership');
        expect(result).toBeNull();
      });

      it('should handle null scores input', () => {
        const result = processCompetencyScores(null as any, 'Leadership');
        expect(result).toBeNull();
      });

      it('should handle very large score arrays', () => {
        const scores: ScoreInput[] = Array(1000).fill(null).map((_, i) => ({
          score: (i % 5) + 1, // Scores 1-5 cyclically
          relationship: ['senior_colleague', 'equal_colleague', 'junior_colleague'][i % 3] as BaseRelationshipType
        }));

        const result = processCompetencyScores(scores, 'Leadership');

        expect(result).not.toBeNull();
        expect(result!.scoreDistribution).toHaveLength(1000);
        expect(result!.confidenceLevel).toBe(1);
      });

      it('should handle all zero scores', () => {
        const scores: ScoreInput[] = [
          { score: 0, relationship: 'senior_colleague' },
          { score: 0, relationship: 'equal_colleague' },
          { score: 0, relationship: 'junior_colleague' }
        ];

        const result = processCompetencyScores(scores, 'Leadership');

        expect(result!.weightedAverage).toBe(0);
        expect(result!.rawAverage).toBe(0);
        expect(result!.stats.stdDev).toBe(0);
      });

      it('should handle negative scores', () => {
        const scores: ScoreInput[] = [
          { score: -1, relationship: 'senior_colleague' },
          { score: 2, relationship: 'equal_colleague' }
        ];

        const result = processCompetencyScores(scores, 'Leadership');

        expect(result).not.toBeNull();
        expect(result!.rawAverage).toBe(0.5);
        expect(result!.stats.min).toBe(-1);
      });

      it('should handle fractional scores', () => {
        const scores: ScoreInput[] = [
          { score: 3.5, relationship: 'senior_colleague' },
          { score: 4.2, relationship: 'equal_colleague' }
        ];

        const result = processCompetencyScores(scores, 'Leadership');

        expect(result).not.toBeNull();
        expect(result!.rawAverage).toBeCloseTo(3.85);
      });
    });

    describe('Return Value Structure', () => {
      it('should return complete ProcessedScore structure', () => {
        const scores: ScoreInput[] = [
          { score: 4, relationship: 'senior_colleague', evidence: 'Good work' }
        ];

        const result = processCompetencyScores(scores, 'Leadership');

        expect(result).toHaveProperty('weightedAverage');
        expect(result).toHaveProperty('rawAverage');
        expect(result).toHaveProperty('confidenceLevel');
        expect(result).toHaveProperty('outliers');
        expect(result).toHaveProperty('relationshipBreakdown');
        expect(result).toHaveProperty('scoreDistribution');
        expect(result).toHaveProperty('stats');
        expect(result).toHaveProperty('evidenceQuotes');

        expect(result!.stats).toHaveProperty('min');
        expect(result!.stats).toHaveProperty('max');
        expect(result!.stats).toHaveProperty('median');
        expect(result!.stats).toHaveProperty('mode');
        expect(result!.stats).toHaveProperty('stdDev');

        expect(result!.relationshipBreakdown).toHaveProperty('senior');
        expect(result!.relationshipBreakdown).toHaveProperty('peer');
        expect(result!.relationshipBreakdown).toHaveProperty('junior');
        expect(result!.relationshipBreakdown).toHaveProperty('aggregate');
      });

      it('should return arrays with correct types', () => {
        const scores: ScoreInput[] = [
          { score: 4, relationship: 'senior_colleague', evidence: 'Evidence' }
        ];

        const result = processCompetencyScores(scores, 'Leadership');

        expect(Array.isArray(result!.outliers)).toBe(true);
        expect(Array.isArray(result!.scoreDistribution)).toBe(true);
        expect(Array.isArray(result!.evidenceQuotes)).toBe(true);
        expect(typeof result!.weightedAverage).toBe('number');
        expect(typeof result!.confidenceLevel).toBe('number');
      });
    });
  });
});