import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Sparkles, AlertCircle } from 'lucide-react';
import { format, subDays, subMonths, isAfter, startOfDay, endOfDay } from 'date-fns';
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

  // Calculate filtered feedback count based on selected time range
  const filteredFeedbackCount = useMemo(() => {
    if (!feedbackRequest?.feedback?.length) return 0;
    
    return feedbackRequest.feedback.filter((feedback) => {
      // Use submitted_at if available, otherwise fall back to created_at
      const feedbackDate = feedback.submitted_at || feedback.created_at;
      if (!feedbackDate) return true; // Include feedback without dates
      
      const date = new Date(feedbackDate);
      
      // Use full day ranges: start of day for start date, end of day for end date
      const rangeStart = startOfDay(selectedTimeRange.startDate);
      const rangeEnd = endOfDay(selectedTimeRange.endDate);
      
      return date >= rangeStart && date <= rangeEnd;
    }).length;
  }, [feedbackRequest?.feedback, selectedTimeRange.startDate, selectedTimeRange.endDate]);

  const totalFeedbackCount = feedbackRequest?.feedback?.length || 0;
  const hasMinimumFeedback = filteredFeedbackCount >= MINIMUM_FEEDBACK_COUNT;

  // Get feedback density info with cleaner, non-redundant messaging
  const getFeedbackDensity = (filteredCount: number, totalCount: number) => {
    if (filteredCount < 3) {
      return { 
        color: 'text-red-600',
        icon: <AlertCircle className="h-4 w-4 text-red-500" />,
        message: `Need at least ${MINIMUM_FEEDBACK_COUNT} entries for report generation`,
        suggestion: 'insufficient'
      };
    } else if (filteredCount <= 8) {
      return { 
        color: 'text-yellow-600',
        icon: null,
        message: `Consider adding more feedback for richer insights`,
        suggestion: 'good'
      };
    } else {
      return { 
        color: 'text-green-600',
        icon: null,
        message: `Excellent volume for comprehensive report`,
        suggestion: 'excellent'
      };
    }
  };

  const densityInfo = getFeedbackDensity(filteredFeedbackCount, totalFeedbackCount);

  // Function to disable future dates (dates after today)
  const disableFutureDates = (date: Date) => {
    const today = startOfDay(new Date());
    const checkDate = startOfDay(date);
    return isAfter(checkDate, today);
  };

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

  // Update the custom date range when dates are selected
  const handleCustomStartDateSelect = (date: Date | undefined) => {
    setCustomStartDate(date);
    if (date && selectedTimeRange.preset === 'custom') {
      setSelectedTimeRange(prev => ({
        ...prev,
        startDate: date,
        label: 'Custom range'
      }));
    }
  };

  const handleCustomEndDateSelect = (date: Date | undefined) => {
    setCustomEndDate(date);
    if (date && selectedTimeRange.preset === 'custom') {
      setSelectedTimeRange(prev => ({
        ...prev,
        endDate: date,
        label: 'Custom range'
      }));
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
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {/* Compact feedback count and message */}
              <div className="flex items-center gap-2">
                {densityInfo.icon}
                <Badge variant="outline" className="text-xs">
                  {filteredFeedbackCount}
                  {filteredFeedbackCount !== totalFeedbackCount && (
                    <span className="text-muted-foreground">/{totalFeedbackCount}</span>
                  )}
                  &nbsp;entries
                </Badge>
                <span className={cn("text-xs", densityInfo.color)}>
                  {densityInfo.message}
                </span>
              </div>

              {/* Horizontal time range and generate button layout */}
              <div className="flex gap-3 items-end">
                <div className="flex-1 min-w-0">
                  <Label className="text-xs font-medium text-muted-foreground">Time Range</Label>
                  <Select
                    value={selectedTimeRange.preset || 'custom'}
                    onValueChange={handleTimeRangeChange}
                  >
                    <SelectTrigger className="mt-1 h-8">
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
                </div>
                
                <Button
                  onClick={() => onGenerateReport(selectedTimeRange)}
                  disabled={!hasMinimumFeedback || isGeneratingReport}
                  size="sm"
                  className="shrink-0 h-8"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  {existingReport ? 'Generate New' : 'Generate'}
                </Button>
              </div>

              {/* Custom Date Range Pickers - Only when needed */}
              {selectedTimeRange.preset === 'custom' && (
                <div className="flex gap-2 pt-1">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal mt-1 h-8 text-xs",
                            !customStartDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                          {customStartDate ? format(customStartDate, "MMM d") : "Start"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={customStartDate}
                          onSelect={handleCustomStartDateSelect}
                          disabled={disableFutureDates}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal mt-1 h-8 text-xs",
                            !customEndDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                          {customEndDate ? format(customEndDate, "MMM d") : "End"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={customEndDate}
                          onSelect={handleCustomEndDateSelect}
                          disabled={disableFutureDates}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show Existing Report for M2E if it exists */}
      {isM2E && existingReport && (
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
      )}

      {/* Non-M2E Report Display */}
      {!isM2E && (
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
          hideHeader={true}
        />
      )}
    </section>
  );
} 