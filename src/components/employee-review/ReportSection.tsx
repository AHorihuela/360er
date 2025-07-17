import { AIReport } from './AIReport';
import { ReviewCycle, FeedbackRequest, GenerationStep } from '@/types/reviews/employee-review';

interface ReportSectionProps {
  reviewCycle: ReviewCycle;
  feedbackRequest: FeedbackRequest;
  onExportPDF: () => Promise<void>;
  onReportChange: (report: any) => void;
  onGenerateReport: () => void;
  isGeneratingReport: boolean;
  generationStep: GenerationStep;
  startTime: number | null;
  elapsedSeconds: number;
  isSaving: boolean;
}

export function ReportSection({
  reviewCycle,
  feedbackRequest,
  onExportPDF,
  onReportChange,
  onGenerateReport,
  isGeneratingReport,
  generationStep,
  startTime,
  elapsedSeconds,
  isSaving
}: ReportSectionProps) {
  return (
    <section id="ai-report" className="space-y-4 py-6">
      {reviewCycle?.type === 'manager_to_employee' && (
        <div className="space-y-1 mb-4">
          <h2 className="text-xl font-semibold">Generate Report</h2>
          <p className="text-sm text-muted-foreground">
            Create a comprehensive feedback report from submitted feedback entries
          </p>
        </div>
      )}
      <AIReport 
        feedbackRequest={feedbackRequest as any}
        onExportPDF={onExportPDF}
        onReportChange={onReportChange}
        onGenerateReport={onGenerateReport}
        isGeneratingReport={isGeneratingReport}
        generationStep={generationStep}
        startTime={startTime}
        elapsedSeconds={elapsedSeconds}
        surveyType={reviewCycle?.type}
        isSaving={isSaving}
      />
    </section>
  );
} 