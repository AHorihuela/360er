import { Router, Request, Response } from 'express';
import { ReportService } from '../services/reportService';

const router = Router();
const reportService = new ReportService();

// Generate report endpoint
router.post('/generate-report', async (req: Request, res: Response) => {
  try {
    const { employeeName, employeeRole, feedback, surveyType, surveyQuestions, timeRange } = req.body;

    console.log('=== GENERATE REPORT DEBUG ===');
    console.log('Employee Name:', employeeName);
    console.log('Employee Role:', employeeRole);
    console.log('Survey Type:', surveyType);
    console.log('Feedback Length:', feedback?.length);
    console.log('Time Range:', timeRange);
    console.log('Feedback Structure:', JSON.stringify(feedback?.[0], null, 2));
    console.log('Survey Questions:', surveyQuestions);
    console.log('==============================');

    const reportContent = await reportService.generateReport({
      employeeName,
      employeeRole,
      feedback,
      surveyType,
      surveyQuestions,
      timeRange
    });

    return res.json({ content: reportContent });
  } catch (error) {
    console.error('Error in generate-report:', error);
    return res.status(500).json({ 
      error: 'Failed to generate report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 