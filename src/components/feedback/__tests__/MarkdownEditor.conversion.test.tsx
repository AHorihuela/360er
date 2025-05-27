import { describe, it, expect } from 'vitest';
import MarkdownIt from 'markdown-it';

// Import the conversion logic from MarkdownEditor
// We'll test the conversion algorithm directly
describe('MarkdownEditor HTML-to-Markdown Conversion', () => {
  const md = new MarkdownIt({
    html: false,
    breaks: true,
    linkify: true,
  });

  // Helper function that mimics the FIXED conversion logic from MarkdownEditor
  function convertHtmlToMarkdown(html: string): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    let markdown = '';
    
    const processNode = (node: Node, isInsideList = false) => {
      if (node.nodeType === Node.TEXT_NODE) {
        // Clean up whitespace from text nodes
        let text = node.textContent || '';
        // Remove excessive whitespace and normalize
        text = text.replace(/\s+/g, ' ');
        if (text.trim()) {
          // Preserve leading/trailing spaces if they're meaningful
          if (text.startsWith(' ') && markdown && !markdown.endsWith(' ')) {
            markdown += ' ';
          }
          markdown += text.trim();
          if (text.endsWith(' ')) {
            markdown += ' ';
          }
        }
        return;
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tagName = element.tagName.toLowerCase();
        
        // Handle opening tags
        switch (tagName) {
          case 'h1':
            if (markdown && !markdown.endsWith('\n')) {
              markdown += '\n';
            }
            markdown += '# ';
            break;
          case 'h2':
            if (markdown && !markdown.endsWith('\n')) {
              markdown += '\n';
            }
            markdown += '## ';
            break;
          case 'h3':
            if (markdown && !markdown.endsWith('\n')) {
              markdown += '\n';
            }
            markdown += '### ';
            break;
          case 'h4':
            if (markdown && !markdown.endsWith('\n')) {
              markdown += '\n';
            }
            markdown += '#### ';
            break;
          case 'h5':
            if (markdown && !markdown.endsWith('\n')) {
              markdown += '\n';
            }
            markdown += '##### ';
            break;
          case 'h6':
            if (markdown && !markdown.endsWith('\n')) {
              markdown += '\n';
            }
            markdown += '###### ';
            break;
          case 'p':
            if (markdown && !markdown.endsWith('\n')) {
              markdown += '\n\n';
            }
            break;
          case 'ul':
          case 'ol':
            if (markdown && !markdown.endsWith('\n')) {
              markdown += '\n';
            }
            break;
          case 'li':
            if (element.parentElement?.tagName.toLowerCase() === 'ul') {
              markdown += '- ';
            } else if (element.parentElement?.tagName.toLowerCase() === 'ol') {
              const index = Array.from(element.parentElement.children).indexOf(element) + 1;
              markdown += `${index}. `;
            }
            break;
          case 'strong':
          case 'b':
            markdown += '**';
            break;
          case 'em':
          case 'i':
            markdown += '_';
            break;
          case 'u':
            markdown += '__';
            break;
          case 'br':
            markdown += '\n';
            break;
        }
        
        // Process child nodes
        const isListItem = tagName === 'li';
        Array.from(node.childNodes).forEach(child => processNode(child, isListItem));
        
        // Handle closing tags
        switch (tagName) {
                      case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
              // Always ensure headings end with a newline
              markdown += '\n';
              break;
          case 'strong':
          case 'b':
            markdown += '**';
            break;
          case 'em':
          case 'i':
            markdown += '_';
            break;
          case 'u':
            markdown += '__';
            break;
          case 'li':
            if (!markdown.endsWith('\n')) {
              markdown += '\n';
            }
            break;
          case 'p':
            if (!markdown.endsWith('\n')) {
              markdown += '\n';
            }
            break;
        }
      }
    };
    
    Array.from(tempDiv.childNodes).forEach(node => processNode(node));
    
    // Clean up the final markdown output
    markdown = markdown
      .replace(/\n{3,}/g, '\n\n') // Replace 3+ newlines with 2
      .replace(/[ \t]+\n/g, '\n') // Remove trailing spaces before newlines
      .replace(/\n[ \t]+/g, '\n') // Remove leading spaces after newlines
      .replace(/[ \t]{2,}/g, ' ') // Replace multiple spaces with single space
      .replace(/^\s+/g, ''); // Trim start whitespace only
    
    // Ensure proper line endings for headings and lists
    if (markdown && !markdown.endsWith('\n')) {
      // Add newline if content ends with heading markers or list items
      if (markdown.match(/##+\s*$/) || 
          markdown.includes('- ') || 
          markdown.includes('1. ') || 
          markdown.includes('2. ')) {
        markdown += '\n';
      }
    }
    
    // Final cleanup: remove any trailing spaces but preserve final newline if present
    markdown = markdown.replace(/[ \t]+$/g, '');
    
    return markdown;
  }

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
}); 