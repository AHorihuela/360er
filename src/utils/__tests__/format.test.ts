import { describe, it, expect } from 'vitest';
import { formatScore, formatRawScore } from '../format';

describe('Format Utils', () => {
  describe('formatScore', () => {
    it('should format score to one decimal place by default', () => {
      expect(formatScore(3.7)).toBe('3.7');
      expect(formatScore(4.0)).toBe('4.0');
      expect(formatScore(2.25)).toBe('2.3'); // Rounds to nearest decimal
      expect(formatScore(1.95)).toBe('2.0'); // Rounds up
    });

    it('should include denominator when requested', () => {
      expect(formatScore(3.7, true)).toBe('3.7/5.0');
      expect(formatScore(4.0, true)).toBe('4.0/5.0');
      expect(formatScore(2.25, true)).toBe('2.3/5.0');
    });

    it('should use custom max score when provided', () => {
      expect(formatScore(3.7, true, 10)).toBe('3.7/10.0');
      expect(formatScore(7.5, true, 10)).toBe('7.5/10.0');
      expect(formatScore(2.0, true, 3)).toBe('2.0/3.0');
    });

    it('should handle edge cases', () => {
      expect(formatScore(0)).toBe('0.0');
      expect(formatScore(5)).toBe('5.0');
      expect(formatScore(0, true)).toBe('0.0/5.0');
      expect(formatScore(5, true)).toBe('5.0/5.0');
    });

    it('should handle fractional rounding correctly', () => {
      expect(formatScore(3.14159)).toBe('3.1'); // Rounds down
      expect(formatScore(3.15)).toBe('3.2'); // Rounds up
      expect(formatScore(3.149)).toBe('3.1'); // Rounds down
      expect(formatScore(3.151)).toBe('3.2'); // Rounds up
    });

    it('should handle negative scores', () => {
      expect(formatScore(-1.5)).toBe('-1.5');
      expect(formatScore(-2.75)).toBe('-2.8');
      expect(formatScore(-1.5, true)).toBe('-1.5/5.0');
    });

    it('should handle very small numbers', () => {
      expect(formatScore(0.01)).toBe('0.0');
      expect(formatScore(0.05)).toBe('0.1');
      expect(formatScore(0.04)).toBe('0.0');
      expect(formatScore(0.06)).toBe('0.1');
    });

    it('should handle very large numbers', () => {
      expect(formatScore(100.567)).toBe('100.6');
      expect(formatScore(999.95)).toBe('1000.0');
      expect(formatScore(100.567, true, 200)).toBe('100.6/200.0');
    });

    it('should handle decimal precision edge cases', () => {
      expect(formatScore(2.999)).toBe('3.0');
      expect(formatScore(2.949)).toBe('2.9');
      expect(formatScore(2.951)).toBe('3.0');
    });
  });

  describe('formatRawScore', () => {
    it('should format score to one decimal place', () => {
      expect(formatRawScore(3.7)).toBe('3.7');
      expect(formatRawScore(4.0)).toBe('4.0');
      expect(formatRawScore(2.25)).toBe('2.3');
    });

    it('should handle edge cases', () => {
      expect(formatRawScore(0)).toBe('0.0');
      expect(formatRawScore(5)).toBe('5.0');
    });

    it('should handle fractional rounding correctly', () => {
      expect(formatRawScore(3.14159)).toBe('3.1');
      expect(formatRawScore(3.15)).toBe('3.2');
      expect(formatRawScore(3.149)).toBe('3.1');
      expect(formatRawScore(3.151)).toBe('3.2');
    });

    it('should handle negative scores', () => {
      expect(formatRawScore(-1.5)).toBe('-1.5');
      expect(formatRawScore(-2.75)).toBe('-2.8');
    });

    it('should handle very small numbers', () => {
      expect(formatRawScore(0.01)).toBe('0.0');
      expect(formatRawScore(0.05)).toBe('0.1');
      expect(formatRawScore(0.04)).toBe('0.0');
      expect(formatRawScore(0.06)).toBe('0.1');
    });

    it('should handle very large numbers', () => {
      expect(formatRawScore(100.567)).toBe('100.6');
      expect(formatRawScore(999.95)).toBe('1000.0');
    });

    it('should never include denominator', () => {
      const result = formatRawScore(3.7);
      expect(result).not.toContain('/');
      expect(result).toBe('3.7');
    });

    it('should match formatScore without denominator', () => {
      const testScores = [0, 1.5, 2.25, 3.14159, 4.99, 5.0];
      
      testScores.forEach(score => {
        expect(formatRawScore(score)).toBe(formatScore(score, false));
      });
    });

    it('should handle decimal precision consistently', () => {
      expect(formatRawScore(2.999)).toBe('3.0');
      expect(formatRawScore(2.949)).toBe('2.9');
      expect(formatRawScore(2.951)).toBe('3.0');
    });
  });

  describe('Function Consistency', () => {
    it('should have consistent rounding between formatScore and formatRawScore', () => {
      const testScores = [
        0.0, 0.1, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95,
        1.0, 1.1, 1.15, 1.25, 1.35, 1.45, 1.55, 1.65, 1.75, 1.85, 1.95,
        2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0
      ];

      testScores.forEach(score => {
        const rawFormatted = formatRawScore(score);
        const scoreFormatted = formatScore(score, false);
        expect(rawFormatted).toBe(scoreFormatted);
      });
    });

    it('should maintain precision in denominator formatting', () => {
      const maxScores = [1, 3, 5, 10, 100];
      
      maxScores.forEach(maxScore => {
        const result = formatScore(3.7, true, maxScore);
        expect(result).toBe(`3.7/${maxScore}.0`);
      });
    });
  });
});