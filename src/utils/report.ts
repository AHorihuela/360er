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
  return content
    .replace(/^[-*+]\s+/gm, '• ') // Convert all list markers to bullet points
    .replace(/^(\d+)\.\s+/gm, (_, num) => `${num}. `); // Preserve numbered lists with proper formatting
} 