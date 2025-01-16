# Team Competency Analysis Methodology

## Executive Summary
Our team competency analysis system transforms qualitative feedback into quantitative insights using AI-powered analysis. The system:
- Collects anonymous written feedback from peers, managers, and direct reports
- Uses GPT to analyze feedback and extract specific examples of behaviors and impact
- Maps feedback to seven core competencies with standardized scoring
- Aggregates individual scores into team-wide insights
- Provides confidence levels based on evidence quality and quantity
- Visualizes results through interactive radar charts and detailed breakdowns

The goal is to provide managers with reliable, data-driven insights into team strengths and development areas while maintaining anonymity and ensuring fair evaluation.

## Why This Approach?

### 1. The Challenge
Traditional performance reviews often suffer from:
- Subjective scoring without concrete evidence
- Inconsistent evaluation criteria across reviewers
- Difficulty in aggregating qualitative feedback
- Bias in numerical ratings without context
- Limited insights into team-wide patterns

### 2. Our Solution
We address these challenges through:
- AI-powered analysis of written feedback for objectivity
- Standardized competency framework for consistency
- Evidence-based scoring with clear examples
- Conservative confidence assessment for reliability
- Visual tools for pattern recognition
- Aggregation methods that prevent individual bias

### 3. Key Benefits
- **For Managers**:
  - Data-driven insights for team development
  - Clear view of team strengths and gaps
  - Evidence-backed performance discussions
  - Objective basis for development planning

- **For Employees**:
  - Fair, consistent evaluation criteria
  - Anonymous feedback incorporation
  - Clear competency expectations
  - Specific, actionable insights

- **For Organizations**:
  - Standardized performance measurement
  - Scalable feedback processing
  - Objective skill gap analysis
  - Data-driven development planning

## Overview
Our 360-degree feedback system aggregates individual employee feedback into a team-wide competency analysis. This document outlines our methodology for calculating, aggregating, and displaying team competency scores and confidence levels.

## Core Concepts

### 1. Feedback Analysis Process
- Each employee receives written feedback from multiple reviewers (peers, managers, direct reports)
- The feedback is processed by OpenAI's GPT model to:
  1. Extract specific examples and evidence of behaviors
  2. Analyze the sentiment and impact of the feedback
  3. Map feedback to our core competency framework
  4. Generate quantitative scores (0-5) based on the analysis
  5. Determine confidence levels based on specificity and context

### 2. Analysis Framework
Each piece of feedback is analyzed against specific aspects of our core competencies:

#### Technical/Functional Expertise
- Role-specific skills and knowledge
- Industry and domain expertise
- Technical proficiency and best practices
- Knowledge sharing and documentation
- Problem-solving capabilities

#### Leadership & Influence
- Taking initiative and ownership
- Guiding and inspiring others
- Influencing outcomes positively
- Mentoring and role modeling
- Creating and communicating vision

#### Collaboration & Communication
- Information sharing effectiveness
- Cross-team collaboration
- Clarity of communication
- Stakeholder management
- Conflict resolution skills

#### Innovation & Problem-Solving
- Creative solution generation
- Adaptability to change
- Initiative in improvements
- Collaborative ideation
- Impact of implemented solutions

#### Execution & Accountability
- Meeting deadlines and commitments
- Quality of deliverables
- Ownership of outcomes
- Problem resolution
- Project completion track record

#### Emotional Intelligence & Culture Fit
- Self-awareness
- Empathy and respect
- Cultural alignment
- Interpersonal effectiveness
- Conflict management

#### Growth & Development
- Continuous learning mindset
- Skill development progress
- Feedback receptiveness
- Knowledge sharing
- Goal setting and achievement

### 3. AI Analysis Process
For each piece of feedback:
1. **Text Analysis**
   - Natural language processing to understand context and sentiment
   - Identification of specific examples and behaviors
   - Recognition of impact and outcomes

2. **Competency Mapping**
   - Matching feedback content to relevant competencies
   - Identifying which aspects of each competency are evidenced
   - Determining the strength of evidence for each competency

3. **Score Generation and Display**
   - Scores are displayed with one decimal precision (e.g., 4.2/5.0)
   - Progress bars visualize scores with quarter segments
   - Benchmark of 3.5 represents meeting expectations:
     - Below 3.0: Needs improvement
     - 3.0-3.5: Approaching expectations
     - 3.5: Meeting expectations
     - 3.5-4.0: Exceeding expectations
     - 4.0+: Significantly exceeding expectations

4. **Outlier Management**
   Our sophisticated outlier detection system uses multiple methods to ensure fair and accurate score adjustments:

   1. **Multi-Method Detection**
      - Z-score Analysis: Identifies statistical deviations from mean
      - Boxplot Method: Uses interquartile range (IQR) for outlier boundaries
      - Contextual Validation: Applies domain-specific thresholds by competency type

   2. **Relationship-Aware Processing**
      - Groups scores by relationship type (senior, peer, junior)
      - Requires minimum sample size per relationship (default: 2)
      - Considers both global and relationship-specific outliers
      - Only applies adjustments if score is outlier in both contexts

   3. **Confidence-Based Weighting**
      Incorporates feedback confidence in outlier calculations:
      - High confidence scores: 100% of base weight
      - Medium confidence: 85% of base weight
      - Low confidence: 70% of base weight

   4. **Contextual Thresholds**
      Different valid ranges for different competency types:
      - Technical skills: 1.5 - 5.0 (rarely below intermediate level)
      - Leadership: 1.0 - 5.0 (wider acceptable range)
      - Collaboration: 2.0 - 5.0 (higher minimum threshold)

   5. **Graduated Adjustment System**
      Three-tier adjustment based on severity:
      - Extreme outliers: 
        - Beyond 3σ from mean
        - Outside IQR bounds with high z-score
        - Violating contextual thresholds
        - Result: 50% weight reduction
      - Moderate outliers:
        - Beyond 2σ from mean
        - Outside IQR bounds
        - Result: 25% weight reduction
      - Normal scores:
        - Within acceptable statistical bounds
        - Result: No adjustment

   6. **Implementation Details**
      - Minimum 3 samples required for outlier detection
      - Uses IQR multiplier of 1.5 for boxplot boundaries
      - Preserves original scores while adjusting weights
      - Maintains detailed adjustment audit trail
      - Provides visual indicators for adjusted scores

   This comprehensive approach ensures that:
   - Extreme feedback doesn't disproportionately impact scores
   - Different competency types are evaluated appropriately
   - Relationship context is properly considered
   - Confidence levels influence score impact
   - Adjustments are transparent and traceable

5. **Evidence Organization**
   Evidence is collected and displayed in three key areas:
   - Supporting quotes from feedback
   - Specific examples of impact
   - Context for score adjustments

### UI Components and Visualization

1. **Competency Summary Cards**
   - Competency name with confidence badge
   - Five key aspects displayed with bullet separators
   - Score display (X.X/5.0)
   - Evidence count
   - Progress bar with quarter segments
   - Expand/collapse functionality for details

2. **Expanded View Details**
   - Current level performance description
   - Growth opportunities
   - Supporting evidence quotes
   - Analysis details including:
     - Evidence base metrics
     - Score consistency indicators
     - Calculation methodology

3. **Confidence Visualization**
   Confidence levels are indicated through:
   - Color-coded badges (green/yellow/red)
   - Progress bar styling
   - Detailed tooltips explaining confidence factors

### 4. Confidence Calculation
Our confidence calculation system uses a comprehensive, multi-factor approach to determine the reliability of competency scores:

#### Confidence Factors

1. **Evidence Quantity (35% weight)**
   - Measures unique pieces of evidence across all reviews with diminishing returns
   - Evidence is tracked per reviewer per competency using a unique identifier (relationship + reviewerId)
   - First piece of evidence from each reviewer counts fully (1.0)
   - Additional pieces from the same reviewer for the same competency follow diminishing returns:
     ```
     2nd piece: 0.5
     3rd piece: 0.25
     4th piece: 0.125
     5th piece: 0.0625
     ...and so on
     ```
   - Formula: effectiveCount = 1 + sum(0.5^n) for n = 1 to (totalPieces - 1)
   - Normalized score (0-1) with maximum at 15 unique effective pieces
   - Formula: `min(1, totalEffectiveEvidence / 15)`
   - Prevents over-inflation from repeated mentions by the same reviewer
   - Each reviewer's contributions are calculated independently

2. **Score Consistency (25% weight)**
   - Analyzes variance in scores across all feedback
   - Perfect consistency (0 variance) = 1.0 score
   - High variance (≥2.0) = 0.0 score
   - Formula: `max(0, 1 - (variance / 2))`

3. **Relationship Coverage (25% weight)**
   - Evaluates diversity of feedback sources
   - Based on number of relationship types represented
   - Maximum score requires all three types (senior, peer, junior)
   - Formula: `relationshipCount / 3`

4. **Distribution Quality (15% weight)**
   - Measures how evenly feedback is distributed across relationships
   - Compares actual vs. ideal distribution
   - Perfect distribution = equal representation from each relationship
   - Formula: `1 - Σ|actualCount - idealCount| / (totalScores * 2)`

#### Confidence Level Determination

The final confidence level is determined by both the weighted score and specific thresholds:

1. **High Confidence** requires ALL of:
   - 12+ effective evidence pieces
   - Consistency score ≥ 0.5
   - Final weighted score ≥ 0.65

2. **Medium Confidence** requires EITHER:
   - 8+ effective evidence pieces AND consistency score ≥ 0.3
   - OR consistency score ≥ 0.5 AND final weighted score ≥ 0.55

3. **Low Confidence**:
   - Assigned when neither high nor medium criteria are met

#### Final Score Calculation
```typescript
finalScore = (evidenceScore * 0.35) +
             (consistencyScore * 0.25) +
             (relationshipScore * 0.25) +
             (distributionQuality * 0.15)
```

This comprehensive scoring system ensures that confidence levels accurately reflect both the quantity and quality of feedback, while considering the diversity and distribution of feedback sources.

### 5. Data Requirements
- Minimum 5 reviews per employee for inclusion
- Reviews must span multiple relationship types
- Each review must provide specific examples
- Regular review cycles for current data
- Consistent scoring across all competencies
- Proper relationship tagging for weighting
- Complete competency coverage in feedback 

## Aggregation Methodology

### 1. Individual Analysis
- Each relationship type (senior, peer, junior) is analyzed separately by GPT
- Scores are assigned on a 0-5 scale with one decimal precision (e.g., 4.2/5.0)
- Evidence quotes are collected to support each score
- Initial confidence is determined based on evidence count and quality

### 2. Aggregate Score Calculation
Our weighted scoring system balances multiple factors:

#### Relationship Weights (40/35/25 Split)
- Senior Feedback (40%): Prioritizes strategic oversight and experience
- Peer Feedback (35%): Values day-to-day collaboration insights
- Junior Feedback (25%): Incorporates upward management perspective

Weights are normalized based on available relationships. If a relationship type has no responses, its weight is redistributed proportionally among the available types.

#### Confidence Assessment
Confidence levels are determined by:
1. Total Evidence Count
   - High: 10+ pieces of evidence
   - Medium: 5-9 pieces of evidence
   - Low: <5 pieces of evidence

2. Score Consistency
   - Variance between relationship scores is calculated
   - Low variance (<1.0) increases confidence
   - High variance (>2.0) decreases confidence

3. Relationship Coverage
   - High confidence requires at least 2 different relationship types
   - Single relationship type limits confidence to medium/low

#### Evidence Collection
- Evidence quotes are combined from all relationship perspectives
- Displayed with collapsible UI (2 quotes by default, expandable)
- Maintains traceability to support scores

#### Outlier Management
Statistical outliers are detected and adjusted:
- Extreme scores (>3σ from mean): 50% weight reduction
- Moderate outliers (2-3σ from mean): 25% weight reduction
- Normal scores: Full weight maintained
- Adjustments are clearly indicated in the UI
- Original scores are preserved for reference

### 3. Display and Visualization
- Scores shown with consistent precision (X.X/5.0 format)
- Confidence levels visually indicated through colors and badges
- Interactive tooltips explain methodology and evidence
- Radar charts for team-wide pattern visualization
- Collapsible sections for detailed evidence review

#### Progress Bar Color Scheme
Progress bars use a semantic color system to indicate performance levels:
- Green (≥4.0): Significantly exceeding expectations
- Blue (≥3.5): Exceeding expectations
- Yellow (≥3.0): Meeting expectations
- Orange (≥2.5): Approaching expectations
- Red (<2.5): Needs improvement

Confidence levels are reflected through opacity:
- High confidence: 100% opacity
- Medium confidence: 70% opacity
- Low confidence: 40% opacity

This dual-encoding (color + opacity) helps quickly identify both performance level and confidence in the assessment.

### 4. Confidence Calculation
Team-wide confidence levels are determined by:
1. Evidence Count: Minimum threshold of 5 reviews
2. Score Consistency: Variance analysis across reviews
3. Relationship Mix: Diversity of feedback sources

Final confidence is calculated as a weighted average:
- High: ≥ 0.9 weighted confidence score
- Medium: ≥ 0.7 weighted confidence score
- Low: < 0.7 weighted confidence score

### 5. Data Requirements
- Minimum 5 reviews per employee for inclusion
- Reviews must span multiple relationship types
- Each review must provide specific examples
- Regular review cycles for current data
- Consistent scoring across all competencies
- Proper relationship tagging for weighting
- Complete competency coverage in feedback 

## Score Weighting and Aggregation

### Relationship Weighting
Feedback from different relationship types is weighted according to their relative importance:
- Senior feedback: 40% weight
- Peer feedback: 35% weight
- Junior feedback: 25% weight

### Aggregation Process
1. Individual Perspective Scores
   - Each relationship type (senior, peer, junior) provides raw scores for competencies
   - Scores are kept unweighted at the individual relationship level for transparency

2. Aggregate Score Calculation
   - For each competency, a weighted average is calculated using:
     ```typescript
     weightedScore = (seniorScore * normalizedSeniorWeight) +
                    (peerScore * normalizedPeerWeight) +
                    (juniorScore * normalizedJuniorWeight)
     ```
   - Weights are normalized based on available relationships:
     - If a relationship type has no responses, its weight is redistributed proportionally
     - Example: If no junior feedback, senior weight becomes ~53.3% (40/75) and peer weight becomes ~46.7% (35/75)

3. Dynamic Weight Adjustment
   - System automatically adjusts weights when certain relationship types are missing
   - Total weight always sums to 100% after normalization
   - Preserves relative importance ratios between available relationship types

### Example Calculations
1. Complete Feedback Set:
   - Senior score: 4.0 (40% weight)
   - Peer score: 3.5 (35% weight)
   - Junior score: 3.0 (25% weight)
   - Final score: (4.0 * 0.4) + (3.5 * 0.35) + (3.0 * 0.25) = 3.575

2. Missing Junior Feedback:
   - Senior score: 4.0 (normalized to ~53.3%)
   - Peer score: 3.5 (normalized to ~46.7%)
   - Final score: (4.0 * 0.533) + (3.5 * 0.467) = 3.767 