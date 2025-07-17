# Manager-to-Employee Feedback System - PRD

## Project Overview

### Vision
Complete the holistic review ecosystem by adding the third pillar: **Manager-to-Employee Feedback**. This enables continuous feedback collection and report generation to complement our existing 360 feedback and manager effectiveness surveys.

### Core Value Proposition
- **Continuous Feedback**: Managers capture observations in real-time rather than waiting for formal review cycles
- **Frictionless Input**: Multiple input methods (web text, voice-to-text, future Slack integration)
- **AI-Enhanced Processing**: Automatic categorization and follow-up questions to improve feedback quality
- **Consolidated Reporting**: Aggregate feedback into actionable reports using existing infrastructure
- **Manager Control**: Managers review and edit reports before delivery to employees

## User Stories

### Manager (Primary User)
- As a manager, I want to create a "Manager-to-Employee Feedback" review cycle so I can organize continuous feedback for my team
- As a manager, I want to add team members to my feedback cycle so I can provide ongoing observations about their performance
- As a manager, I want to quickly record feedback observations about employees in my active cycle so I can capture insights while they're fresh
- As a manager, I want to use voice-to-text on mobile so I can record feedback while commuting or between meetings
- As a manager, I want AI to help categorize my feedback so I don't have to think about structure
- As a manager, I want to generate comprehensive reports from accumulated feedback within a cycle so I can have meaningful conversations with employees
- As a manager, I want to review and edit AI-generated reports before sharing them to ensure accuracy and tone
- As a manager, I want to toggle between different review cycle types (360, manager effectiveness, manager-to-employee) to view different types of data

### Employee (Secondary User)
- As an employee, I want to receive structured, actionable feedback from my manager so I can understand areas for improvement and growth
- As an employee, I want feedback to reference specific examples and situations so I can understand the context

## Technical Requirements

### Phase 1: Web Interface (MVP)

#### Core Features
1. **Review Cycle Creation**
   - Create "Manager-to-Employee Feedback" review cycles
   - Add/remove team members to active feedback cycles
   - Set cycle context/purpose (e.g., "Q1 Development Focus", "New Hire Onboarding")
   - Ongoing cycles without fixed end dates (unlike 360 reviews)

2. **Feedback Input Interface**
   - Employee selection from active cycle participants only
   - Text input for quick feedback entry
   - Voice-to-text recording capability
   - Mobile-optimized responsive design

3. **AI Processing Pipeline**
   - Automatic feedback categorization
   - Contextual follow-up questions when beneficial
   - Integration with existing OpenAI infrastructure

4. **Report Generation**
   - **Time Period Selection**: Manager-controlled date ranges within cycle (presets + custom ranges)
   - **Feedback Density Indicators**: Show feedback count and quality suggestions for selected periods
   - **Smart Range Suggestions**: Recommend optimal time ranges based on feedback volume within cycle
   - AI-powered report compilation using existing report generation infrastructure
   - Manager review and editing interface (reuse existing components)
   - **Report Metadata**: Clear indication of cycle and time period covered in final reports
   - Export/download capabilities

5. **Cycle Management**
   - View active manager-to-employee cycles
   - Toggle between different cycle types in dashboard
   - Archive completed cycles
   - Data separation ensures no co-mingling with 360 or manager effectiveness data

#### Time Range Selection User Experience

**Report Generation Flow**
1. **Employee Selection**: Manager selects employee for report generation
2. **Time Range Selection**: 
   - Quick presets (Last 7 days, Last 30 days, Last 3 months)
   - Custom date picker for specific ranges
   - Live preview of feedback count as range changes
3. **Density Indicator**: 
   - Green: "12 feedback entries - great for comprehensive report"
   - Yellow: "2 feedback entries - consider expanding to last 6 weeks" 
   - Red: "28 feedback entries - report will focus on key themes"
4. **Report Purpose** (Optional): "Weekly 1:1", "Quarterly Review", "Project Retrospective"
5. **Generate Report**: AI processes feedback within selected timeframe

#### Technical Architecture

**Time Range Selection System**
```typescript
interface ReportTimeRange {
  preset?: 'last_week' | 'last_month' | 'last_quarter' | 'custom';
  startDate: Date;
  endDate: Date;
  label: string;
}

interface FeedbackDensityInfo {
  feedbackCount: number;
  qualitySuggestion: 'expand_range' | 'sufficient' | 'too_large';
  suggestedRange?: ReportTimeRange;
  message: string;
}

const timeRangePresets = [
  { preset: 'last_week', label: 'Last 7 days', days: 7 },
  { preset: 'last_month', label: 'Last 30 days', days: 30 },
  { preset: 'last_quarter', label: 'Last 3 months', days: 90 },
  { preset: 'custom', label: 'Custom date range', days: null }
];

// Smart suggestions based on feedback density
const densityThresholds = {
  minimum: 3,    // < 3 entries: suggest expanding range
  optimal: 15,   // > 15 entries: suggest focusing on key themes
  maximum: 25    // > 25 entries: warn about report length
};
```

**Database Schema Extensions**
```sql
-- Manager feedback entries - integrates with existing employee/user structure
CREATE TABLE IF NOT EXISTS manager_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  category TEXT, -- AI-assigned category
  follow_up_questions JSONB, -- AI follow-up questions and responses
  source TEXT DEFAULT 'web' CHECK (source IN ('web', 'slack', 'voice')),
  is_processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Manager feedback reports - follows existing report pattern
CREATE TABLE IF NOT EXISTS manager_feedback_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- AI-generated report content
  feedback_period_start DATE NOT NULL, -- Manager-selected start date
  feedback_period_end DATE NOT NULL, -- Manager-selected end date
  time_range_preset TEXT CHECK (time_range_preset IN ('last_week', 'last_month', 'last_quarter', 'custom')),
  feedback_count INTEGER NOT NULL DEFAULT 0, -- Number of feedback entries included
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'shared')),
  report_purpose TEXT, -- Optional context (e.g., 'Weekly 1:1', 'Quarterly Review')
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link feedback entries to reports - many-to-many relationship
CREATE TABLE IF NOT EXISTS manager_feedback_report_entries (
  report_id UUID REFERENCES manager_feedback_reports(id) ON DELETE CASCADE,
  feedback_id UUID REFERENCES manager_feedback(id) ON DELETE CASCADE,
  PRIMARY KEY (report_id, feedback_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_manager_feedback_manager_user ON manager_feedback(manager_user_id);
CREATE INDEX IF NOT EXISTS idx_manager_feedback_employee ON manager_feedback(employee_id);
CREATE INDEX IF NOT EXISTS idx_manager_feedback_created_at ON manager_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_manager_feedback_reports_manager ON manager_feedback_reports(manager_user_id);
CREATE INDEX IF NOT EXISTS idx_manager_feedback_reports_employee ON manager_feedback_reports(employee_id);

-- Enable RLS following existing patterns
ALTER TABLE manager_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_feedback_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_feedback_report_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies following existing patterns from your codebase
-- Manager feedback policies
CREATE POLICY "managers_can_crud_own_feedback"
    ON manager_feedback FOR ALL
    TO authenticated
    USING (manager_user_id = auth.uid())
    WITH CHECK (manager_user_id = auth.uid());

-- Only allow managers to create feedback for their own employees
CREATE POLICY "managers_feedback_own_employees_only"
    ON manager_feedback FOR INSERT
    TO authenticated
    WITH CHECK (
        manager_user_id = auth.uid() AND
        employee_id IN (
            SELECT id FROM employees 
            WHERE user_id = auth.uid()
        )
    );

-- Manager feedback reports policies  
CREATE POLICY "managers_can_crud_own_reports"
    ON manager_feedback_reports FOR ALL
    TO authenticated
    USING (manager_user_id = auth.uid())
    WITH CHECK (manager_user_id = auth.uid());

-- Report entries policies
CREATE POLICY "report_entries_match_manager"
    ON manager_feedback_report_entries FOR ALL
    TO authenticated
    USING (
        report_id IN (
            SELECT id FROM manager_feedback_reports 
            WHERE manager_user_id = auth.uid()
        )
    )
    WITH CHECK (
        report_id IN (
            SELECT id FROM manager_feedback_reports 
            WHERE manager_user_id = auth.uid()
        )
    );

-- Add triggers for updated_at (following existing pattern)
CREATE TRIGGER update_manager_feedback_updated_at
    BEFORE UPDATE ON manager_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manager_feedback_reports_updated_at
    BEFORE UPDATE ON manager_feedback_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions following existing patterns
GRANT ALL ON manager_feedback TO authenticated;
GRANT ALL ON manager_feedback_reports TO authenticated;  
GRANT ALL ON manager_feedback_report_entries TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
```

**API Endpoints**
```typescript
// Feedback Management (follows existing pattern of user-based endpoints)
POST /api/manager-feedback/submit
GET /api/manager-feedback/list          // Gets feedback for authenticated user
PUT /api/manager-feedback/:feedbackId
DELETE /api/manager-feedback/:feedbackId

// AI Processing (extends existing analyze-feedback.ts)
POST /api/manager-feedback/categorize
POST /api/manager-feedback/follow-up-questions

// Report Generation (similar to existing AI report generation)
POST /api/manager-feedback/reports/generate
GET /api/manager-feedback/reports       // Gets reports for authenticated user  
GET /api/manager-feedback/reports/:reportId
PUT /api/manager-feedback/reports/:reportId
DELETE /api/manager-feedback/reports/:reportId

// Time Range Analytics
GET /api/manager-feedback/analytics/feedback-count?employee_id=:id&start_date=:date&end_date=:date
GET /api/manager-feedback/analytics/time-range-suggestions?employee_id=:id
```

**Integration with Existing System**
The new manager feedback system integrates seamlessly with current infrastructure:

- **Database**: Uses existing `auth.users` and `employees` tables, follows same UUID/RLS patterns
- **Authentication**: Leverages existing auth system, no new user management needed
- **Employee Management**: Builds on current employee-user relationships
- **Report Generation**: Extends existing `src/server/api/analyze-feedback.ts` patterns
- **Report Editing**: Reuses components from `src/components/feedback/` 
- **API Patterns**: Follows same authenticated user-based endpoint structure
- **Type System**: Extends existing types in `src/types/`

**Component Architecture**
Reuse existing infrastructure where possible:

- **Report Generation**: Extend `src/server/api/analyze-feedback.ts`
- **Report Editing**: Reuse components from `src/components/feedback/`
- **Employee Selection**: Extend `src/hooks/useEmployeesData.ts`
- **Authentication**: Use existing `src/hooks/useAuth.ts`
- **Database Queries**: Follow existing Supabase client patterns

#### New Components Needed

```typescript
// Core feedback input
src/components/manager-feedback/
├── FeedbackInputForm.tsx          # Main feedback submission form
├── VoiceToTextInput.tsx           # Voice recording component
├── EmployeeSelector.tsx           # Direct reports dropdown
├── FeedbackList.tsx               # Display manager's feedback entries
├── FeedbackEntryCard.tsx          # Individual feedback display/edit
└── hooks/
    ├── useManagerFeedback.ts      # Feedback CRUD operations
    ├── useVoiceToText.ts          # Voice recording/transcription
    ├── useReportGeneration.ts     # Report generation and editing
    ├── useTimeRangeSelection.ts   # Time period selection logic
    └── useFeedbackAnalytics.ts    # Feedback density and suggestions

// Report management (reuse existing components where possible)
src/components/manager-feedback/reports/
├── ReportGenerator.tsx            # Report creation interface with time range selection
├── TimeRangeSelector.tsx          # Time period selection component
├── FeedbackDensityIndicator.tsx   # Shows feedback count and quality suggestions
├── ReportEditor.tsx               # Edit generated reports
├── ReportsList.tsx                # Manager's reports list
└── ReportPreview.tsx              # Final report preview with time period metadata
```

#### Pages
```typescript
src/pages/manager-feedback/
├── index.tsx                      # Main feedback dashboard
├── new-feedback.tsx               # Quick feedback input
├── reports/
│   ├── index.tsx                  # Reports list
│   ├── generate.tsx               # Report generation
│   └── [reportId]/edit.tsx        # Report editing
```

### Phase 2: Slack Integration

#### Features
1. **Direct Message Bot**
   - Slack app installation and permissions
   - Natural @employee tagging pattern
   - Threaded follow-up questions
   - Integration with web interface data

2. **Notification System**
   - Weekly nudges for inactive managers
   - Report generation suggestions
   - Integration status updates

#### Technical Requirements
- Slack Bot API integration
- Webhook endpoints for Slack events
- Message parsing and employee ID resolution
- Threading for AI follow-up questions

## Success Metrics

### Adoption Metrics
- **Manager Engagement**: % of managers using the system monthly
- **Feedback Frequency**: Average feedback entries per manager per month
- **Report Generation**: % of accumulated feedback converted to reports

### Quality Metrics
- **Feedback Richness**: Average feedback length and detail level
- **AI Enhancement**: % of feedback improved through follow-up questions
- **Manager Satisfaction**: Survey scores on report quality and editing experience

### Employee Impact
- **Feedback Delivery**: % of generated reports actually shared with employees
- **Actionability**: Employee survey scores on feedback usefulness
- **Development Outcomes**: Correlation with employee performance improvements

## Implementation Timeline

### Phase 1: Web Interface (8-10 weeks)
- **Week 1-2**: Database schema and core API endpoints
- **Week 3-4**: Feedback input interface and AI processing
- **Week 5-6**: Time range selection and feedback density analytics
- **Week 7-8**: Report generation integration with time ranges
- **Week 9-10**: Mobile optimization and testing

### Phase 2: Slack Integration (4-6 weeks)
- **Week 1-2**: Slack app setup and bot development
- **Week 3-4**: Message parsing and employee resolution
- **Week 5-6**: Testing and deployment

## Risk Mitigation

### Technical Risks
- **Voice-to-text accuracy**: Test with multiple managers, provide fallback text editing
- **AI categorization quality**: Start with simple categories, expand based on feedback
- **Mobile performance**: Progressive web app approach for native-like experience

### Adoption Risks
- **Manager resistance**: Start with pilot group, emphasize time-saving benefits
- **Inconsistent usage**: Build gentle nudges, not aggressive notifications
- **Report quality concerns**: Always allow manager editing, never auto-send to employees

## Dependencies

### Internal (Existing Infrastructure)
- **Database Schema**: `auth.users`, `employees` tables and RLS policies
- **Authentication System**: Supabase auth with existing `useAuth.ts` hook
- **Employee Management**: Current employee-user relationships via `useEmployeesData.ts`
- **AI/Report Generation**: Existing OpenAI integration and `analyze-feedback.ts` patterns
- **UI Components**: Existing feedback components for report editing
- **Database Client**: Current Supabase client configuration
- **Type System**: Existing TypeScript interfaces and types

### External
- OpenAI API for categorization and report generation
- Web Speech API for voice-to-text
- Slack API for bot integration (Phase 2)

## Definition of Done

### Phase 1 Complete When:
- [ ] Managers can submit text and voice feedback via web interface
- [ ] AI categorizes feedback and asks relevant follow-up questions
- [ ] **Time range selection works with presets and custom ranges**
- [ ] **Feedback density indicators provide helpful suggestions**
- [ ] Reports can be generated from feedback within selected time periods
- [ ] **Generated reports include clear time period metadata**
- [ ] Managers can review, edit, and finalize reports
- [ ] Mobile web interface works seamlessly
- [ ] Integration tests pass for all core workflows including time range functionality

### Phase 2 Complete When:
- [ ] Slack bot accepts @employee feedback in DMs
- [ ] Slack feedback syncs with web interface
- [ ] Follow-up questions work in Slack threads
- [ ] Weekly nudges are delivered appropriately
- [ ] End-to-end testing covers both web and Slack workflows

## Future Considerations

### Peer-to-Peer Feedback Expansion

**Vision**: Allow anyone in the organization to provide feedback about colleagues through Slack or web interface, creating a fourth pillar of comprehensive feedback coverage.

**Use Cases:**
- Slack mentions: "@john did amazing work on the client presentation today"
- Cross-team feedback: "Working with Sarah on the integration was seamless"
- Peer recognition: Real-time appreciation and constructive feedback
- 360-degree continuous feedback: Extends beyond just manager-employee relationships

**Database Readiness**: The current manager feedback design already supports this expansion:

```sql
-- Current structure supports peer feedback with minimal changes
review_cycles (type='peer_to_peer')           -- New type
feedback_requests (any_user → any_employee)   -- Relaxed permissions  
feedback_responses (
    relationship='peer' | 'cross-team' | 'colleague',  -- New relationships
    source='slack',                            -- Already supported
    category='recognition' | 'collaboration'   -- New categories
)
```

**Implementation Considerations:**
- **Permissions**: Extend RLS policies to allow peer feedback (currently manager-only)
- **UI Separation**: Keep peer feedback separate from manager feedback in reports
- **Slack Integration**: Same bot architecture, different triggering patterns
- **Moderation**: Consider approval workflows for peer feedback
- **Privacy**: Option for anonymous peer feedback vs attributed feedback

**Benefits of Current Architecture for Future Expansion:**
- ✅ Same database infrastructure (no new tables needed)
- ✅ Same API endpoints (extend with new type filtering)
- ✅ Same report generation (separate peer vs manager sections)
- ✅ Same UI components (extend existing forms)
- ✅ Source tracking already built-in for Slack integration

**Timeline**: Not planned for Phase 1, but architecture is designed to support seamless addition as Phase 3 after Slack integration is proven with manager feedback.

### Slack Integration Challenges

**Employee Name Matching**: A critical challenge for Slack integration will be accurately mapping Slack mentions to database employees.

**The Problem:**
```slack
@john-smith did amazing work on the presentation
```
**Mapping Challenges:**
- Multiple employees with same name ("John Smith" vs "John K. Smith")
- Different name formats (Slack: "john-smith", Database: "John Smith")
- Nickname usage (Slack: "@johnny", Database: "John Smith")
- Spelling variations or typos in Slack mentions

**Potential Solutions for Phase 2:**
1. **Slack User ID Mapping**: Link Slack user IDs to employee records during setup
2. **Email-Based Matching**: Match Slack email addresses to employee email fields
3. **Fuzzy Name Matching**: AI-powered name similarity scoring with confirmation prompts
4. **Manual Resolution UI**: When ambiguous, prompt manager to confirm employee selection
5. **Auto-Complete Integration**: Slack bot suggests valid employee names as user types

**Implementation Approach:**
```sql
-- Future: Employee-Slack mapping table
CREATE TABLE employee_slack_mapping (
    employee_id UUID REFERENCES employees(id),
    slack_user_id TEXT NOT NULL,
    slack_username TEXT,
    slack_display_name TEXT,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**User Experience Design:**
- **Setup Phase**: Manager connects Slack workspace and maps team members
- **Feedback Collection**: Bot suggests corrections for ambiguous mentions
- **Fallback**: Manual employee selection when auto-matching fails

**Timeline**: Address during Phase 2 Slack integration development.

---

*This PRD serves as the foundational document for implementing the third pillar of our holistic review ecosystem, with built-in extensibility for a future fourth pillar of peer-to-peer feedback.* 