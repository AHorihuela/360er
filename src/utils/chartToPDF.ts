import { CoreFeedbackResponse } from '@/types/feedback/base';

export interface ChartData {
  questionId: string;
  questionText: string;
  average: number;
  count: number;
  distribution: Record<number, number>;
}

export interface SurveyChartData {
  overallAverage: number;
  questionMetrics: ChartData[];
  totalResponses: number;
}

// Convert feedback responses to chart data
export function processManagerSurveyData(
  feedbackResponses: CoreFeedbackResponse[],
  questionIdToTextMap: Record<string, string>,
  questionOrder: Record<string, number>
): SurveyChartData {
  // Filter to only have numeric (Likert) questions
  const numericQuestionIds = Object.entries(questionIdToTextMap)
    .filter(([id, text]) => {
      // Skip questions that look like open-ended ones
      return !text.toLowerCase().includes('what could') && 
             !text.toLowerCase().includes('what is one suggestion') &&
             !text.toLowerCase().includes('additional feedback');
    })
    .map(([id]) => id);
  
  // Sort the questions by their order
  const sortedIds = [...numericQuestionIds].sort((a, b) => {
    return (questionOrder[a] || 999) - (questionOrder[b] || 999);
  });
  
  // Calculate metrics for each question
  const questionMetrics: ChartData[] = [];
  let totalSum = 0;
  let totalCount = 0;
  
  sortedIds.forEach(questionId => {
    let sum = 0;
    let count = 0;
    const distribution: Record<number, number> = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
    
    for (const response of feedbackResponses) {
      if (response.responses && typeof response.responses[questionId] === 'number') {
        const value = response.responses[questionId] as number;
        sum += value;
        count++;
        distribution[value] = (distribution[value] || 0) + 1;
      }
    }
    
    const average = count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;
    
    questionMetrics.push({
      questionId,
      questionText: questionIdToTextMap[questionId] || `Question ${questionId.slice(0, 8)}...`,
      average,
      count,
      distribution
    });
    
    totalSum += sum;
    totalCount += count;
  });
  
  return {
    overallAverage: totalCount > 0 ? parseFloat((totalSum / totalCount).toFixed(1)) : 0,
    questionMetrics,
    totalResponses: feedbackResponses.length
  };
}

// Generate a canvas-based chart for distribution bars
export async function generateDistributionChart(
  questionMetrics: ChartData[], 
  width: number = 700, // Reduced from 800 for better page fit
  height?: number
): Promise<string> {
  return new Promise((resolve) => {
    // Calculate dynamic height based on content - made more compact
    const padding = 40; // Reduced padding
    const titleHeight = 50; // Reduced title height
    const legendHeight = 60; // Reduced legend height
    const itemHeight = 100; // Reduced height per question for better compactness
    const minHeight = 500; // Reduced minimum height
    
    // Calculate required height
    const calculatedHeight = titleHeight + (questionMetrics.length * itemHeight) + legendHeight + (padding * 2);
    const finalHeight = Math.max(minHeight, calculatedHeight);
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = finalHeight;
    const ctx = canvas.getContext('2d')!;
    
    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, finalHeight);
    
    // Chart settings - improved spacing
    const chartWidth = width - (padding * 2);
    const barHeight = 28;
    
    // Colors for different scores
    const scoreColors = {
      1: '#ef4444', // red-500
      2: '#f97316', // orange-500
      3: '#eab308', // yellow-500
      4: '#22c55e', // green-500
      5: '#10b981'  // emerald-500
    };
    
    // Title
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Manager Effectiveness Survey Results', width / 2, 35);
    
    // Reset text alignment for questions
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    questionMetrics.forEach((question, index) => {
      const y = titleHeight + padding + (index * itemHeight);
      
      // Question text - improved wrapping and spacing
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      
      // Smart text wrapping for question text
      const maxTextWidth = chartWidth * 0.9;
      const words = question.questionText.split(' ');
      let lines: string[] = [];
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(testLine).width <= maxTextWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            // Single word is too long, truncate it
            currentLine = word.substring(0, 50) + '...';
          }
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }
      
      // Limit to 2 lines maximum
      if (lines.length > 2) {
        lines = lines.slice(0, 2);
        lines[1] = lines[1].substring(0, lines[1].length - 3) + '...';
      }
      
      // Draw question text lines
      lines.forEach((line, lineIndex) => {
        ctx.fillText(line, padding, y + (lineIndex * 18));
      });
      
      // Average score - positioned below question text
      const scoreY = y + (lines.length * 18) + 8;
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#6b7280';
      ctx.fillText(`Average: ${question.average}/5.0 (${question.count} responses)`, padding, scoreY);
      
      // Distribution bars - positioned below score
      const distributionY = scoreY + 25;
      const totalResponses = Object.values(question.distribution).reduce((sum, count) => sum + count, 0);
      
      if (totalResponses > 0) {
        let currentX = padding;
        const maxBarWidth = chartWidth * 0.7;
        
        [5, 4, 3, 2, 1].forEach(score => {
          const count = question.distribution[score] || 0;
          const percentage = count / totalResponses;
          const barWidth = (percentage * maxBarWidth);
          
          if (barWidth > 0) {
            // Draw bar
            ctx.fillStyle = scoreColors[score as keyof typeof scoreColors];
            ctx.fillRect(currentX, distributionY, barWidth, barHeight);
            
            // Draw percentage text if bar is wide enough
            if (barWidth > 40) {
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const text = `${(percentage * 100).toFixed(0)}%`;
              ctx.fillText(text, currentX + (barWidth / 2), distributionY + (barHeight / 2));
              
              // Reset text alignment
              ctx.textAlign = 'left';
              ctx.textBaseline = 'top';
            }
            
            currentX += barWidth;
          }
        });
      }
    });
    
    // Legend at the bottom - positioned from bottom of canvas
    const legendY = finalHeight - 30; // Reduced space for legend
    ctx.fillStyle = '#374151';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    // Simplified legend text
    ctx.fillText('Scale: 5 = Strongly Agree, 4 = Agree, 3 = Neutral, 2 = Disagree, 1 = Strongly Disagree', width / 2, legendY);
    
    // Color legend - positioned above text legend (simplified)
    const colorLegendY = legendY - 20; // Reduced spacing
    const colorBoxSize = 10; // Smaller boxes
    const colorSpacing = 100; // Tighter spacing
    const startX = (width - (5 * colorSpacing)) / 2;
    
    [5, 4, 3, 2, 1].forEach((score, index) => {
      const x = startX + (index * colorSpacing);
      
      // Draw color box
      ctx.fillStyle = scoreColors[score as keyof typeof scoreColors];
      ctx.fillRect(x, colorLegendY - colorBoxSize/2, colorBoxSize, colorBoxSize);
      
      // Draw score label
      ctx.fillStyle = '#374151';
      ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(score.toString(), x + colorBoxSize + 3, colorLegendY + 2);
    });
    
    // Convert to base64 image
    resolve(canvas.toDataURL('image/png', 0.9));
  });
}

// Generate overall summary chart (pie or donut chart)
export async function generateOverallSummaryChart(
  overallAverage: number,
  totalResponses: number,
  width: number = 400,
  height: number = 300
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    
    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Chart settings
    const centerX = width / 2;
    const centerY = height / 2 + 10; // Slightly lower to accommodate title
    const radius = Math.min(width, height) / 3.5;
    
    // Score color based on average
    const getScoreColor = (score: number) => {
      if (score >= 4.5) return '#10b981'; // emerald-500
      if (score >= 4) return '#22c55e'; // green-500
      if (score >= 3.5) return '#84cc16'; // lime-500
      if (score >= 3) return '#eab308'; // yellow-500
      if (score >= 2.5) return '#f97316'; // orange-500
      return '#ef4444'; // red-500
    };
    
    // Draw circle background (light gray)
    ctx.fillStyle = '#f3f4f6';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw score arc (progress circle)
    const scorePercentage = overallAverage / 5;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (scorePercentage * 2 * Math.PI);
    
    // Draw the progress arc with thicker line
    ctx.strokeStyle = getScoreColor(overallAverage);
    ctx.lineWidth = 15;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 7.5, startAngle, endAngle);
    ctx.stroke();
    
    // Draw center circle for clean donut effect
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw score text in center
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(overallAverage.toFixed(1), centerX, centerY - 8);
    
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.fillText('Overall Score', centerX, centerY + 18);
    
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${totalResponses} responses`, centerX, centerY + 35);
    
    // Title
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Manager Effectiveness Summary', centerX, 35);
    
    resolve(canvas.toDataURL('image/png', 0.9));
  });
}

// Main function to generate chart images for PDF
export async function generateManagerSurveyCharts(
  feedbackResponses: CoreFeedbackResponse[],
  questionIdToTextMap: Record<string, string>,
  questionOrder: Record<string, number>
): Promise<{
  summaryChart: string;
  distributionChart: string;
  chartData: SurveyChartData;
}> {
  const chartData = processManagerSurveyData(feedbackResponses, questionIdToTextMap, questionOrder);
  
  if (chartData.questionMetrics.length === 0) {
    throw new Error('No quantitative data available for chart generation');
  }
  
  const [summaryChart, distributionChart] = await Promise.all([
    generateOverallSummaryChart(chartData.overallAverage, chartData.totalResponses),
    generateDistributionChart(chartData.questionMetrics)
  ]);
  
  return {
    summaryChart,
    distributionChart,
    chartData
  };
}

// Generate markdown content with embedded charts for AI reports
export async function generateChartMarkdownForReport(
  feedbackResponses: CoreFeedbackResponse[],
  questionIdToTextMap: Record<string, string>,
  questionOrder: Record<string, number>
): Promise<string> {
  try {
    const { summaryChart, distributionChart, chartData } = await generateManagerSurveyCharts(
      feedbackResponses,
      questionIdToTextMap,
      questionOrder
    );
    
    return `
## Survey Analytics Dashboard

![Overall Summary Chart](${summaryChart})

**Overall Score: ${chartData.overallAverage}/5.0** based on ${chartData.totalResponses} survey responses

### Question-by-Question Analysis

![Response Distribution Chart](${distributionChart})

**Key Insights from Quantitative Data:**

${chartData.questionMetrics
  .sort((a, b) => b.average - a.average)
  .slice(0, 3)
  .map((question, index) => {
    const rank = index === 0 ? "**Highest Rated:**" : index === 1 ? "**Second Highest:**" : "**Third Highest:**";
    return `${rank} ${question.questionText} (Average: ${question.average}/5.0)`;
  })
  .join('\n\n')}

${chartData.questionMetrics
  .sort((a, b) => a.average - b.average)
  .slice(0, 2)
  .map((question, index) => {
    const rank = index === 0 ? "**Needs Most Attention:**" : "**Also Needs Focus:**";
    return `${rank} ${question.questionText} (Average: ${question.average}/5.0)`;
  })
  .join('\n\n')}

*Charts show quantitative analysis of ${chartData.totalResponses} survey responses. The data visualization provides insights into team perception patterns and helps identify specific areas for development.*
`;
  } catch (error) {
    console.warn('Could not generate chart markdown:', error);
    return '\n*Note: Chart visualization could not be generated for this report.*\n';
  }
} 