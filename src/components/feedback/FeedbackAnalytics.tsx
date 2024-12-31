import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown, RefreshCw } from 'lucide-react';
import { openai } from '@/lib/openai';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface Competency {
  name: string;
  score: number;
  confidence: 'low' | 'medium' | 'high';
  description: string;
  roleSpecificNotes?: string;
  evidenceCount?: number;
  evidenceQuotes?: string[];
  scoreJustification?: string;
}

interface RelationshipInsight {
  relationship: string;
  themes: string[];
  uniquePerspectives: string[];
  competencies: Competency[];
  responseCount?: number;
}

interface FeedbackResponse {
  id: string;
  relationship: string;
  strengths: string | null;
  areas_for_improvement: string | null;
  submitted_at: string;
}

interface Props {
  feedbackResponses: FeedbackResponse[];
  employeeName: string;
  employeeRole: string;
  feedbackRequestId: string;
}

interface CompetencyAssessment {
  score: number | null;  // Allow null for insufficient data
  confidence: 'low' | 'medium' | 'high';
  description: string;
  evidenceCount: number;
  isInsufficientData?: boolean;
}

// Update relationship type constants
const RELATIONSHIP_TYPES = {
  senior: 'senior',
  peer: 'peer',
  junior: 'junior'
} as const;

// Add relationship display order
const RELATIONSHIP_ORDER = [
  RELATIONSHIP_TYPES.senior,
  RELATIONSHIP_TYPES.peer,
  RELATIONSHIP_TYPES.junior
];

// Update relationship normalization function
function normalizeRelationship(relationship: string): string {
  const normalized = relationship.toLowerCase().replace(/[_\s]+/g, '');
  if (normalized.includes('senior')) return RELATIONSHIP_TYPES.senior;
  if (normalized.includes('peer') || normalized.includes('equal')) return RELATIONSHIP_TYPES.peer;
  if (normalized.includes('junior')) return RELATIONSHIP_TYPES.junior;
  // Default to peer if relationship is unclear
  return RELATIONSHIP_TYPES.peer;
}

// Create a hash of feedback responses to detect changes
function createFeedbackHash(responses: FeedbackResponse[]): string {
  return responses
    .map(r => `${r.id}-${r.submitted_at}`)
    .sort()
    .join('|');
}

// Define core competencies framework
const CORE_COMPETENCIES = {
  LEADERSHIP: {
    name: 'Leadership & Influence',
    aspects: [
      'Taking initiative',
      'Guiding and inspiring others',
      'Influencing outcomes positively',
      'Mentoring and role modeling',
      'Unifying vision'
    ],
    rubric: {
      1: 'Rarely takes initiative or influences outcomes positively',
      2: 'Occasionally steps up but shows inconsistencies in guiding or motivating others',
      3: 'Generally shows solid leadership traits, shares ideas, and helps the team move forward',
      4: 'Consistently leads or influences peers, acts as a role model, and fosters a positive environment',
      5: 'Exemplary leader/influencer; unifies others around a vision, mentors proactively'
    }
  },
  EXECUTION: {
    name: 'Execution & Accountability',
    aspects: [
      'Meeting deadlines and commitments',
      'Quality of deliverables',
      'Taking ownership of outcomes',
      'Problem resolution',
      'Project completion'
    ],
    rubric: {
      1: 'Frequently misses deadlines, lacks follow-through',
      2: 'Shows some effort but occasionally misses deliverables or quality expectations',
      3: 'Meets most commitments on time and accepts responsibility for outcomes',
      4: 'Consistently delivers high-quality work, takes initiative to solve problems',
      5: 'Exceptional reliability; consistently exceeds expectations, drives projects to completion'
    }
  },
  COLLABORATION: {
    name: 'Collaboration & Communication',
    aspects: [
      'Information sharing',
      'Cross-team effectiveness',
      'Clarity of communication',
      'Stakeholder management',
      'Conflict resolution'
    ],
    rubric: {
      1: 'Rarely collaborates, causes misunderstandings or confusion',
      2: 'Inconsistent; sometimes communicates effectively but can be siloed',
      3: 'Typically cooperative, keeps relevant stakeholders informed, and resolves issues constructively',
      4: 'Proactively fosters collaboration, communicates clearly in various formats, and supports team cohesion',
      5: 'Acts as a communication hub; consistently unites others, addresses conflicts swiftly, and drives mutual understanding'
    }
  },
  INNOVATION: {
    name: 'Innovation & Problem-Solving',
    aspects: [
      'Creative solutions',
      'Adaptability to change',
      'Initiative in improvements',
      'Collaborative ideation',
      'Impact of solutions'
    ],
    rubric: {
      1: 'Shows little initiative for new ideas or solutions',
      2: 'May provide occasional suggestions but rarely pursues them',
      3: 'Proposes workable solutions and adapts to issues reasonably well',
      4: 'Actively seeks out innovative approaches, encourages brainstorming, and refines ideas collaboratively',
      5: 'Catalyzes broad-scale improvements; consistently finds creative, high-impact solutions, and inspires others'
    }
  },
  GROWTH: {
    name: 'Growth & Development',
    aspects: [
      'Continuous learning',
      'Skill development',
      'Feedback receptiveness',
      'Knowledge sharing',
      'Goal setting'
    ],
    rubric: {
      1: 'Displays little interest in learning or developing new skills',
      2: 'Some engagement in learning, but limited or inconsistent follow-through',
      3: 'Takes courses, seeks feedback, and shows steady improvement over time',
      4: 'Actively pursues growth, regularly seeks mentorship or mentoring opportunities',
      5: 'Champions development for self and others, regularly sets learning goals, and shares insights organization-wide'
    }
  },
  TECHNICAL: {
    name: 'Technical/Functional Expertise',
    aspects: [
      'Role-specific skills',
      'Industry knowledge',
      'Technical proficiency',
      'Best practices',
      'Knowledge sharing'
    ],
    rubric: {
      1: 'Skills are consistently below requirements; struggles with core functions',
      2: 'Basic competence in essential areas; gaps in more advanced requirements',
      3: 'Solid proficiency in core tasks; occasionally seeks guidance on advanced topics',
      4: 'Above-average expertise, able to coach others, keeps up with new developments',
      5: 'Top-tier expert; innovates in the field, advises others, and maintains advanced knowledge'
    }
  },
  EMOTIONAL_INTELLIGENCE: {
    name: 'Emotional Intelligence & Culture Fit',
    aspects: [
      'Self-awareness',
      'Empathy and respect',
      'Cultural alignment',
      'Interpersonal effectiveness',
      'Conflict management'
    ],
    rubric: {
      1: 'Often reactive, poor emotional control, or does not align with company values',
      2: 'Occasional conflicts or misunderstandings; may struggle in tense situations',
      3: 'Generally respectful, handles most conflicts effectively, and practices self-control',
      4: 'Demonstrates strong empathy, fosters inclusivity, and resolves interpersonal issues proactively',
      5: 'Exemplifies the organization\'s culture; adept at diffusing tension, recognized as a unifying force'
    }
  }
} as const;

// Update analysis stages to match actual processing steps
const ANALYSIS_STAGES = [
  "Preparing feedback data",
  "Processing aggregate feedback",
  "Analyzing senior feedback",
  "Analyzing peer feedback",
  "Analyzing junior feedback",
  "Generating final insights"
] as const;

export function CompetencyScore({ 
  name, 
  score, 
  confidence, 
  isInsufficientData 
}: { 
  name: string; 
  score: number | null; 
  confidence: string;
  isInsufficientData?: boolean;
}) {
  if (isInsufficientData) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium text-sm text-muted-foreground">{name}</h3>
            <Badge variant="outline" className="text-xs">
              Insufficient Data
            </Badge>
          </div>
        </div>
        <div className="h-2 bg-gray-200 rounded">
          <div className="h-full bg-gray-400 rounded" style={{ width: '0%' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-medium text-sm">{name}</h3>
          <Badge 
            variant={confidence === 'high' ? 'default' : 
                    confidence === 'medium' ? 'secondary' : 'outline'}
            className={cn(
              'text-xs',
              confidence === 'low' && 'text-muted-foreground'
            )}
          >
            {confidence} confidence
          </Badge>
        </div>
        <span className="font-semibold">
          {score?.toFixed(1) || 'N/A'}/5
        </span>
      </div>
      <Progress 
        value={score ? score * 20 : 0} 
        className={cn(
          'h-2',
          confidence === 'low' && 'bg-gray-200 [&>div]:bg-gray-400'
        )}
      />
    </div>
  );
}

// Add helper function for mathematical aggregation
function calculateAggregateAnalysis(relationshipAnalyses: RelationshipInsight[]): RelationshipInsight {
  // Initialize aggregate structure
  const aggregate: RelationshipInsight = {
    relationship: 'aggregate',
    themes: [],
    uniquePerspectives: [],
    competencies: [],
    responseCount: relationshipAnalyses.reduce((sum, analysis) => sum + (analysis.responseCount || 0), 0)
  };

  // Collect all themes and perspectives with their sources
  const themesWithSources = relationshipAnalyses.flatMap(a => 
    a.themes.map(theme => ({
      theme,
      relationship: a.relationship,
      weight: a.responseCount || 0
    }))
  );

  const perspectivesWithSources = relationshipAnalyses.flatMap(a => 
    a.uniquePerspectives.map(perspective => ({
      perspective,
      relationship: a.relationship,
      weight: a.responseCount || 0
    }))
  );

  // Sort by weight and take top themes/perspectives
  aggregate.themes = [...new Set(
    themesWithSources
      .sort((a, b) => b.weight - a.weight)
      .map(t => t.theme)
  )];

  aggregate.uniquePerspectives = [...new Set(
    perspectivesWithSources
      .sort((a, b) => b.weight - a.weight)
      .map(p => p.perspective)
  )];

  // Get all unique competency names
  const competencyNames = [...new Set(relationshipAnalyses.flatMap(a => 
    a.competencies.map(c => c.name)
  ))];

  // Calculate weighted averages for each competency
  aggregate.competencies = competencyNames.map(name => {
    const competencyData = relationshipAnalyses
      .map(analysis => {
        const comp = analysis.competencies.find(c => c.name === name);
        if (!comp) return null;
        
        return {
          score: comp.score,
          confidence: comp.confidence,
          evidenceCount: comp.evidenceCount || 0,
          responseCount: analysis.responseCount || 0,
          description: comp.description,
          relationship: analysis.relationship,
          evidenceQuotes: comp.evidenceQuotes || [],
          scoreJustification: comp.scoreJustification || ''
        };
      })
      .filter((data): data is NonNullable<typeof data> => data !== null);

    // Calculate weighted score based on response count
    const totalResponses = competencyData.reduce((sum, data) => sum + data.responseCount, 0);
    const weightedScore = competencyData.reduce((sum, data) => 
      sum + (data.score * (data.responseCount / totalResponses)), 0
    );

    // Determine aggregate confidence
    let confidence: 'low' | 'medium' | 'high';
    if (totalResponses <= 2) confidence = 'low';
    else if (totalResponses <= 4) confidence = 'medium';
    else confidence = 'high';

    // Combine insights from different perspectives
    const insightsByRelationship = competencyData.reduce((acc, data) => {
      if (!acc[data.relationship]) {
        acc[data.relationship] = {
          score: data.score,
          responseCount: data.responseCount,
          evidenceQuotes: data.evidenceQuotes,
          justification: data.scoreJustification
        };
      }
      return acc;
    }, {} as Record<string, { score: number; responseCount: number; evidenceQuotes: string[]; justification: string; }>);

    // Create a comprehensive description that includes relationship-specific insights
    const description = Object.entries(insightsByRelationship)
      .sort((a, b) => b[1].responseCount - a[1].responseCount) // Sort by response count
      .map(([relationship, data]) => {
        const relationshipType = relationship.charAt(0).toUpperCase() + relationship.slice(1);
        if (data.responseCount === 0) return '';
        return `${relationshipType} perspective (${data.responseCount} ${data.responseCount === 1 ? 'review' : 'reviews'}): ${data.justification}`;
      })
      .filter(Boolean)
      .join('\n\n');

    // Collect all evidence quotes
    const evidenceQuotes = [...new Set(
      competencyData.flatMap(data => data.evidenceQuotes)
    )];

    return {
      name,
      score: Number(weightedScore.toFixed(2)),
      confidence,
      description,
      evidenceCount: competencyData.reduce((sum, data) => sum + data.evidenceCount, 0),
      evidenceQuotes,
      scoreJustification: `Score based on weighted average across ${totalResponses} reviews, with stronger emphasis on perspectives with more responses.`
    };
  });

  return aggregate;
}

// Add helper function to create empty relationship insight
function createEmptyRelationshipInsight(relationship: string): RelationshipInsight {
  return {
    relationship,
    responseCount: 0,
    themes: [],
    uniquePerspectives: [],
    competencies: Object.values(CORE_COMPETENCIES).map(comp => ({
      name: comp.name,
      score: 0,
      confidence: 'low',
      description: 'No feedback received from this relationship level.',
      evidenceCount: 0,
      isInsufficientData: true,
      evidenceQuotes: [],
      scoreJustification: 'No feedback available for analysis.'
    }))
  };
}

export function FeedbackAnalytics({ 
  feedbackResponses, 
  employeeName, 
  employeeRole,
  feedbackRequestId 
}: Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState<RelationshipInsight[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [analysisStage, setAnalysisStage] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => ({
    aggregate: true,
    [RELATIONSHIP_TYPES.senior]: false,
    [RELATIONSHIP_TYPES.peer]: false,
    [RELATIONSHIP_TYPES.junior]: false
  }));
  const [isForceRerun, setIsForceRerun] = useState(false);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(null);

  // Group feedback by normalized relationship type
  const groupedFeedback = useMemo(() => {
    console.log('Grouping feedback responses:', feedbackResponses);
    
    const grouped = feedbackResponses.reduce((acc, response) => {
      const relationship = normalizeRelationship(response.relationship);
      console.log(`Normalizing relationship: ${response.relationship} -> ${relationship}`);
      
      if (!acc[relationship]) {
        acc[relationship] = [];
      }
      acc[relationship].push(response);
      return acc;
    }, {} as Record<string, FeedbackResponse[]>);

    // Ensure all relationship types exist in the grouped feedback
    RELATIONSHIP_ORDER.forEach(type => {
      if (!grouped[type]) {
        grouped[type] = [];
      }
    });

    console.log('Grouped feedback:', grouped);
    return grouped;
  }, [feedbackResponses]);

  // Memoize the feedback hash to prevent unnecessary recalculations
  const currentFeedbackHash = useMemo(() => 
    createFeedbackHash(feedbackResponses),
    [feedbackResponses]
  );

  // Check for existing analysis or run new analysis
  useEffect(() => {
    let isMounted = true;
    
    const checkAndAnalyze = async () => {
      if (feedbackResponses.length === 0) return;
      
      try {
        // Always check for existing analysis first
        const { data: existingAnalysis, error: fetchError } = await supabase
          .from('feedback_analytics')
          .select('insights, feedback_hash, last_analyzed_at')
          .eq('feedback_request_id', feedbackRequestId)
          .single();

        // Only proceed if component is still mounted
        if (!isMounted) return;

        if (fetchError && fetchError.code !== 'PGRST116') { // Not found error
          console.error('Error fetching existing analysis:', fetchError);
          return;
        }

        // If we have a valid cached analysis and we're not forcing a rerun, use it
        if (existingAnalysis && existingAnalysis.feedback_hash === currentFeedbackHash && !isForceRerun) {
          console.log('Using cached analysis from:', existingAnalysis.last_analyzed_at);
          setInsights(existingAnalysis.insights);
          setLastAnalyzedAt(existingAnalysis.last_analyzed_at);
          return;
        }

        // Only run new analysis if needed
        if (!existingAnalysis || existingAnalysis.feedback_hash !== currentFeedbackHash || isForceRerun) {
          console.log('Running new analysis. Reason:', 
            !existingAnalysis ? 'No existing analysis' :
            existingAnalysis.feedback_hash !== currentFeedbackHash ? 'Feedback changed' :
            'Force rerun requested'
          );
          await analyzeFeedback(currentFeedbackHash);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error in checkAndAnalyze:', error);
          setError('Failed to check or analyze feedback');
        }
      } finally {
        if (isMounted) {
          setIsForceRerun(false);
        }
      }
    };

    checkAndAnalyze();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [currentFeedbackHash, feedbackRequestId, isForceRerun]);

  const analyzeFeedback = async (currentHash: string) => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysisStage(0);
    
    try {
      const allInsights: RelationshipInsight[] = [];
      
      // First analyze each relationship type separately
      for (const relationship of Object.keys(groupedFeedback)) {
        // Skip OpenAI request if no feedback for this relationship
        if (groupedFeedback[relationship].length === 0) {
          console.log(`No feedback for ${relationship} relationship, skipping analysis`);
          allInsights.push(createEmptyRelationshipInsight(relationship));
          continue;
        }
        
        // Only set analysis stage for non-empty groups
        const stageIndex = RELATIONSHIP_ORDER.indexOf(relationship as keyof typeof RELATIONSHIP_TYPES);
        if (stageIndex !== -1) {
          setAnalysisStage(stageIndex + 2);
        }
        
        console.log(`Analyzing ${relationship} feedback with ${groupedFeedback[relationship].length} responses`);
        
        const relationshipCompletion = await openai.chat.completions.create({
          model: "gpt-4-1106-preview",
          messages: [
            {
              role: "system",
              content: `Analyze the ${relationship} feedback for ${employeeName} (${employeeRole}). Focus only on feedback from ${relationship} relationships.

STRICT SCORING RULES (MUST BE FOLLOWED):
1. Default Score: Start at 1/5 for each competency
2. Evidence Requirements:
   - Must have EXPLICIT examples/evidence to increase score
   - Vague or general statements DO NOT count as evidence
   - Each piece of evidence can only increase score by 0.5-1 point
   - Maximum score without multiple concrete examples: 3/5
   - Score of 4+ requires multiple specific, high-impact examples
   - Score of 5 requires exceptional evidence across multiple reviews

3. Confidence Level Rules:
   LOW confidence (must use if any apply):
   - Single response mentioning competency
   - Vague or unclear feedback
   - Contradictory feedback
   - No specific examples
   - Less than 3 responses mentioning competency

   MEDIUM confidence (all must apply):
   - 3-4 responses with clear mentions
   - Some specific examples
   - Consistent feedback across responses
   - Clear evidence of impact

   HIGH confidence (all must apply):
   - 5+ responses with explicit mentions
   - Multiple detailed examples
   - Strong consistency across responses
   - Clear, measurable impact

4. Insufficient Data Criteria (must mark as insufficient if any apply):
   - No concrete examples
   - Single vague mention
   - Contradictory or unclear feedback
   - Cannot clearly map to competency
   - Only general or non-specific praise

${Object.entries(CORE_COMPETENCIES).map(([_key, comp]) => `
  ${comp.name}:
  Key aspects: ${comp.aspects.join(', ')}
`).join('\n\n')}

Return a JSON response with this structure:
{
  "insights": {
    "relationship": "${relationship}",
    "responseCount": number,
    "themes": string[],
    "uniquePerspectives": string[],
    "competencies": [
      {
        "name": string,
        "score": number,
        "confidence": "low" | "medium" | "high",
        "description": string,
        "evidenceCount": number,
        "evidenceQuotes": string[],
        "scoreJustification": string
      }
    ]
  }
}`
            },
            {
              role: "user",
              content: JSON.stringify({
                employeeRole: employeeRole,
                feedback: groupedFeedback[relationship].map(r => ({
                  strengths: r.strengths || '',
                  areas_for_improvement: r.areas_for_improvement || ''
                }))
              })
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.7
        });

        const content = relationshipCompletion.choices[0]?.message?.content;
        if (!content) {
          throw new Error('Invalid response from OpenAI');
        }

        const relationshipAnalysis = JSON.parse(content);
        allInsights.push(relationshipAnalysis.insights);
      }

      // Calculate aggregate analysis only if we have any insights with data
      if (allInsights.some(insight => (insight.responseCount || 0) > 0)) {
        const aggregateAnalysis = calculateAggregateAnalysis(allInsights);
        allInsights.unshift(aggregateAnalysis);
      } else {
        // If no insights have data, create an empty aggregate
        allInsights.unshift(createEmptyRelationshipInsight('aggregate'));
      }

      // Store results
      const timestamp = new Date().toISOString();
      const { error: upsertError } = await supabase
        .from('feedback_analytics')
        .upsert(
          {
            feedback_request_id: feedbackRequestId,
            insights: allInsights,
            feedback_hash: currentHash,
            last_analyzed_at: timestamp,
            updated_at: timestamp,
            created_at: timestamp
          },
          {
            onConflict: 'feedback_request_id',
            ignoreDuplicates: false
          }
        );

      if (upsertError) throw new Error('Failed to store analysis results');

      setInsights(allInsights);
      setLastAnalyzedAt(timestamp);
      
    } catch (err) {
      console.error('Error analyzing feedback:', err);
      setError('Failed to analyze feedback');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStage(0);
    }
  };

  const handleRerunAnalysis = () => {
    setIsForceRerun(true);
  };

  const toggleSection = (relationship: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [relationship]: !prev[relationship]
    }));
  };

  // Format the last analyzed timestamp
  const formatLastAnalyzed = (timestamp: string | null) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  if (isAnalyzing) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-primary">
              {ANALYSIS_STAGES[analysisStage]}
            </p>
            <div className="w-full max-w-xs space-y-2">
              <Progress 
                value={((analysisStage + 1) / ANALYSIS_STAGES.length) * 100} 
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Stage {analysisStage + 1} of {ANALYSIS_STAGES.length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-sm text-destructive text-center">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Feedback Analytics</h2>
          {lastAnalyzedAt && (
            <p className="text-sm text-muted-foreground">
              Last analyzed {formatLastAnalyzed(lastAnalyzedAt)}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRerunAnalysis}
          disabled={isAnalyzing || feedbackResponses.length === 0}
          className="h-8 text-xs flex items-center gap-1.5"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              Rerun Analysis
            </>
          )}
        </Button>
      </div>

      {/* Aggregate Analysis Section */}
      {insights.find(i => i.relationship === 'aggregate') && (
        <Card>
          <CardHeader 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => toggleSection('aggregate')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">
                  Overall Analysis
                </CardTitle>
                <Badge variant="outline" className="capitalize">
                  {feedbackResponses.length} {feedbackResponses.length === 1 ? 'response' : 'responses'}
                </Badge>
              </div>
              <ChevronDown className={cn("h-5 w-5 transition-transform", expandedSections['aggregate'] && "rotate-180")} />
            </div>
          </CardHeader>
          {expandedSections['aggregate'] && (
            <CardContent className="space-y-6">
              {/* Render aggregate insights similar to relationship insights */}
              {renderInsightContent(insights.find(i => i.relationship === 'aggregate')!)}
            </CardContent>
          )}
        </Card>
      )}

      {RELATIONSHIP_ORDER.map((relationshipType) => {
        const insight = insights.find(i => normalizeRelationship(i.relationship) === relationshipType);
        const responseCount = groupedFeedback[relationshipType]?.length || 0;
        const isExpanded = expandedSections[relationshipType] || false;

        return (
          <Card key={relationshipType}>
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleSection(relationshipType)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">
                    {relationshipType.charAt(0).toUpperCase() + relationshipType.slice(1)} Perspective
                  </CardTitle>
                  <Badge variant="outline" className="capitalize">
                    {responseCount} {responseCount === 1 ? 'response' : 'responses'}
                  </Badge>
                </div>
                <ChevronDown className={cn("h-5 w-5 transition-transform", isExpanded && "rotate-180")} />
              </div>
            </CardHeader>
            {isExpanded && insight && (
              <CardContent className="space-y-6">
                {/* Key Themes */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Key Themes</h4>
                  <div className="grid gap-2">
                    {insight.themes.map((theme, i) => (
                      <div key={i} className="text-sm text-muted-foreground">
                        • {theme}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Unique Perspectives */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Unique Insights</h4>
                  <div className="grid gap-2">
                    {insight.uniquePerspectives.map((perspective, i) => (
                      <div key={i} className="text-sm text-muted-foreground">
                        • {perspective}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Competencies */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Competency Assessment</h4>
                  {insight.competencies.map((competency, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{competency.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={competency.confidence === 'low' ? 'destructive' : 
                                   competency.confidence === 'medium' ? 'outline' : 
                                   'default'}
                            className="text-xs capitalize"
                          >
                            {competency.confidence}
                          </Badge>
                          <span className="font-medium">{competency.score}/5</span>
                        </div>
                      </div>
                      <Progress value={(competency.score / 5) * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground">{competency.description}</p>
                      {competency.roleSpecificNotes && (
                        <p className="text-xs text-muted-foreground italic mt-1">
                          Note: {competency.roleSpecificNotes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );

  // Helper function to render insight content (reduces code duplication)
  function renderInsightContent(insight: RelationshipInsight) {
    return (
      <>
        {/* Key Themes */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Key Themes</h4>
          <div className="grid gap-2">
            {insight.themes.map((theme, i) => (
              <div key={i} className="text-sm text-muted-foreground">
                • {theme}
              </div>
            ))}
          </div>
        </div>

        {/* Unique Perspectives */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Unique Insights</h4>
          <div className="grid gap-2">
            {insight.uniquePerspectives.map((perspective, i) => (
              <div key={i} className="text-sm text-muted-foreground">
                • {perspective}
              </div>
            ))}
          </div>
        </div>

        {/* Competencies */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Competency Assessment</h4>
          {insight.competencies.map((competency, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{competency.name}</span>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={competency.confidence === 'low' ? 'destructive' : 
                           competency.confidence === 'medium' ? 'outline' : 
                           'default'}
                    className="text-xs capitalize"
                  >
                    {competency.confidence}
                  </Badge>
                  <span className="font-medium">{competency.score}/5</span>
                </div>
              </div>
              <Progress value={(competency.score / 5) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">{competency.description}</p>
              {competency.roleSpecificNotes && (
                <p className="text-xs text-muted-foreground italic mt-1">
                  Note: {competency.roleSpecificNotes}
                </p>
              )}
            </div>
          ))}
        </div>
      </>
    );
  }
} 