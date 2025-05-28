import { cleanMarkdownForPDF } from './report';
import { generateManagerSurveyCharts } from './chartToPDF';
import { CoreFeedbackResponse } from '@/types/feedback/base';
import { ReviewCycleType } from '@/types/survey';

interface PDFExportOptions {
  includeCharts?: boolean;
  surveyType?: ReviewCycleType;
  feedbackResponses?: CoreFeedbackResponse[];
  questionIdToTextMap?: Record<string, string>;
  questionOrder?: Record<string, number>;
}

export async function exportToPDF(
  content: string, 
  filename: string, 
  options: PDFExportOptions = {}
) {
  // Import required modules
  const [html2pdf, { marked }] = await Promise.all([
    import('html2pdf.js'),
    import('marked')
  ]);
  
  // Create a temporary div to render the markdown
  const tempDiv = document.createElement('div');
  tempDiv.className = 'prose prose-gray dark:prose-invert max-w-none p-8';
  
  // Convert markdown to HTML with specific options
  marked.setOptions({
    gfm: true,
    breaks: true
  });

  // Clean up the markdown content
  let cleanedContent = cleanMarkdownForPDF(content);
  
  // Generate charts if this is a manager survey and we have the necessary data
  let chartsHtml = '';
  if (
    options.includeCharts && 
    options.surveyType === 'manager_effectiveness' &&
    options.feedbackResponses && 
    options.questionIdToTextMap && 
    options.questionOrder &&
    options.feedbackResponses.length > 0
  ) {
    try {
      const { summaryChart, distributionChart, chartData } = await generateManagerSurveyCharts(
        options.feedbackResponses,
        options.questionIdToTextMap,
        options.questionOrder
      );
      
      chartsHtml = `
        <div class="charts-section" style="page-break-before: always; margin-top: 20px;">
          <h2 style="margin-bottom: 20px; color: #111827; font-size: 20px; font-weight: bold;">Survey Analytics</h2>
          
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${summaryChart}" alt="Overall Summary Chart" style="max-width: 400px; height: auto; margin: 0 auto; display: block; border: 1px solid #e5e7eb; border-radius: 8px;" />
            <p style="font-size: 12px; color: #6b7280; margin-top: 8px; font-style: italic;">Overall manager effectiveness score based on ${chartData.totalResponses} responses</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h3 style="color: #111827; font-size: 16px; font-weight: bold; margin-bottom: 16px;">Question-by-Question Analysis</h3>
            <img src="${distributionChart}" alt="Question Distribution Chart" style="max-width: 100%; height: auto; border: 1px solid #e5e7eb; border-radius: 8px;" />
            <p style="font-size: 12px; color: #6b7280; margin-top: 8px; font-style: italic;">Response distribution for each survey question showing percentage breakdown</p>
          </div>
          
          <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin-top: 20px;">
            <h4 style="color: #111827; font-size: 14px; font-weight: bold; margin-bottom: 8px;">How to Read the Charts:</h4>
            <ul style="font-size: 12px; color: #374151; margin: 0; padding-left: 20px;">
              <li><strong>Summary Chart:</strong> Shows the overall effectiveness score as a percentage of the maximum possible score (5.0)</li>
              <li><strong>Distribution Chart:</strong> Each question shows the percentage of responses for each rating level (1-5 scale)</li>
              <li><strong>Color Coding:</strong> Green (4-5) = Strong performance, Yellow (3) = Neutral, Red (1-2) = Needs improvement</li>
            </ul>
          </div>
        </div>
      `;
      
      // Insert charts before the main content or at a specific location
      if (cleanedContent.includes('## Survey Data') || cleanedContent.includes('## Analytics')) {
        // Insert charts after survey data section
        cleanedContent = cleanedContent.replace(
          /(## Survey Data[\s\S]*?)(?=\n## |$)/,
          `$1\n\n${chartsHtml.replace(/<[^>]*>/g, (tag) => tag.replace(/style="[^"]*"/g, ''))}\n\n`
        );
      } else {
        // Insert charts at the beginning after any executive summary
        const lines = cleanedContent.split('\n');
        let insertIndex = 0;
        
        // Find a good insertion point (after executive summary or at beginning)
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('## ') && !lines[i].includes('Executive') && !lines[i].includes('Summary')) {
            insertIndex = i;
            break;
          }
        }
        
        if (insertIndex > 0) {
          lines.splice(insertIndex, 0, '\n## Survey Analytics\n\n*[Charts showing quantitative analysis of survey responses]*\n');
          cleanedContent = lines.join('\n');
        }
      }
    } catch (error) {
      console.warn('Could not generate charts for PDF:', error);
      // Continue without charts
    }
  }
  
  const htmlContent = marked.parse(cleanedContent);
  if (typeof htmlContent === 'string') {
    tempDiv.innerHTML = htmlContent + chartsHtml;
  }
  
  // Add custom styles for PDF
  const style = document.createElement('style');
  style.textContent = `
    @page {
      margin: 1in;
      size: letter;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #111827;
      max-width: 100%;
      word-wrap: break-word;
    }
    h1 { 
      font-size: 24px; 
      margin: 24px 0 16px 0; 
      font-weight: bold;
      page-break-after: avoid;
      line-height: 1.3;
    }
    h2 { 
      font-size: 20px; 
      margin: 20px 0 12px 0; 
      font-weight: bold;
      page-break-after: avoid;
      line-height: 1.3;
    }
    h3 { 
      font-size: 16px; 
      margin: 16px 0 8px 0; 
      font-weight: bold;
      page-break-after: avoid;
      line-height: 1.3;
    }
    h4 { 
      font-size: 14px; 
      margin: 14px 0 6px 0; 
      font-weight: bold;
      page-break-after: avoid;
      line-height: 1.3;
    }
    p { 
      margin: 0 0 12px 0;
      line-height: 1.6;
      orphans: 3;
      widows: 3;
      max-width: 100%;
      word-wrap: break-word;
    }
    ul, ol { 
      margin: 8px 0 16px 0;
      padding-left: 32px;
      page-break-inside: avoid;
    }
    li { 
      margin: 4px 0;
      line-height: 1.6;
      position: relative;
      max-width: calc(100% - 24px);
    }
    strong { 
      font-weight: 600;
    }
    /* Bullet points styling */
    ul { 
      list-style-type: none;
    }
    ul li {
      padding-left: 16px;
      position: relative;
    }
    ul li::before { 
      content: "•";
      position: absolute;
      left: -4px;
      font-size: 16px;
      line-height: 1.6;
      color: #111827;
    }
    /* Numbered list styling */
    ol {
      list-style-type: decimal;
      counter-reset: item;
    }
    ol li {
      padding-left: 8px;
      counter-increment: item;
    }
    ol li::marker {
      font-weight: 400;
    }
    /* Preserve bold text */
    strong, b { 
      font-weight: 600 !important;
    }
    /* Theme sections */
    h2 + p {
      margin-top: 8px;
    }
    /* Executive Summary spacing */
    h1 + p {
      margin-top: 12px;
    }
    /* Charts section styling */
    .charts-section {
      margin: 20px 0;
      page-break-inside: avoid;
    }
    .charts-section img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0 auto 10px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
    }
    .charts-section p {
      font-size: 12px;
      color: #6b7280;
      text-align: center;
      font-style: italic;
      margin: 8px 0;
    }
    /* Ensure content doesn't overflow page margins */
    div {
      max-width: 100%;
      word-wrap: break-word;
    }
    /* Chart explanation box */
    .chart-explanation {
      background-color: #f9fafb;
      padding: 16px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #3b82f6;
    }
    .chart-explanation h4 {
      color: #111827;
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .chart-explanation ul {
      font-size: 12px;
      color: #374151;
      margin: 0;
      padding-left: 20px;
    }
  `;
  
  tempDiv.appendChild(style);
  document.body.appendChild(tempDiv);

  const opt = {
    margin: 0,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2,
      useCORS: true,
      logging: false,
      letterRendering: true,
      allowTaint: true // Allow data URLs for charts
    },
    jsPDF: { 
      unit: 'in', 
      format: 'letter', 
      orientation: 'portrait',
      compress: true,
      hotfixes: ['px_scaling']
    },
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy'],
      before: ['#page-break-before', '.charts-section'],
      after: ['#page-break-after'],
      avoid: ['li', 'img', 'table', 'tr', '.chart-explanation']
    }
  };

  try {
    await html2pdf.default().set(opt).from(tempDiv).save();
  } finally {
    document.body.removeChild(tempDiv);
  }
} 