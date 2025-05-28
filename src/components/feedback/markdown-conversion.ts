// HTML to Markdown conversion utilities
// Extracted from MarkdownEditor for better maintainability

export function convertHtmlToMarkdown(html: string): string {
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
          // Ensure proper spacing before headings
          if (markdown && !markdown.endsWith('\n')) {
            markdown += '\n';
          }
          // Add extra newline if there's content before this heading
          if (markdown.trim()) {
            markdown += '\n';
          }
          markdown += '# ';
          break;
        case 'h2':
          // Ensure proper spacing before headings
          if (markdown && !markdown.endsWith('\n')) {
            markdown += '\n';
          }
          // Add extra newline if there's content before this heading
          if (markdown.trim()) {
            markdown += '\n';
          }
          markdown += '## ';
          break;
        case 'h3':
          // Ensure proper spacing before headings
          if (markdown && !markdown.endsWith('\n')) {
            markdown += '\n';
          }
          // Add extra newline if there's content before this heading
          if (markdown.trim()) {
            markdown += '\n';
          }
          markdown += '### ';
          break;
        case 'h4':
          // Ensure proper spacing before headings
          if (markdown && !markdown.endsWith('\n')) {
            markdown += '\n';
          }
          // Add extra newline if there's content before this heading
          if (markdown.trim()) {
            markdown += '\n';
          }
          markdown += '#### ';
          break;
        case 'h5':
          // Ensure proper spacing before headings
          if (markdown && !markdown.endsWith('\n')) {
            markdown += '\n';
          }
          // Add extra newline if there's content before this heading
          if (markdown.trim()) {
            markdown += '\n';
          }
          markdown += '##### ';
          break;
        case 'h6':
          // Ensure proper spacing before headings
          if (markdown && !markdown.endsWith('\n')) {
            markdown += '\n';
          }
          // Add extra newline if there's content before this heading
          if (markdown.trim()) {
            markdown += '\n';
          }
          markdown += '###### ';
          break;
        case 'p':
          // Special handling for paragraphs inside list items
          if (isInsideList) {
            // Inside list items, don't add extra spacing - just process the content
            break;
          }
          // Only add spacing if we're not already at the start of a new line
          if (markdown && !markdown.endsWith('\n')) {
            markdown += '\n\n';
          }
          break;
        case 'ul':
        case 'ol':
          // Ensure proper spacing before lists
          if (markdown && !markdown.endsWith('\n')) {
            markdown += '\n';
          }
          // Add extra newline if there's content before this list
          if (markdown.trim() && !markdown.endsWith('\n\n')) {
            markdown += '\n';
          }
          break;
        case 'li':
          // Ensure we're on a new line for list items
          if (markdown && !markdown.endsWith('\n')) {
            markdown += '\n';
          }
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
        case 'img':
          const src = element.getAttribute('src') || '';
          const alt = element.getAttribute('alt') || '';
          if (src) {
            if (markdown && !markdown.endsWith('\n')) {
              markdown += '\n\n';
            }
            markdown += `![${alt}](${src})`;
            if (!markdown.endsWith('\n')) {
              markdown += '\n\n';
            }
          }
          return; // Don't process children for img elements
      }
      
      // Process child nodes
      const isListItem = tagName === 'li';
      Array.from(node.childNodes).forEach(child => processNode(child, isListItem || isInsideList));
      
      // Handle closing tags
      switch (tagName) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          // Always ensure headings end with double newlines for proper separation
          if (!markdown.endsWith('\n')) {
            markdown += '\n';
          }
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
          // Ensure list items end with a newline
          if (!markdown.endsWith('\n')) {
            markdown += '\n';
          }
          break;
        case 'p':
          // Special handling for paragraphs inside list items
          if (isInsideList) {
            // Inside list items, don't add extra spacing - just process the content
            break;
          }
          // Ensure paragraphs end with proper spacing
          if (!markdown.endsWith('\n')) {
            markdown += '\n';
          }
          break;
        case 'ul':
        case 'ol':
          // Add spacing after lists
          if (!markdown.endsWith('\n')) {
            markdown += '\n';
          }
          break;
      }
    }
  };
  
  Array.from(tempDiv.childNodes).forEach(node => processNode(node));
  
  // Clean up the final markdown output more carefully
  markdown = markdown
    .replace(/\n{4,}/g, '\n\n\n') // Replace 4+ newlines with 3 (heading + spacing)
    .replace(/[ \t]+\n/g, '\n') // Remove trailing spaces before newlines
    .replace(/\n[ \t]+/g, '\n') // Remove leading spaces after newlines
    .replace(/[ \t]{2,}/g, ' ') // Replace multiple spaces with single space
    .replace(/^\s+/g, ''); // Trim start whitespace only
  
  // Ensure proper structure: headings should have double newlines after them
  markdown = markdown
    .replace(/(#{1,6}\s+[^\n]+)\n(?!\n)/g, '$1\n\n') // Add double newline after headings if not present
    .replace(/(\n- [^\n]+)\n(?![\n-])/g, '$1\n\n') // Add spacing after list items when followed by non-list content
    .replace(/(\n\d+\. [^\n]+)\n(?![\n\d])/g, '$1\n\n'); // Add spacing after numbered list items when followed by non-list content
  
  // Final cleanup: remove any trailing spaces but preserve structure
  markdown = markdown.replace(/[ \t]+$/gm, '');
  
  return markdown;
}

export function normalizeContent(content: string): string {
  if (!content) return '';
  
  return content
    .replace(/\r\n/g, '\n')  // Normalize line endings
    .replace(/\r/g, '\n')    // Normalize line endings
    // Be more careful with whitespace normalization to preserve markdown structure
    .replace(/[ \t]+/g, ' ')    // Normalize spaces and tabs to single spaces, but preserve newlines
    .replace(/\n{4,}/g, '\n\n\n')  // Normalize excessive newlines but allow for heading spacing
    .replace(/\n[ \t]+/g, '\n') // Remove spaces after newlines
    .replace(/[ \t]+\n/g, '\n') // Remove spaces before newlines
    // Don't trim aggressively - preserve leading/trailing structure
    .replace(/^[ \t]+/g, '') // Remove leading spaces/tabs only
    .replace(/[ \t]+$/g, ''); // Remove trailing spaces/tabs only
} 