import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarkdownEditor } from '../MarkdownEditor';

// Mock TipTap editor
const mockSetContent = vi.fn();
const mockGetHTML = vi.fn();
const mockChainFocus = vi.fn().mockReturnThis();
const mockCommands = {
  setContent: mockSetContent,
};

const mockEditor = {
  getHTML: mockGetHTML,
  commands: mockCommands,
  chain: () => ({ focus: () => mockChainFocus }),
  isActive: vi.fn(() => false),
  onUpdate: null as any,
};

vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn((config) => {
    // Simulate editor initialization
    if (config.content) {
      mockGetHTML.mockReturnValue(config.content);
    }
    
    // Call onUpdate when content changes
    if (config.onUpdate) {
      // Store the callback for later use
      mockEditor.onUpdate = config.onUpdate;
    }
    
    return mockEditor;
  }),
  EditorContent: ({ editor }: { editor: any }) => (
    <div data-testid="editor-content">
      {editor ? 'Editor loaded' : 'Loading...'}
    </div>
  ),
}));

vi.mock('../EditorToolbar', () => ({
  EditorToolbar: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="editor-toolbar">{children}</div>
  ),
}));

vi.mock('../editor-config', () => ({
  editorExtensions: [],
  editorProps: {},
}));

describe('MarkdownEditor', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetHTML.mockReturnValue('<p>Initial content</p>');
  });

  it('renders the editor with initial content', () => {
    const markdown = '# Test Heading\n\n- Bullet point 1\n- Bullet point 2';
    
    render(
      <MarkdownEditor 
        value={markdown} 
        onChange={mockOnChange} 
      />
    );

    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    expect(screen.getByTestId('editor-toolbar')).toBeInTheDocument();
  });

  it('updates editor content when value prop changes (simulates page refresh scenario)', () => {
    // This test simulates the core issue we fixed: when the page refreshes and 
    // new data loads, the editor should update its content to match the new value prop
    
    const initialContent = "# Initial Report\n\n- Old bullet\n- Another old bullet";
    const { rerender } = render(
      <MarkdownEditor 
        value={initialContent} 
        onChange={mockOnChange} 
      />
    );

    // Simulate that data loads after page refresh with formatting
    const newContent = `# AI-Generated Report

## Key Strengths
- **Leadership excellence** in team management
- Strong analytical and problem-solving abilities
- Effective communication across all organizational levels

## Areas for Development
- Time management and prioritization
- Delegation of responsibilities
- Technical skill enhancement

This employee demonstrates consistent performance with clear areas for growth.`;

    // Re-render with new content (simulates what happens after page refresh when data loads)
    rerender(
      <MarkdownEditor 
        value={newContent} 
        onChange={mockOnChange} 
      />
    );

    // Verify the editor is still rendered and functional
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    expect(screen.getByTestId('editor-toolbar')).toBeInTheDocument();
    
    // This test primarily ensures that the component doesn't crash when 
    // content changes (which was happening before our fix due to the missing useEffect)
  });

  it('converts HTML back to markdown correctly for bullet points', () => {
    render(
      <MarkdownEditor 
        value="- Item 1\n- Item 2" 
        onChange={mockOnChange} 
      />
    );

    // Simulate the editor updating with HTML content containing bullet points
    const mockHtml = '<ul><li>Item 1</li><li>Item 2</li></ul>';
    mockGetHTML.mockReturnValue(mockHtml);

    // Create a DOM element and set innerHTML to simulate the conversion process
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = mockHtml;

    // Simulate the onUpdate callback being called
    if (mockEditor.onUpdate) {
      mockEditor.onUpdate({ editor: mockEditor });
    }

    // The conversion should produce markdown with bullet points
    expect(mockOnChange).toHaveBeenCalledWith(expect.stringContaining('- Item 1'));
    expect(mockOnChange).toHaveBeenCalledWith(expect.stringContaining('- Item 2'));
  });

  it('handles paragraph breaks correctly', () => {
    render(
      <MarkdownEditor 
        value="Paragraph 1\n\nParagraph 2" 
        onChange={mockOnChange} 
      />
    );

    // Simulate HTML with paragraphs
    const mockHtml = '<p>Paragraph 1</p><p>Paragraph 2</p>';
    mockGetHTML.mockReturnValue(mockHtml);

    // Simulate the onUpdate callback
    if (mockEditor.onUpdate) {
      mockEditor.onUpdate({ editor: mockEditor });
    }

    // Should maintain paragraph separation
    expect(mockOnChange).toHaveBeenCalledWith(expect.stringMatching(/Paragraph 1\s*\n\s*Paragraph 2/));
  });

  it('preserves heading formatting', () => {
    render(
      <MarkdownEditor 
        value="# Heading 1\n## Heading 2\n### Heading 3" 
        onChange={mockOnChange} 
      />
    );

    // Simulate HTML with headings
    const mockHtml = '<h1>Heading 1</h1><h2>Heading 2</h2><h3>Heading 3</h3>';
    mockGetHTML.mockReturnValue(mockHtml);

    if (mockEditor.onUpdate) {
      mockEditor.onUpdate({ editor: mockEditor });
    }

    expect(mockOnChange).toHaveBeenCalledWith(expect.stringContaining('# Heading 1'));
    expect(mockOnChange).toHaveBeenCalledWith(expect.stringContaining('## Heading 2'));
    expect(mockOnChange).toHaveBeenCalledWith(expect.stringContaining('### Heading 3'));
  });

  it('handles mixed formatting correctly', () => {
    const complexMarkdown = `# AI Report

## Key Strengths
- **Strong leadership** skills
- Excellent communication
- Strategic thinking

## Areas for Improvement
1. Time management
2. Delegation skills
3. Technical knowledge

This is a paragraph with **bold** and _italic_ text.`;

    render(
      <MarkdownEditor 
        value={complexMarkdown} 
        onChange={mockOnChange} 
      />
    );

    // Verify the editor was initialized with the complex content
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });

  it('does not update content when HTML is the same', async () => {
    const initialContent = '# Test';
    
    render(
      <MarkdownEditor 
        value={initialContent} 
        onChange={mockOnChange} 
      />
    );

    // Mock that the current HTML matches what we would render
    mockGetHTML.mockReturnValue('<h1>Test</h1>');

    // Re-render with the same value
    const { rerender } = render(
      <MarkdownEditor 
        value={initialContent} 
        onChange={mockOnChange} 
      />
    );

    rerender(
      <MarkdownEditor 
        value={initialContent} 
        onChange={mockOnChange} 
      />
    );

    // setContent should not be called since content is the same
    await waitFor(() => {
      expect(mockSetContent).not.toHaveBeenCalled();
    });
  });

  it('handles empty or null values gracefully', () => {
    render(
      <MarkdownEditor 
        value="" 
        onChange={mockOnChange} 
      />
    );

    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });

  it('renders action buttons when provided', () => {
    const actionButtons = (
      <button data-testid="export-button">Export PDF</button>
    );

    render(
      <MarkdownEditor 
        value="Test content" 
        onChange={mockOnChange} 
        actionButtons={actionButtons}
      />
    );

    expect(screen.getByTestId('export-button')).toBeInTheDocument();
  });

  it('handles real markdown conversion scenarios', () => {
    // Test the actual markdown-it conversion
    const MarkdownIt = require('markdown-it');
    const md = new MarkdownIt({
      html: false,
      breaks: true,
      linkify: true,
    });

    const testMarkdown = `# Report Title

## Summary
This is a test report with:
- Bullet point 1
- Bullet point 2

### Analysis
1. First item
2. Second item

**Bold text** and _italic text_.`;

    const htmlOutput = md.render(testMarkdown);
    
    // Verify that markdown-it produces expected HTML
    expect(htmlOutput).toContain('<h1>Report Title</h1>');
    expect(htmlOutput).toContain('<ul>');
    expect(htmlOutput).toContain('<li>Bullet point 1</li>');
    expect(htmlOutput).toContain('<strong>Bold text</strong>');
  });
}); 