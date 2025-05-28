import { describe, it, expect } from 'vitest';
import MarkdownIt from 'markdown-it';
import { cleanMarkdownContent } from '../../../utils/report';
import { convertHtmlToMarkdown } from '../markdown-conversion';

// Import the conversion logic from MarkdownEditor
// We'll test the conversion algorithm directly
describe('MarkdownEditor HTML-to-Markdown Conversion', () => {
  const md = new MarkdownIt({
    html: false,
    breaks: true,
    linkify: true,
  });

  it('prevents line jumping between headings', () => {
    const html = '<h2>Summary Report</h2><h3>Key Findings</h3><p>Important content</p>';
    const result = convertHtmlToMarkdown(html);
    
    // Each heading should be on its own line
    expect(result).toMatch(/## Summary Report\s*\n/);
    expect(result).toMatch(/### Key Findings\s*\n/);
    
    // Should not merge headings
    expect(result).not.toMatch(/## Summary Report.*### Key Findings/);
  });

  it('handles bullet points without merging into headings', () => {
    const html = `
      <h2>Key Strengths</h2>
      <ul>
        <li>Leadership excellence</li>
        <li>Strong communication</li>
      </ul>
    `;
    
    const result = convertHtmlToMarkdown(html);
    
    // Should have proper heading
    expect(result).toMatch(/## Key Strengths\s*\n/);
    
    // Should have bullet points
    expect(result).toMatch(/- Leadership excellence\s*\n/);
    expect(result).toMatch(/- Strong communication\s*\n/);
    
    // Bullet points should not be part of heading
    expect(result).not.toMatch(/## Key Strengths.*Leadership excellence/);
  });

  it('maintains proper line breaks for complex content', () => {
    const html = `
      <h1>Executive Summary</h1>
      <h2>Performance Overview</h2>
      <p>The employee demonstrates strong capabilities.</p>
      <h3>Technical Skills</h3>
      <ol>
        <li>Problem solving</li>
        <li>Modern technologies</li>
      </ol>
      <h3>Leadership Qualities</h3>
      <ul>
        <li>Mentors team members</li>
        <li>Facilitates meetings</li>
      </ul>
    `;
    
    const result = convertHtmlToMarkdown(html);
    
    // Verify structure preservation
    expect(result).toMatch(/# Executive Summary\s*\n/);
    expect(result).toMatch(/## Performance Overview\s*\n/);
    expect(result).toMatch(/### Technical Skills\s*\n/);
    expect(result).toMatch(/### Leadership Qualities\s*\n/);
    
    // Verify content integrity
    expect(result).toMatch(/1\. Problem solving\s*\n/);
    expect(result).toMatch(/2\. Modern technologies\s*\n/);
    expect(result).toMatch(/- Mentors team members\s*\n/);
    expect(result).toMatch(/- Facilitates meetings\s*\n/);
    
    // Ensure no line merging
    expect(result).not.toMatch(/# Executive Summary.*## Performance Overview/);
    expect(result).not.toMatch(/## Performance Overview.*### Technical Skills/);
    expect(result).not.toMatch(/### Technical Skills.*### Leadership Qualities/);
  });

  it('handles markdown-to-html and back conversion correctly', () => {
    const originalMarkdown = `# AI Report

## Key Strengths
- **Leadership excellence** in team management
- Strong analytical abilities

## Areas for Development
- Time management skills
- Delegation practices

The employee shows great potential.`;

    // Convert to HTML using markdown-it
    const html = md.render(originalMarkdown);
    
    // Convert back to markdown using our logic
    const resultMarkdown = convertHtmlToMarkdown(html);
    
    // Should preserve structure
    expect(resultMarkdown).toMatch(/# AI Report/);
    expect(resultMarkdown).toMatch(/## Key Strengths/);
    expect(resultMarkdown).toMatch(/## Areas for Development/);
    expect(resultMarkdown).toMatch(/- \*\*Leadership excellence\*\*/);
    expect(resultMarkdown).toMatch(/- Time management skills/);
    
    // Should not have merged lines
    expect(resultMarkdown).not.toMatch(/# AI Report.*## Key Strengths/);
    expect(resultMarkdown).not.toMatch(/## Key Strengths.*- Leadership/);
  });

  it('handles edge cases with empty content and formatting', () => {
    const html = '<h2>Empty Section</h2><h3></h3><p></p>';
    const result = convertHtmlToMarkdown(html);
    
    expect(result).toMatch(/## Empty Section/);
    expect(result).toMatch(/###\s*\n/); // Empty h3 should still create proper markdown
  });

  it('preserves formatting markers correctly', () => {
    const html = '<p>This is <strong>bold</strong> and <em>italic</em> text.</p>';
    const result = convertHtmlToMarkdown(html);
    
    expect(result).toMatch(/\*\*bold\*\*/);
    expect(result).toMatch(/_italic_/);
    expect(result).toContain('This is **bold** and _italic_ text.');
  });

  it('handles mixed list types without merging', () => {
    const html = `
      <h3>Ordered Items</h3>
      <ol>
        <li>First item</li>
        <li>Second item</li>
      </ol>
      <h3>Unordered Items</h3>
      <ul>
        <li>Bullet one</li>
        <li>Bullet two</li>
      </ul>
    `;
    
    const result = convertHtmlToMarkdown(html);
    
    expect(result).toMatch(/### Ordered Items\s*\n/);
    expect(result).toMatch(/### Unordered Items\s*\n/);
    expect(result).toMatch(/1\. First item\s*\n/);
    expect(result).toMatch(/2\. Second item\s*\n/);
    expect(result).toMatch(/- Bullet one\s*\n/);
    expect(result).toMatch(/- Bullet two\s*\n/);
    
    // Ensure no merging between sections
    expect(result).not.toMatch(/### Ordered Items.*### Unordered Items/);
  });

  it('prevents bullet points from becoming headings after edit and refresh', () => {
    // This test simulates the exact issue reported by the user:
    // 1. User has content with H2 heading followed by bullet points
    // 2. User edits the H2 heading (adds a letter)
    // 3. Content gets saved and reloaded
    // 4. Bullet points should NOT become H2 headings
    
    const originalMarkdown = `## Key Strengths

- **Leadership excellence** in team management
- Strong analytical abilities
- Effective communication skills`;

    // Simulate user editing the heading (adding a letter)
    const editedMarkdown = `## Key Strengthss

- **Leadership excellence** in team management
- Strong analytical abilities
- Effective communication skills`;

    // Convert to HTML (simulates what happens in the editor)
    const html = md.render(editedMarkdown);
    
    // Convert back to markdown (simulates save/reload cycle)
    const resultMarkdown = convertHtmlToMarkdown(html);
    
    // Verify the structure is preserved
    expect(resultMarkdown).toMatch(/## Key Strengthss/);
    expect(resultMarkdown).toMatch(/- \*\*Leadership excellence\*\*/);
    expect(resultMarkdown).toMatch(/- Strong analytical abilities/);
    expect(resultMarkdown).toMatch(/- Effective communication skills/);
    
    // Most importantly: bullet points should NOT become headings
    expect(resultMarkdown).not.toMatch(/## \*\*Leadership excellence\*\*/);
    expect(resultMarkdown).not.toMatch(/## Strong analytical abilities/);
    expect(resultMarkdown).not.toMatch(/## Effective communication skills/);
    
    // Verify proper structure preservation
    const lines = resultMarkdown.split('\n');
    const headingIndex = lines.findIndex(line => line.includes('## Key Strengthss'));
    const firstBulletIndex = lines.findIndex(line => line.includes('- **Leadership excellence**'));
    
    // Heading and bullets should be on different lines and in correct order
    expect(firstBulletIndex).toBeGreaterThan(headingIndex);
    expect(firstBulletIndex - headingIndex).toBeGreaterThanOrEqual(1);
  });

  it('preserves bullet points after cleanMarkdownContent processing (simulates save/reload)', () => {
    // This test reproduces the exact issue: bullet points losing formatting after save/reload
    const originalMarkdown = `## Key Strengths

- **Leadership excellence** in team management
- Strong analytical abilities
- Effective communication skills

## Areas for Development

- Time management skills
- Delegation practices`;

    // Simulate the save/reload cycle that happens in useAIReportManagement
    const cleanedContent = cleanMarkdownContent(originalMarkdown);
    
    // Convert to HTML (simulates what happens in the editor)
    const html = md.render(cleanedContent);
    
    // Convert back to markdown (simulates the editor's conversion process)
    const resultMarkdown = convertHtmlToMarkdown(html);
    
    // Verify the structure is preserved
    expect(resultMarkdown).toMatch(/## Key Strengths/);
    expect(resultMarkdown).toMatch(/## Areas for Development/);
    expect(resultMarkdown).toMatch(/- \*\*Leadership excellence\*\*/);
    expect(resultMarkdown).toMatch(/- Strong analytical abilities/);
    expect(resultMarkdown).toMatch(/- Time management skills/);
    
    // Most importantly: bullet points should NOT become plain text
    expect(resultMarkdown).not.toMatch(/\*\*Leadership excellence\*\* in team management\n\nStrong analytical abilities/);
    expect(resultMarkdown).not.toMatch(/Time management skills\n\nDelegation practices/);
    
    // Verify proper spacing is maintained
    expect(resultMarkdown).toMatch(/## Key Strengths\n\n- \*\*Leadership excellence\*\*/);
    expect(resultMarkdown).toMatch(/## Areas for Development\n\n- Time management skills/);
  });

  it('prevents double content cleaning during save operations', () => {
    // This test verifies that content is only cleaned once, not twice
    const originalMarkdown = `## Key Strengths

- **Leadership excellence** in team management
- Strong analytical abilities
- Effective communication skills

## Areas for Development

- Time management skills
- Delegation practices`;

    // Simulate the first cleaning (in handleReportChange)
    const firstClean = cleanMarkdownContent(originalMarkdown);
    
    // Simulate the second cleaning (what used to happen in debouncedSave)
    const secondClean = cleanMarkdownContent(firstClean);
    
    // The content should be identical after both cleanings
    // If double-cleaning was corrupting content, these would be different
    expect(firstClean).toBe(secondClean);
    
    // Verify the structure is still intact
    expect(firstClean).toMatch(/## Key Strengths/);
    expect(firstClean).toMatch(/## Areas for Development/);
    expect(firstClean).toMatch(/- \*\*Leadership excellence\*\*/);
    expect(firstClean).toMatch(/- Strong analytical abilities/);
    expect(firstClean).toMatch(/- Time management skills/);
  });
}); 