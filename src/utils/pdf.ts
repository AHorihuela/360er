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
    }
    h1 { 
      font-size: 24px; 
      margin-bottom: 16px; 
      font-weight: bold;
      page-break-after: avoid;
    }
    h2 { 
      font-size: 20px; 
      margin: 24px 0 12px 0; 
      font-weight: bold;
      page-break-after: avoid;
    }
    h3 { 
      font-size: 16px; 
      margin: 16px 0 8px 0; 
      font-weight: bold;
      page-break-after: avoid;
    }
    p { 
      margin: 0 0 12px 0;
      line-height: 1.6;
      orphans: 3;
      widows: 3;
    }
    ul, ol { 
      margin: 0 0 12px 0;
      padding-left: 24px;
      page-break-inside: avoid;
    }
    li { 
      margin: 0 0 6px 0;
      line-height: 1.6;
    }
    strong { 
      font-weight: 600;
    }
    /* Bullet points styling */
    ul { 
      list-style-type: disc;
      margin-left: 0;
    }
    ul li {
      padding-left: 8px;
    }
    ul li::marker { 
      content: "•";
      font-size: 1.2em;
      color: #111827;
    }
    /* Numbered list styling */
    ol {
      list-style-type: decimal;
      margin-left: 0;
    }
    ol li {
      padding-left: 8px;
    }
    /* Preserve bold text */
    strong, b { 
      font-weight: 600 !important;
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
      avoid: ['li', 'img']
    }
  };

  try {
    await html2pdf.default().set(opt).from(tempDiv).save();
  } finally {
    document.body.removeChild(tempDiv);
  }
} 