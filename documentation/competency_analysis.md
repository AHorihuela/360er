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

## Core Components

### 1. Scoring System
- Scores range from 1.0 to 5.0 with one decimal precision
- Minimum 5 reviews required for analysis (MIN_REVIEWS_REQUIRED)
- Relationship-weighted scoring:
  ```typescript
  const RELATIONSHIP_WEIGHTS = {
    senior: 0.4,   // 40%
    peer: 0.35,    // 35%
    junior: 0.25,  // 25%
    aggregate: 1   // Used for already aggregated scores
  };
  ```

### 2. Confidence Calculation
Our confidence system uses a weighted multi-factor approach:

1. **Evidence Quantity (40% weight)**
   - Tracks unique pieces of evidence with diminishing returns per reviewer
   - First piece: 1.0
   - Additional pieces: 0.5^n (n = piece number - 1)
   - Normalized against maximum of 15 effective pieces

2. **Score Consistency (30% weight)**
   - Analyzes variance in scores
   - Score = max(0, 1 - variance/2.0)
   - Perfect consistency (0 variance) = 1.0
   - High variance (≥2.0) = 0.0

3. **Relationship Coverage (20% weight)**
   - Base score:
     - 1 relationship type: 0.3
     - 2 relationship types: 0.7
     - 3 relationship types: 0.9
   - Bonus +0.1 if any relationship has ≥3 reviews

4. **Distribution Quality (10% weight)**
   - Measures evenness of feedback distribution
   - Compares actual vs ideal distribution
   - Score = max(0, 1 - (maxSkew - 1)/1.5)

### 3. Confidence Levels
Determined by both weighted score and specific thresholds:

```typescript
const CONFIDENCE_THRESHOLDS = {
  high: {
    minScore: 0.65,
    minEvidence: 12,
    minConsistency: 0.5
  },
  medium: {
    minScore: 0.55,
    minEvidence: 8,
    minConsistency: 0.3
  }
};
```

### 4. Outlier Detection
Sophisticated outlier detection using multiple methods:

```typescript
const OUTLIER_THRESHOLDS = {
  minZScore: -2,    // Scores more than 2 standard deviations below mean
  maxZScore: 2,     // Scores more than 2 standard deviations above mean
  varianceThreshold: 1.5,  // Maximum acceptable variance
  maxReduction: 0.5,      // Maximum 50% reduction for extreme outliers
  moderateReduction: 0.75, // 25% reduction for moderate outliers
  minSampleSize: 3,       // Minimum samples needed for outlier detection
  relationshipMinSamples: 2, // Minimum samples per relationship type
  iqrMultiplier: 1.5,    // IQR multiplier for boxplot method
  contextualThresholds: {
    technical: { min: 1.5, max: 5.0 },   // Technical skills rarely below 1.5
    leadership: { min: 1.0, max: 5.0 },  // Leadership can have wider range
    collaboration: { min: 2.0, max: 5.0 } // Collaboration rarely very low
  },
  confidenceWeights: {
    high: 1.0,    // Full weight for high confidence scores
    medium: 0.85, // Slightly reduced weight for medium confidence
    low: 0.7      // More reduced weight for low confidence scores
  }
};
```

### 5. Core Competencies
1. **Technical/Functional Expertise**
   - Role-specific skills and knowledge
   - Industry and domain expertise
   - Technical proficiency and best practices
   - Knowledge sharing and documentation
   - Problem-solving capabilities

2. **Leadership & Influence**
   - Taking initiative and ownership
   - Guiding and inspiring others
   - Influencing outcomes positively
   - Mentoring and role modeling
   - Creating and communicating vision

[Continue with other competencies...]

### 6. UI Components and Visualization

1. **Competency Summary Cards**
   - Competency name with confidence badge
   - Five key aspects displayed with bullet separators
   - Score display (X.X/5.0)
   - Evidence count
   - Progress bar with quarter segments
   - Expand/collapse functionality for details

2. **Progress Bar Color Scheme**
   - Green (≥4.0): Significantly exceeding expectations
   - Blue (≥3.5): Exceeding expectations
   - Yellow (≥3.0): Meeting expectations
   - Orange (≥2.5): Approaching expectations
   - Red (<2.5): Needs improvement

   Confidence levels reflected through opacity:
   - High confidence: 100% opacity
   - Medium confidence: 70% opacity
   - Low confidence: 40% opacity

### 7. Data Requirements
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

### 5. Aggregate Confidence Calculation
The aggregate (team-wide) confidence level is calculated independently from individual competency confidence levels, considering:

1. **Review Coverage (40% weight)**
   - Ratio of completed reviews to total expected reviews
   - High confidence requires near-complete coverage (>90%)
   - Medium confidence requires substantial coverage (>70%)
   - Below 70% results in low confidence

2. **Score Consistency (30% weight)**
   - Measures variance across all competency scores
   - Lower variance (scores within ±0.5) contributes to higher confidence
   - High consistency can elevate aggregate confidence even when individual competencies show medium confidence

3. **Evidence Density (30% weight)**
   - Average number of evidence examples per competency
   - High: >10 examples per competency
   - Medium: 5-10 examples per competency
   - Low: <5 examples per competency

This explains why aggregate confidence can be "High" even when individual competencies show "Medium" confidence - the holistic view considers team-wide patterns that may indicate higher reliability than individual measurements.

#### Confidence Level Thresholds
- High Confidence: Weighted score ≥ 0.85
- Medium Confidence: Weighted score ≥ 0.70
- Low Confidence: Weighted score < 0.70 