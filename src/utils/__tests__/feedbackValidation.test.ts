import { describe, it, expect } from 'vitest';
import { validateFeedback } from '../feedbackValidation';

describe('Feedback Validation Utils', () => {
  describe('validateFeedback', () => {
    describe('Length Requirements', () => {
      it('should reject feedback shorter than minimum when length requirements shown', () => {
        const shortText = 'Too short';
        const result = validateFeedback(shortText, true);

        expect(result.isValid).toBe(false);
        expect(result.message).toContain('Please provide at least 100 characters');
        expect(result.message).toContain(`currently ${shortText.length}`);
        expect(result.showLengthWarning).toBe(true);
      });

      it('should reject feedback with too few words when length requirements shown', () => {
        const fewWordsText = 'One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen';
        const result = validateFeedback(fewWordsText, true);

        expect(result.isValid).toBe(false);
        expect(result.message).toContain('Please provide at least 20 words');
        expect(result.showLengthWarning).toBe(true);
      });

      it('should accept feedback longer than previous 2000 character limit', () => {
        // Create text with enough words (20+) and over 2000 characters - should now be accepted
        const longWord = 'comprehensive';
        const longText = Array(200).fill(longWord).join(' '); // 200 words, way over 2000 chars
        const result = validateFeedback(longText, true);

        expect(result.isValid).toBe(true);
        expect(result.message).not.toContain('Exceeds maximum length');
        expect(result.showLengthWarning).toBe(true);
      });

      it('should accept valid length feedback when requirements shown', () => {
        const validText = 'This is a comprehensive feedback that meets all the minimum requirements for length and word count. It provides detailed insights about the employee performance and areas for improvement. The feedback is constructive and specific, offering actionable suggestions for professional development.';
        const result = validateFeedback(validText, true);

        expect(result.isValid).toBe(true);
        expect(result.message).toContain('characters');
        expect(result.showLengthWarning).toBe(true);
      });

      it('should not enforce length requirements when showLengthRequirements is false', () => {
        const shortText = 'Short';
        const result = validateFeedback(shortText, false);

        expect(result.isValid).toBe(true);
        expect(result.showLengthWarning).toBe(false);
      });
    });

    describe('Content Quality Validation', () => {
      it('should warn about generic phrases', () => {
        const feedback = 'This employee does a good job and could be better at times. They meets expectations and keep up the good work in most areas.';
        const result = validateFeedback(feedback, false);

        expect(result.isValid).toBe(true);
        expect(result.warnings).toBeDefined();
        expect(result.warnings!).toHaveLength(1);
        expect(result.warnings![0]).toContain('good job');
        expect(result.warnings![0]).toContain('keep up the good work');
        expect(result.warnings![0]).toContain('meets expectations');
      });

      it('should warn about non-constructive language', () => {
        const destructiveText = 'This employee is terrible at their job and never completes tasks on time. They are lazy and incompetent, making them useless to the team. Their performance is awful and hopeless.';
        const result = validateFeedback(destructiveText, true);

        expect(result.isValid).toBe(true);
        expect(result.warnings).toBeDefined();
        expect(result.warnings![0]).toContain('Consider rephrasing to be more constructive');
        expect(result.warnings![0]).toContain('terrible');
        expect(result.warnings![0]).toContain('never');
        expect(result.warnings![0]).toContain('lazy');
        expect(result.warnings![0]).toContain('incompetent');
      });

      it('should warn about poor sentence structure', () => {
        const poorStructureText = 'Employee works hard always on time good communication skills needs improvement in delegation but overall positive attitude excellent technical knowledge';
        const result = validateFeedback(poorStructureText, true);

        expect(result.isValid).toBe(true);
        expect(result.warnings).toBeDefined();
        expect(result.warnings!.some(warning => 
          warning.includes('Consider providing feedback in multiple complete sentences')
        )).toBe(true);
      });

      it('should not warn about sentence structure for short content', () => {
        const shortText = 'Good work';
        const result = validateFeedback(shortText, false);

        expect(result.isValid).toBe(true);
        expect(result.warnings).toBeUndefined();
      });

      it('should combine multiple warnings', () => {
        const problematicText = 'Employee is doing good job but terrible at communication never finishes tasks on time needs improvement overall satisfactory performance could be better keep up good work';
        const result = validateFeedback(problematicText, true);

        expect(result.isValid).toBe(true);
        expect(result.warnings).toBeDefined();
        expect(result.warnings!.length).toBeGreaterThan(1);
        
        const warningsText = result.warnings!.join(' ');
        expect(warningsText).toContain('generic phrases');
        expect(warningsText).toContain('more constructive');
        expect(warningsText).toContain('complete sentences');
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty string', () => {
        const result = validateFeedback('', true);

        expect(result.isValid).toBe(false);
        expect(result.message).toContain('Please provide at least 100 characters');
        expect(result.showLengthWarning).toBe(true);
      });

      it('should handle whitespace-only string', () => {
        const whitespaceOnlyText = '        '; // 8 spaces
        const result = validateFeedback(whitespaceOnlyText, true);

        expect(result.isValid).toBe(false);
        expect(result.message).toContain('Please provide at least 100 characters');
        expect(result.showLengthWarning).toBe(true);
      });

      it('should handle string with only punctuation', () => {
        const punctuationOnlyText = '!@#$%^&*()_+-=[]{}|;:<>?,./'; // 26 punctuation marks
        const result = validateFeedback(punctuationOnlyText, true);

        expect(result.isValid).toBe(false);
        expect(result.message).toContain('Please provide at least 100 characters');
        expect(result.showLengthWarning).toBe(true);
      });

      it('should handle very long valid feedback', () => {
        const longValidText = 'This employee demonstrates exceptional leadership qualities and consistently exceeds expectations in all areas of responsibility. They show remarkable ability to mentor junior team members while maintaining high personal productivity. Their communication skills are outstanding, facilitating effective collaboration across different departments and stakeholder groups. In terms of technical expertise, they possess deep knowledge in their domain and actively contribute to knowledge sharing initiatives. Areas for continued growth include strategic thinking and long-term planning capabilities, which would enhance their readiness for senior leadership roles. Overall, this individual is a valuable asset to the organization and shows strong potential for advancement. They consistently deliver high-quality work while maintaining positive relationships with colleagues and clients. Their problem-solving abilities and innovative approach to challenges make them an essential team member. Moving forward, I recommend providing opportunities for cross-functional projects and leadership development programs to further enhance their skill set and prepare them for increased responsibilities.';
        
        const result = validateFeedback(longValidText, true);

        expect(result.isValid).toBe(true);
        expect(result.warnings).toBeUndefined();
        expect(result.showLengthWarning).toBe(true);
      });

      it('should handle text at exact boundaries', () => {
        // Exactly 100 characters
        const exactMinText = 'A'.repeat(50) + ' ' + 'B'.repeat(49);
        const result1 = validateFeedback(exactMinText, true);
        expect(result1.isValid).toBe(false); // Still need 20 words

        // Text that was previously at the 2000 character limit (now unlimited)
        const longText = 'This is a comprehensive feedback that meets requirements. '.repeat(36);
        const result2 = validateFeedback(longText, true);
        expect(result2.isValid).toBe(true);
      });

      it('should handle case sensitivity in generic phrases', () => {
        const mixedCaseText = 'Employee is doing a GOOD JOB and should Keep Up The Good Work. They MEET EXPECTATIONS but could BE BETTER in some areas and this feedback has enough words to meet the minimum requirements for validation.';
        const result = validateFeedback(mixedCaseText, true);

        expect(result.isValid).toBe(true);
        expect(result.warnings).toBeDefined();
        expect(result.warnings![0]).toContain('generic phrases');
      });

      it('should handle special characters in feedback text', () => {
        const specialCharText = 'Employee performs well in various areas: communication (8/10), technical skills (9/10), and teamwork (7/10). They excel at problem-solving & critical thinking. Areas for improvement include time management & delegation. Overall rating: 8.5/10. Recommendation: promote to senior role within 6-12 months.';
        const result = validateFeedback(specialCharText, true);

        expect(result.isValid).toBe(true);
        // Should not trigger warnings for structured feedback
      });
    });

    describe('Boundary Testing', () => {
      it('should handle exactly 20 words', () => {
        // Create text with exactly 20 words and at least 100 characters
        const exactTwentyWords = 'This comprehensive feedback contains exactly twenty precise words that demonstrate sufficient detailed thoughtful constructive analysis review evaluation assessment summary conclusion';
        const wordCount = exactTwentyWords.split(/\s+/).filter(word => word.length > 0).length;
        expect(wordCount).toBe(20); // Verify word count
        expect(exactTwentyWords.length).toBeGreaterThan(100); // Verify character count
        
        const result = validateFeedback(exactTwentyWords, true);

        expect(result.isValid).toBe(true); // Should pass with exactly 20 words and sufficient characters
      });

      it('should handle 19 words (below minimum)', () => {
        const nineteenWords = 'This feedback contains exactly nineteen words to test the minimum word count validation boundary condition here.';
        const result = validateFeedback(nineteenWords, true);

        expect(result.isValid).toBe(false);
        expect(result.message).toContain('Please provide at least 20 words');
      });

      it('should handle feedback with exactly 100 characters and sufficient words', () => {
        // Create text with exactly 100 chars and 20+ words using short words
        const longWords = 'This is a good team member who can do well at his job and help us all win in our work day goals today yes';
        const words = longWords.substring(0, 100); // Trim to exactly 100
        expect(words.length).toBe(100);
        
        const wordCount = words.split(/\s+/).filter(word => word.length > 0).length;
        expect(wordCount).toBeGreaterThanOrEqual(20);
        
        const result = validateFeedback(words, true);

        expect(result.isValid).toBe(true); // Should pass with exactly 100 characters and 20+ words
        expect(result.showLengthWarning).toBe(true);
      });
    });

    describe('Return Value Structure', () => {
      it('should return correct structure for valid feedback without warnings', () => {
        // Create feedback that meets all criteria without triggering warnings
        const validFeedback = 'This employee demonstrates excellent communication skills. They consistently deliver high-quality work on time. Their collaborative approach helps the team achieve better results. I recommend they continue developing their leadership abilities.';
        const result = validateFeedback(validFeedback, true);

        expect(result.isValid).toBe(true);
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('showLengthWarning', true);
        expect(result.warnings).toBeUndefined(); // Should have no warnings for good feedback
        expect(typeof result.message).toBe('string');
      });

      it('should return correct structure for invalid feedback', () => {
        const invalidText = 'Short';
        const result = validateFeedback(invalidText, true);

        expect(result).toHaveProperty('isValid', false);
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('showLengthWarning', true);
        expect(typeof result.message).toBe('string');
        expect(result.message.length).toBeGreaterThan(0);
      });

      it('should return correct structure for feedback with warnings', () => {
        const warningText = 'This employee is doing a good job and keeps up the good work but needs improvement in various areas and should focus on better performance to meet expectations consistently.';
        const result = validateFeedback(warningText, true);

        expect(result).toHaveProperty('isValid', true);
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('warnings');
        expect(result).toHaveProperty('showLengthWarning', true);
        expect(Array.isArray(result.warnings)).toBe(true);
        expect(result.warnings!.length).toBeGreaterThan(0);
      });
    });
  });
});