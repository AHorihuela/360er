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
  
  // Generate charts for manager surveys if options are provided
  if (options.includeCharts && 
      options.surveyType === 'manager_effectiveness' && 
      options.feedbackResponses?.length && 
      options.questionIdToTextMap && 
      options.questionOrder) {
    
    // Check if charts are already present in the content
    const hasExistingCharts = cleanedContent.includes('Survey Analytics Dashboard') ||
                             cleanedContent.includes('Manager Effectiveness Summary') ||
                             cleanedContent.includes('data:image/') ||
                             cleanedContent.includes('Overall Manager Effectiveness Score');
    
    if (!hasExistingCharts) {
      try {
        console.log('Generating charts for PDF export...');
        const { generateChartMarkdownForReport } = await import('./chartToPDF');
        
        const chartMarkdown = await generateChartMarkdownForReport(
          options.feedbackResponses,
          options.questionIdToTextMap,
          options.questionOrder
        );
        
        // Insert charts after the main content but before any existing footer
        // The chart content now has its own page break structure
        cleanedContent = `${cleanedContent}\n\n${chartMarkdown}`;
        console.log('Charts added to PDF content');
        
      } catch (chartError) {
        console.warn('Chart generation failed for PDF, continuing without charts:', chartError);
      }
    } else {
      console.log('Charts already present in content, skipping chart generation for PDF');
    }
  }
  
  const htmlContent = marked.parse(cleanedContent);
  if (typeof htmlContent === 'string') {
    tempDiv.innerHTML = htmlContent;
    
    // Fix H2 spacing issues specifically - this is the targeted fix for the spacing problem
    const h2Elements = tempDiv.querySelectorAll('h2');
    h2Elements.forEach(h2 => {
      if (h2.textContent) {
        // Apply spacing fixes specifically to H2 text content
        h2.textContent = h2.textContent
          .replace(/OverallAssessment/g, 'Overall Assessment')
          .replace(/ManagerEffectiveness/g, 'Manager Effectiveness') 
          .replace(/SurveyAnalytics/g, 'Survey Analytics')
          .replace(/RecommendedActions/g, 'Recommended Actions')
          .replace(/ActionPlan/g, 'Action Plan')
          .replace(/KeyInsights/g, 'Key Insights')
          .replace(/([a-z])([A-Z])/g, '$1 $2'); // General camelCase fix
      }
    });
  }
  
  // Add custom styles for PDF
  const style = document.createElement('style');
  style.textContent = `
    @page {
      margin: 0.75in;
      size: letter;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #111827;
      max-width: 100%;
      word-wrap: break-word;
      margin: 0;
      padding: 0;
    }
    h1 { 
      font-size: 24px; 
      margin: 0 0 16px 0; 
      font-weight: bold;
      page-break-after: avoid;
      line-height: 1.3;
      page-break-inside: avoid;
    }
    h2 { 
      font-size: 20px; 
      margin: 20px 0 12px 0; 
      font-weight: bold;
      page-break-after: avoid;
      line-height: 1.3;
      page-break-inside: avoid;
    }
    h3 { 
      font-size: 16px; 
      margin: 16px 0 8px 0; 
      font-weight: bold;
      page-break-after: avoid;
      line-height: 1.3;
      page-break-inside: avoid;
    }
    h4 { 
      font-size: 14px; 
      margin: 14px 0 6px 0; 
      font-weight: bold;
      page-break-after: avoid;
      line-height: 1.3;
      page-break-inside: avoid;
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
    /* Chart images styling - for embedded base64 images */
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 16px auto;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      page-break-inside: avoid;
      page-break-after: auto;
    }
    /* Prevent orphaned headings */
    h1, h2, h3, h4, h5, h6 {
      page-break-after: avoid;
      page-break-inside: avoid;
    }
    /* Chart sections should stay together and start on new page if needed */
    h3 + p + img {
      page-break-before: avoid;
    }
    /* Better spacing around chart sections */
    h3 + p {
      margin-bottom: 8px;
    }
    /* Chart sections should stay together */
    .chart-section {
      page-break-inside: avoid;
      page-break-before: auto;
    }
    /* Force page break before charts section - using class instead of :contains() */
    .page-break-before {
      page-break-before: page !important;
    }
    /* Ensure the first heading in the charts section starts properly */
    .page-break-before h2:first-child {
      margin-top: 0;
      padding-top: 0;
    }
    /* Keep chart sections together - prevent orphaned headings */
    .page-break-before h3 {
      page-break-before: auto;
      page-break-after: avoid;
      page-break-inside: avoid;
      margin-top: 32px;
      margin-bottom: 16px;
    }
    /* Ensure chart images stay with their headings */
    .page-break-before h3 + p + img {
      page-break-before: avoid;
      margin-top: 8px;
    }
    /* Keep the entire chart section together when possible */
    .page-break-before > * {
      page-break-inside: avoid;
    }
    /* Specific handling for question analysis section */
    .page-break-before h3:nth-of-type(1) {
      page-break-before: auto;
      margin-top: 40px;
    }
    /* Italic text styling for chart descriptions */
    p em, p i {
      font-style: italic;
      color: #6b7280;
      font-size: 14px;
    }
    /* Better formatting for recommendations */
    h2 {
      page-break-before: auto;
      margin-top: 24px;
    }
    /* Improved bullet point styling for recommendations */
    ul li {
      margin: 8px 0;
      line-height: 1.6;
      page-break-inside: avoid;
    }
    /* Bold text in recommendations should stand out */
    ul li strong {
      font-weight: 600;
      color: #111827;
    }
    /* Better spacing for recommendation descriptions */
    ul li p {
      margin: 4px 0 0 0;
      color: #374151;
    }
    /* Ensure recommendation list items don't break awkwardly */
    ul li {
      orphans: 2;
      widows: 2;
    }
    /* Remove any default margins that might cause blank pages */
    * {
      box-sizing: border-box;
    }
    /* First element should not have top margin */
    *:first-child {
      margin-top: 0 !important;
      padding-top: 0 !important;
    }
  `;
  
  // Append the style to the temporary div
  tempDiv.appendChild(style);
  
  // PDF generation options
  const opt = {
    margin: 0.1, // Minimal margin since we're handling it in CSS
    filename: filename,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { 
      scale: 1.2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 1000,
      windowHeight: 1400,
      removeContainer: true
    },
    jsPDF: { 
      unit: 'in', 
      format: 'letter', 
      orientation: 'portrait',
      compress: true
    },
    pagebreak: { 
      mode: ['avoid-all', 'css'],
      before: [],
      after: [],
      avoid: ['img', 'h1', 'h2', 'h3']
    }
  };

  // Generate and download the PDF
  return html2pdf.default().set(opt).from(tempDiv).save();
} 