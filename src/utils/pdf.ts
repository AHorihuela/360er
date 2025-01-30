import { cleanMarkdownForPDF } from './report';

export async function exportToPDF(content: string, filename: string) {
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
  const cleanedContent = cleanMarkdownForPDF(content);
  
  const htmlContent = marked.parse(cleanedContent);
  if (typeof htmlContent === 'string') {
    tempDiv.innerHTML = htmlContent;
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
    /* Ensure content doesn't overflow page margins */
    div {
      max-width: 100%;
      word-wrap: break-word;
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
      letterRendering: true
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
      before: ['#page-break-before'],
      after: ['#page-break-after'],
      avoid: ['li', 'img', 'table', 'tr']
    }
  };

  try {
    await html2pdf.default().set(opt).from(tempDiv).save();
  } finally {
    document.body.removeChild(tempDiv);
  }
} 