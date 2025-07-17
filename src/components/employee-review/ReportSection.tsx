import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Sparkles, AlertCircle, FileText } from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { AIReport } from './AIReport';
import { ReviewCycle, FeedbackRequest, GenerationStep } from '@/types/reviews/employee-review';

interface ReportSectionProps {
  reviewCycle: ReviewCycle;
  feedbackRequest: FeedbackRequest;
  onExportPDF: () => Promise<void>;
  onReportChange: (report: any) => void;
  onGenerateReport: (timeRange?: TimeRange) => void;
  isGeneratingReport: boolean;
  generationStep: GenerationStep;
  startTime: number | null;
  elapsedSeconds: number;
  isSaving: boolean;
}

interface TimeRange {
  preset?: 'last_week' | 'last_month' | 'last_quarter' | 'custom';
  startDate: Date;
  endDate: Date;
  label: string;
}

const MINIMUM_FEEDBACK_COUNT = 3;

const timeRangePresets = [
  { preset: 'last_week' as const, label: 'Last 7 days', days: 7 },
  { preset: 'last_month' as const, label: 'Last 30 days', days: 30 },
  { preset: 'last_quarter' as const, label: 'Last 3 months', days: 90 },
];

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
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(() => ({
    preset: 'last_month',
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
    label: 'Last 30 days'
  }));
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();

  const isM2E = reviewCycle?.type === 'manager_to_employee';
  const feedbackCount = feedbackRequest?.feedback?.length || 0;
  const hasMinimumFeedback = feedbackCount >= MINIMUM_FEEDBACK_COUNT;

  // Get feedback density info
  const getFeedbackDensity = (count: number) => {
    if (count < 3) {
      return { 
        color: 'text-red-600', 
        bgColor: 'bg-red-50 border-red-200',
        message: `${count} feedback entries - need at least ${MINIMUM_FEEDBACK_COUNT} for report generation`,
        suggestion: 'insufficient'
      };
    } else if (count <= 8) {
      return { 
        color: 'text-yellow-600', 
        bgColor: 'bg-yellow-50 border-yellow-200',
        message: `${count} feedback entries - consider adding more for richer insights`,
        suggestion: 'good'
      };
    } else {
      return { 
        color: 'text-green-600', 
        bgColor: 'bg-green-50 border-green-200',
        message: `${count} feedback entries - excellent for comprehensive report`,
        suggestion: 'excellent'
      };
    }
  };

  const densityInfo = getFeedbackDensity(feedbackCount);

  const handleTimeRangeChange = (preset: string) => {
    if (preset === 'custom') {
      setSelectedTimeRange({
        preset: 'custom',
        startDate: customStartDate || subDays(new Date(), 30),
        endDate: customEndDate || new Date(),
        label: 'Custom range'
      });
    } else {
      const presetConfig = timeRangePresets.find(p => p.preset === preset);
      if (presetConfig) {
        setSelectedTimeRange({
          preset: presetConfig.preset,
          startDate: subDays(new Date(), presetConfig.days),
          endDate: new Date(),
          label: presetConfig.label
        });
      }
    }
  };

  const existingReport = feedbackRequest?.ai_reports?.[0];

  return (
    <section id="ai-report" className="space-y-4 py-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Generate Report</h2>
        <p className="text-sm text-muted-foreground">
          {isM2E 
            ? "Create a comprehensive feedback report from submitted feedback entries"
            : "Generate an AI-powered analysis report"
          }
        </p>
      </div>

      {/* M2E Time Range Selection and Generation */}
      {isM2E && (
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Report Generation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Feedback Count and Density */}
            <div className={cn("p-3 rounded-lg border", densityInfo.bgColor)}>
              <div className="flex items-center gap-2">
                {densityInfo.suggestion === 'insufficient' ? (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <Badge variant="outline" className={densityInfo.color}>
                    {feedbackCount} entries
                  </Badge>
                )}
                <span className={cn("text-sm font-medium", densityInfo.color)}>
                  {densityInfo.message}
                </span>
              </div>
            </div>

            {/* Time Range Selection */}
            <div className="space-y-3">
              <Label>Time Range</Label>
              <Select
                value={selectedTimeRange.preset || 'custom'}
                onValueChange={handleTimeRangeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  {timeRangePresets.map((preset) => (
                    <SelectItem key={preset.preset} value={preset.preset}>
                      {preset.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom date range</SelectItem>
                </SelectContent>
              </Select>

              {/* Custom Date Range */}
              {selectedTimeRange.preset === 'custom' && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !customStartDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customStartDate ? format(customStartDate, "PPP") : "Pick start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={customStartDate}
                          onSelect={setCustomStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !customEndDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customEndDate ? format(customEndDate, "PPP") : "Pick end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={customEndDate}
                          onSelect={setCustomEndDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <Button
              onClick={() => onGenerateReport(selectedTimeRange)}
              disabled={!hasMinimumFeedback || isGeneratingReport}
              className="w-full"
              size="lg"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Existing Report or Non-M2E Report */}
      {(existingReport || !isM2E) && (
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
          hideHeader={isM2E} // Hide redundant header for M2E
        />
      )}
    </section>
  );
} 