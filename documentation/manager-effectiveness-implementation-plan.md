# Manager Effectiveness Survey Implementation Plan

## Overview

This document outlines the plan to enhance Squad360 with Manager Effectiveness Surveys as an alternative to the existing 360 Review functionality. This feature will allow organizations to collect structured feedback about managers using Likert scale questions and open-ended responses.

## Current Architecture

The existing Squad360 platform supports:
- Creation of review cycles
- Adding employees to review cycles
- Generating unique anonymous feedback links
- Collecting open-ended feedback (strengths/areas for improvement)
- AI-powered analysis of feedback
- Visualization of results

## Implementation Milestones

### Milestone 1: Database Schema Updates

**Goal**: Modify the database schema to support different survey types.

#### Tasks:

1. **Update `review_cycles` table**
   - Add `type` field (ENUM: '360_review', 'manager_effectiveness')
   - Default to '360_review' for backward compatibility
   - Update RLS policies to maintain proper access controls

2. **Create `survey_questions` table**
   - Fields:
     - `id`: UUID (PK)
     - `review_cycle_type`: ENUM ('360_review', 'manager_effectiveness')
     - `question_text`: text
     - `question_type`: ENUM ('likert', 'open_ended', 'multiple_choice')
     - `options`: JSONB (for multiple choice/Likert)
     - `order`: integer
     - Standard timestamps

3. **Extend `feedback_responses` table**
   - Add `responses` JSONB field to store structured responses
   - Sample structure:
     ```json
     {
       "question_id_1": 5,  // Likert response
       "question_id_2": "Text response for open-ended question"
     }
     ```

4. **Create migration scripts**
   - SQL scripts for schema changes
   - Seed data for predefined Manager Effectiveness Survey questions
   - Update indices for performance

#### Acceptance Criteria:
- Schema changes successfully applied
- Existing data remains compatible with new schema
- Survey questions properly seeded
- RLS policies updated and tested

### Milestone 2: TypeScript Type Definitions

**Goal**: Update TypeScript types to reflect database changes.

#### Tasks:

1. **Update Review Cycle types**
   ```typescript
   export type ReviewCycleType = '360_review' | 'manager_effectiveness';
   
   export interface ReviewCycle {
     // existing fields
     type: ReviewCycleType;
   }
   ```

2. **Create Survey Question types**
   ```typescript
   export type QuestionType = 'likert' | 'open_ended' | 'multiple_choice';
   
   export interface SurveyQuestion {
     id: string;
     reviewCycleType: ReviewCycleType;
     questionText: string;
     questionType: QuestionType;
     options?: any;
     order: number;
     // timestamps
   }
   ```

3. **Update Feedback Response types**
   ```typescript
   export interface FeedbackResponse {
     // existing fields
     responses?: Record<string, string | number>;
   }
   ```

4. **Create specialized types for Likert-scale analytics**
   ```typescript
   export interface LikertAnalytics {
     questionId: string;
     questionText: string;
     averageScore: number;
     responseCount: number;
     distribution: Record<number, number>; // score -> count
   }
   ```

#### Acceptance Criteria:
- All type definitions properly reflect database schema
- Types are properly exported and imported
- Existing component typings updated to use new types

### Milestone 3: API & Data Access Layer

**Goal**: Create or update API functions to interact with the modified schema.

#### Tasks:

1. **Create function to fetch survey questions by type**
   ```typescript
   async function getSurveyQuestions(type: ReviewCycleType): Promise<SurveyQuestion[]>
   ```

2. **Update function to create review cycles**
   ```typescript
   async function createReviewCycle(data: CreateReviewCycleInput & { type: ReviewCycleType }): Promise<ReviewCycle>
   ```

3. **Create function to submit structured survey responses**
   ```typescript
   async function submitSurveyResponses(feedbackRequestId: string, relationship: string, responses: Record<string, string | number>): Promise<FeedbackResponse>
   ```

4. **Create function to fetch and analyze Likert responses**
   ```typescript
   async function analyzeManagerEffectivenessResponses(feedbackRequestId: string): Promise<LikertAnalytics[]>
   ```

#### Acceptance Criteria:
- All functions properly interacting with database
- Error handling implemented
- Functions tested with unit tests
- Proper type safety throughout

### Milestone 4: Review Cycle Creation UI

**Goal**: Modify the review cycle creation interface to support different survey types.

#### Tasks:

1. **Update `NewReviewCyclePage.tsx`**
   - Add survey type selector UI (radio buttons or toggle)
   - Add description and preview for each type
   - Update form state to include type
   - Modify submission logic to save type

2. **Create survey type preview component**
   - Show sample questions based on selected type
   - Provide clear description of each survey type's purpose

3. **Update review cycle list to indicate survey type**
   - Add type indicator in the review cycle card/list
   - Filter/sort options based on type

#### Acceptance Criteria:
- Users can select survey type when creating a review cycle
- UI clearly shows the difference between types
- Existing review cycles marked as '360_review' by default
- Form validation works correctly

### Milestone 5: Dynamic Survey Form Components

**Goal**: Create UI components that render different question types.

#### Tasks:

1. **Create `LikertScaleQuestion.tsx` component**
   - Render 5-point scale from "Strongly Disagree" to "Strongly Agree"
   - Support for labels above each option
   - Mobile-responsive design

2. **Create `OpenEndedQuestion.tsx` component**
   - Similar to existing textarea but with specific validation
   - Character count and suggestions

3. **Create `DynamicSurveyForm.tsx` component**
   - Accept array of questions
   - Render appropriate component based on question type
   - Handle validation and submission

4. **Update or refactor `FeedbackForm.tsx`**
   - Make it a special case of DynamicSurveyForm or
   - Refactor to use shared components

#### Acceptance Criteria:
- All question types render correctly
- Mobile-responsive design
- Proper validation for each question type
- Accessible UI components (keyboard navigation, screen readers)

### Milestone 6: Survey Response Collection

**Goal**: Implement the response collection flow for Manager Effectiveness Surveys.

#### Tasks:

1. **Update `FeedbackFormPage.tsx`**
   - Fetch survey questions based on review cycle type
   - Conditionally render the appropriate form
   - Handle structured response submissions

2. **Implement response validation**
   - Required field validation for Likert questions
   - Text length requirements for open-ended questions

3. **Create progress indicator**
   - Show completion status (e.g., 3/8 questions answered)
   - Allow partial saves (if needed)

4. **Update `ThankYouPage.tsx`**
   - Customize message based on survey type

#### Acceptance Criteria:
- Users can successfully complete manager effectiveness surveys
- All responses properly saved to database
- Validation prevents incomplete submissions
- UI provides clear feedback on progress

### Milestone 7: AI Integration for Manager Surveys

**Goal**: Adapt AI review process for different survey types.

#### Tasks:

1. **Create specialized prompt for manager survey open-ended responses**
   - Focus on constructive manager feedback
   - Check for specific, actionable suggestions

2. **Update `AiFeedbackReview.tsx`**
   - Make it conditional based on survey type
   - Only process open-ended responses, not Likert

3. **Implement manager-specific analysis**
   - Create specialized insights for management skills
   - Categorize feedback into management competencies

#### Acceptance Criteria:
- AI review appropriately handles manager survey responses
- Specialized prompts for manager-related feedback
- Only open-ended questions reviewed by AI
- Clear UI differentiating between survey types

### Milestone 8: Reporting & Visualization

**Goal**: Create visualizations and reports for Manager Effectiveness Surveys.

#### Tasks:

1. **Create Likert scale visualization component**
   - Bar charts showing response distribution
   - Average score calculation
   - Color-coding based on scores

2. **Implement manager effectiveness dashboard**
   - Overview of Likert responses
   - Highlight areas of strength/improvement
   - Comparison with previous surveys (if available)

3. **Create PDF export for manager reports**
   - Formatted report with Likert visualizations
   - Anonymized open-ended responses
   - Summary statistics

#### Acceptance Criteria:
- Clear, informative visualizations of Likert responses
- Dashboard shows meaningful insights
- Reports can be exported as PDFs
- Data properly anonymized in reports

### Milestone 9: Testing & Quality Assurance

**Goal**: Ensure all new features are thoroughly tested.

#### Tasks:

1. **Create unit tests for new components**
   - Test survey question components
   - Test Likert scale validation
   - Test analytics calculations

2. **End-to-end testing**
   - Complete flow from review cycle creation to report generation
   - Test with various question combinations
   - Test on multiple devices and browsers

3. **Security testing**
   - Verify RLS policies
   - Test anonymous access
   - Ensure data isolation between organizations

#### Acceptance Criteria:
- All tests passing
- Coverage report showing adequate test coverage
- Security audit passed
- Performance benchmarks met

### Milestone 10: Documentation & Deployment

**Goal**: Update documentation and deploy the new features.

#### Tasks:

1. **Update user documentation**
   - Add guide for creating manager effectiveness surveys
   - Add FAQ for the new survey type
   - Create sample survey templates

2. **Update technical documentation**
   - Update database schema diagrams
   - Update API documentation
   - Document new components

3. **Create deployment plan**
   - Database migration strategy
   - Rollback procedures
   - Monitoring plan

4. **Deploy to production**
   - Run migrations
   - Deploy code changes
   - Monitor for issues

#### Acceptance Criteria:
- Documentation updated and accessible
- Successful deployment to production
- No regression in existing functionality
- Monitoring in place for new features

## Technical Considerations

### Database Performance
- Add appropriate indices for queries on `survey_questions`
- Consider query performance for analytics on JSONB fields
- Monitor response retrieval performance

### UI/UX Consistency
- Maintain consistent styling between survey types
- Use existing UI components where possible
- Ensure mobile responsiveness throughout

### Testing Strategy
- Unit tests for all new components
- Integration tests for the survey flow
- End-to-end tests for complete user journeys

### Data Migration
- Add default type to existing review cycles
- Ensure backward compatibility for API consumers
- Verify existing analytics still function correctly

## Dependencies Between Tasks

- Database schema updates (Milestone 1) must be completed before updating TypeScript types (Milestone 2)
- Type definitions (Milestone 2) must be completed before API layer changes (Milestone 3)
- API layer (Milestone 3) must be ready before UI components can be fully implemented (Milestones 4-6)
- Survey form components (Milestone 5) required for response collection (Milestone 6)
- Complete response collection (Milestone 6) needed before analytics/reporting (Milestone 8)

## Risk Management

### Potential Risks
1. **Data structure compatibility** - Ensure old and new data formats coexist
2. **Performance issues** - Monitor query performance with JSONB fields
3. **UI complexity** - Test thoroughly on all devices
4. **AI integration** - Validate AI effectiveness with new question formats

### Mitigation Strategies
1. Extensive testing with existing data
2. Performance benchmarking before deployment
3. Progressive enhancement for complex UI components
4. A/B testing of AI analysis on different question types

## Success Metrics

- **Adoption rate**: Percentage of users creating manager effectiveness surveys
- **Completion rate**: Percentage of started surveys that get completed
- **User satisfaction**: Feedback on the new survey format
- **Insights quality**: Manager assessment of the usefulness of feedback

## Conclusion

This implementation plan provides a structured approach to adding Manager Effectiveness Surveys to the Squad360 platform. By following these milestones, we can ensure a smooth development process and high-quality end result that maintains compatibility with existing features while expanding functionality. 