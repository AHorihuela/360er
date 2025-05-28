import { CoreFeedbackResponse } from '@/types/feedback/base';

export function getElapsedTime(startTime: number | null): string {
  if (!startTime) return '0s';
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  return `${elapsed}s`;
}

export function formatLastAnalyzed(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
}

export function getFeedbackDate(feedback: CoreFeedbackResponse): number {
  return new Date(feedback.submitted_at ?? feedback.created_at ?? 0).getTime();
}

export function cleanMarkdownContent(content: string): string {
  return content
    .replace(/^(#{1,6})\s*(.+?)(?:\s*#*\s*)$/gm, '$1 $2\n') // Add newline after headings
    .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
    .trim();
}

export function cleanMarkdownForPDF(content: string): string {
  // First, remove any existing chart sections to prevent duplication
  let cleanContent = removeExistingCharts(content);
  
  return cleanContent
    .replace(/^[-*+]\s+/gm, '• ') // Convert all list markers to bullet points
    .replace(/^(\d+)\.\s+/gm, (_, num) => `${num}. `); // Preserve numbered lists with proper formatting
}

export function removeExistingCharts(content: string): string {
  // Debug logging for development (disabled for production)
  /*
  const originalLength = content.length;
  const hasAnalyticsDashboard = content.includes('Survey Analytics Dashboard');
  const hasManagerSummary = content.includes('Manager Effectiveness Summary');
  const hasChartImages = content.includes('data:image/');
  
  console.log('Chart removal debug:', {
    originalLength,
    hasAnalyticsDashboard,
    hasManagerSummary,
    hasChartImages
  });
  */
  
  // Remove existing chart sections that might be duplicated
  const cleaned = content
    // Remove "Survey Analytics Dashboard" section and everything until the next major section or end
    .replace(/## Survey Analytics Dashboard[\s\S]*?(?=\n## (?!Survey Analytics Dashboard)|$)/g, '')
    // Remove standalone "Overall Manager Effectiveness Score" sections (both as h2 and h3)
    .replace(/##?\s*Overall Manager Effectiveness Score[\s\S]*?(?=\n## (?!Overall Manager Effectiveness Score)|$)/g, '')
    // Remove standalone "Question-by-Question Analysis" sections (both as h2 and h3)
    .replace(/##?\s*Question-by-Question Analysis[\s\S]*?(?=\n## (?!Question-by-Question Analysis)|$)/g, '')
    // Remove standalone "Key Insights from Quantitative Data" sections (both as h2 and h3)
    .replace(/##?\s*Key Insights from Quantitative Data[\s\S]*?(?=\n## (?!Key Insights from Quantitative Data)|$)/g, '')
    // Remove any manager effectiveness summary sections
    .replace(/Manager Effectiveness Summary[\s\S]*?(?=\n## |$)/g, '')
    // Remove standalone chart images (base64 images) - both with and without alt text
    .replace(/!\[[^\]]*\]\(data:image\/[^)]+\)/g, '')
    // Remove chart reference texts
    .replace(/\*Charts show quantitative analysis.*?\*[\s\S]*?(?=\n## |$)/g, '')
    // Remove any chart description paragraphs
    .replace(/The distribution chart above shows[\s\S]*?(?=\n## |\n### |$)/g, '')
    .replace(/The overall effectiveness score represents[\s\S]*?(?=\n## |\n### |$)/g, '')
    // Remove scale descriptions that come with charts
    .replace(/- \*\*Green \(4-5\):\*\* Strong performance areas[\s\S]*?(?=\n## |\n### |$)/g, '')
    // Remove highest/lowest rated sections that come with charts
    .replace(/\*\*Highest Rated:\*\*[\s\S]*?(?=\n## |\n### |$)/g, '')
    .replace(/\*\*Needs Most Attention:\*\*[\s\S]*?(?=\n## |\n### |$)/g, '')
    // Clean up excessive newlines and horizontal rules that might be left
    .replace(/\n[-*_]{3,}\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  /*
  const cleanedLength = cleaned.length;
  const removedChars = originalLength - cleanedLength;
  
  console.log('Chart removal result:', {
    cleanedLength,
    removedChars,
    percentageRemoved: ((removedChars / originalLength) * 100).toFixed(1) + '%'
  });
  */
  
  return cleaned;
} 