# Quantitative Feedback Analytics Framework

Below is the framework that outlines how our model processes and scores feedback, ensuring consistent and actionable data for both managers and employees.

---

## 1. Framework Overview

We work with **7 key dimensions**:

1. **Technical/Functional Expertise**  
2. **Leadership & Influence**  
3. **Collaboration & Communication**  
4. **Innovation & Problem-Solving**  
5. **Execution & Accountability**  
6. **Emotional Intelligence & Culture Fit**  
7. **Growth & Development**

### A. Scoring System
- Scores range from 1.0 to 5.0 with one decimal precision
- Minimum 5 reviews required for analysis
- Relationship-weighted scoring:
  - Senior feedback: 40%
  - Peer feedback: 35%
  - Junior feedback: 25%

### B. Confidence Calculation
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

### C. Confidence Levels
Determined by both weighted score and specific thresholds:

1. **High Confidence** requires ALL of:
   - 12+ effective evidence pieces
   - Consistency score ≥ 0.5
   - Final weighted score ≥ 0.65

2. **Medium Confidence** requires EITHER:
   - 8+ effective evidence pieces AND consistency score ≥ 0.3
   - OR consistency score ≥ 0.5 AND final weighted score ≥ 0.55

3. **Low Confidence**:
   - When neither high nor medium criteria are met

### D. Outlier Detection and Management
Sophisticated outlier detection using multiple methods:

1. **Statistical Methods**
   - Z-score analysis (±2 std dev threshold)
   - IQR method (1.5 × IQR)
   - Minimum 3 samples required

2. **Contextual Thresholds**
   - Technical skills: 1.5 - 5.0
   - Leadership: 1.0 - 5.0
   - Collaboration: 2.0 - 5.0

3. **Weight Adjustments**
   - Extreme outliers (>3σ or contextual): 50% reduction
   - Moderate outliers (2-3σ): 25% reduction
   - Confidence impact:
     - High confidence: 100% weight
     - Medium confidence: 85% weight
     - Low confidence: 70% weight

---

## 2. Competency Dimensions & Scoring Rubrics

For each dimension, we:
1. Extract relevant feedback
2. Assign scores (1-5)
3. Calculate confidence
4. Detect outliers
5. Apply relationship weighting

### 1. Technical/Functional Expertise
- **Definition**: Mastery of role-specific skills and domain knowledge
- **Contextual Range**: 1.5 - 5.0
- **Rubric**:
  - **1**: Below requirements, struggles with core functions
  - **2**: Basic competence, noticeable gaps
  - **3**: Solid proficiency, occasional guidance needed
  - **4**: Above-average expertise, coaches others
  - **5**: Top-tier expert, sets best practices

### 2. Leadership & Influence
- **Definition**: Ability to guide, inspire, or influence others (with or without direct authority).
- **Rubric**:
  - **1** = Rarely takes initiative or positively influences outcomes.  
  - **2** = Occasionally steps up but is inconsistent in guiding or motivating.  
  - **3** = Generally shows solid leadership traits, shares ideas, and helps the team move forward.  
  - **4** = Consistently leads or influences peers, acts as a role model, and fosters a positive environment.  
  - **5** = Exemplary leader/influencer; unifies others around a vision and mentors proactively.

### 3. Collaboration & Communication
- **Definition**: Effectiveness in sharing information, working across teams, and communicating clearly.
- **Rubric**:
  - **1** = Rarely collaborates, causes misunderstandings or confusion.  
  - **2** = Inconsistent; sometimes communicates effectively but can be siloed.  
  - **3** = Typically cooperative, keeps stakeholders informed, resolves issues constructively.  
  - **4** = Proactively fosters collaboration, communicates clearly, and supports team cohesion.  
  - **5** = Acts as a communication hub; unites others, addresses conflicts swiftly, drives mutual understanding.

### 4. Innovation & Problem-Solving
- **Definition**: Creativity in tackling challenges, proposing improvements, and adapting to change.
- **Rubric**:
  - **1** = Shows little initiative for new ideas or solutions.  
  - **2** = May provide occasional suggestions but rarely pursues them further.  
  - **3** = Proposes workable solutions and adapts to issues reasonably well.  
  - **4** = Actively seeks innovative approaches, encourages brainstorming, refines ideas collaboratively.  
  - **5** = Catalyzes broad-scale improvements, consistently finds creative, high-impact solutions, and inspires others to do the same.

### 5. Execution & Accountability
- **Definition**: Reliability in completing tasks on time, owning outcomes, and meeting quality standards.
- **Rubric**:
  - **1** = Frequently misses deadlines, lacks follow-through.  
  - **2** = Shows some effort but occasionally misses deliverables or quality expectations.  
  - **3** = Meets most commitments on time and accepts responsibility for outcomes.  
  - **4** = Consistently delivers high-quality work, takes initiative to solve problems.  
  - **5** = Exceptional reliability; consistently exceeds expectations and drives projects to completion.

### 6. Emotional Intelligence & Culture Fit
- **Definition**: Self-awareness, empathy, respect for organizational values, and ability to manage interpersonal dynamics.
- **Rubric**:
  - **1** = Often reactive, poor emotional control, does not align with company values.  
  - **2** = Occasional conflicts or misunderstandings; may struggle in tense situations.  
  - **3** = Generally respectful, handles most conflicts effectively, and practices self-control.  
  - **4** = Demonstrates strong empathy, fosters inclusivity, resolves interpersonal issues proactively.  
  - **5** = Exemplifies the organization's culture; adept at diffusing tension, recognized as a unifying force.

### 7. Growth & Development
- **Definition**: Commitment to ongoing skill-building, self-improvement, and—if applicable—supporting the development of others.
- **Rubric**:
  - **1** = Displays little interest in learning or building new skills.  
  - **2** = Some engagement in learning, but limited or inconsistent follow-through.  
  - **3** = Takes courses, seeks feedback, shows steady improvement over time.  
  - **4** = Actively pursues growth, regularly seeks mentorship or mentoring opportunities.  
  - **5** = Champions development for self and others, regularly sets learning goals, and shares insights broadly.

---

## 3. Instructions for the LLM

1. **Provide Role Context**  
   - Input: "Employee is a [Manager / Senior IC / Mid-Level IC / Junior IC]."  
   - **Adjust** or weigh certain categories (e.g., "Leadership & Influence" might be weighted higher for managers).

2. **Parse Feedback**  
   - For each reviewer comment, **extract** statements that pertain to any of the 7 categories.  
   - Example: "They always help solve tech problems in new ways" → positive for **Innovation & Problem-Solving**.

3. **Scoring Logic**  
   - For each category, **assign a 1–5 rating** using the rubric.  
   - If multiple reviews disagree, **average** or identify the most common rating.  
   - Provide a **short rationale** (e.g., "4 for Collaboration: 3 out of 5 reviewers praised clarity of communication, 2 were neutral").

4. **Handling Small Sample Sizes**  
   - If fewer than 3 references exist for a category, mark with a **"Low Confidence"** flag.  
   - Recommend **follow-up** (e.g., additional reviews or 1:1 discussions) to clarify.

5. **Aggregate by Reviewer Role**  
   - Group ratings by **senior, peer, junior** feedback.  
   - Produce a **combined** rating but also highlight role-specific nuances (e.g., "Peers rated Collaboration highest at 5, junior feedback was 3 due to some communication lapses").

6. **Detect Bias or Outliers**  
   - If one review is drastically off compared to others, **note** it as a potential outlier.  
   - Encourage a **manager check** or extra context gathering before taking that feedback at face value.

7. **Final Output**  
   - **Category Score Table** (7 rows for categories, columns for the score 1–5 and a confidence level).  
   - **Summary Comment** (brief bullet points covering top strengths and key improvement areas).  
   - **Recommended Next Steps** (optional) so managers/employees have clear action items.

---

## 4. Implementation Tips

- **Keep It Actionable**: Provide at least minimal guidance or suggestions with each final report (e.g., "A low Collaboration score may warrant team-building exercises").  
- **Align to Company Values**: Tailor category definitions and language to your specific corporate culture—especially for *Emotional Intelligence & Culture Fit*.  
- **Use Sample Inputs**: Provide example feedback statements and how they translate to scores and categories. This ensures consistency in how the LLM labels data.  
- **Review & Iterate**: After some real-world usage, refine the rubric or weightings to match observed performance patterns.

---

## 5. Quick Reference Table

| **Category**                         | **Score 1**                                         | **Score 3**                                            | **Score 5**                                                   |
|-------------------------------------|-----------------------------------------------------|--------------------------------------------------------|---------------------------------------------------------------|
| **Leadership & Influence**          | Rarely initiates or influences outcomes            | Solid, guides the team when needed                    | Exemplary leader, mentors proactively                          |
| **Execution & Accountability**      | Misses deadlines, lacks follow-up                  | Meets most commitments, owns outcomes                 | Exceeds expectations, drives projects to completion            |
| **Collaboration & Communication**   | Siloed, causes misunderstandings                   | Cooperative, resolves issues constructively           | Unites others, acts as a communication hub                     |
| **Innovation & Problem-Solving**    | Few creative ideas, minimal solutions              | Proposes workable solutions, adapts to challenges     | High-impact solutions, inspires others, broad-scale innovation |
| **Growth & Development**            | Little interest in improving skills                | Steady development, seeks feedback                    | Champions learning for self & team, shares insights           |
| **Technical / Functional Expertise**| Below role requirements                            | Solid proficiency, occasional gaps                    | Top-tier expert, coaches others, sets best practices          |
| **Emotional Intelligence & Culture**| Often reactive, poor alignment with values         | Generally respectful, handles conflict appropriately  | Unifying force, exemplifies values, defuses tension           |

Use this table to guide the LLM's rating logic. Each category's numerical score comes from reading feedback excerpts and deciding which part of the 1–5 rubric they best fit.

---

**By consolidating performance feedback into these 7 quantitative categories, you can generate clear, concise data—plus confidence flags and brief rationale—to support more effective 360-degree reviews.**