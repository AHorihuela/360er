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
  description: string;
}

interface RelationshipInsight {
  relationship: string;
  themes: string[];
  uniquePerspectives: string[];
  competencies: Competency[];
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

interface CachedAnalytics {
  feedbackHash: string;
  insights: RelationshipInsight[];
}

interface AnalyticsMetadata {
  insights: RelationshipInsight[];
  feedback_hash: string;
  last_analyzed_at: string;
}

// Update relationship type constants
const RELATIONSHIP_TYPES = {
  SENIOR: 'senior',
  PEER: 'peer',
  JUNIOR: 'junior'
} as const;

// Add relationship display order
const RELATIONSHIP_ORDER = [
  RELATIONSHIP_TYPES.SENIOR,
  RELATIONSHIP_TYPES.PEER,
  RELATIONSHIP_TYPES.JUNIOR
];

// Update relationship normalization function
function normalizeRelationship(relationship: string): string {
  const normalized = relationship.toLowerCase().replace(/[_\s]+/g, '');
  if (normalized.includes('senior')) return RELATIONSHIP_TYPES.SENIOR;
  if (normalized.includes('peer') || normalized.includes('equal')) return RELATIONSHIP_TYPES.PEER;
  if (normalized.includes('junior')) return RELATIONSHIP_TYPES.JUNIOR;
  // Default to peer if relationship is unclear
  return RELATIONSHIP_TYPES.PEER;
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
    name: 'Leadership & Direction',
    aspects: [
      'Vision and strategy setting',
      'Team motivation and development',
      'Decision making effectiveness'
    ]
  },
  EXECUTION: {
    name: 'Execution & Delivery',
    aspects: [
      'Project management',
      'Resource optimization',
      'Quality of deliverables'
    ]
  },
  COLLABORATION: {
    name: 'Collaboration & Communication',
    aspects: [
      'Team coordination',
      'Clear communication',
      'Conflict resolution'
    ]
  },
  INNOVATION: {
    name: 'Innovation & Problem Solving',
    aspects: [
      'Creative thinking',
      'Problem analysis',
      'Solution implementation'
    ]
  },
  DEVELOPMENT: {
    name: 'Growth & Development',
    aspects: [
      'Learning agility',
      'Adaptability',
      'Feedback receptiveness'
    ]
  }
} as const;

export function FeedbackAnalytics({ 
  feedbackResponses, 
  employeeName, 
  employeeRole,
  feedbackRequestId 
}: Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState<RelationshipInsight[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => 
    RELATIONSHIP_ORDER.reduce((acc, type) => ({ ...acc, [type]: true }), {})
  );
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
    
    try {
      // First, check if we need to delete any existing analysis
      const { error: deleteError } = await supabase
        .from('feedback_analytics')
        .delete()
        .eq('feedback_request_id', feedbackRequestId);

      if (deleteError) {
        console.error('Error deleting existing analysis:', deleteError);
      }

      // Generate new analysis
      const completion = await openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        messages: [
          {
            role: "system",
            content: `Analyze the 360-degree feedback for ${employeeName} (${employeeRole}). Group insights by organizational relationship (senior, peer, junior) and provide structured analysis using our competency framework.

Note: 'Equal' and 'Peer' relationships should be analyzed together under the 'Peer' category.

For each relationship type, evaluate these core competencies:
${Object.entries(CORE_COMPETENCIES).map(([key, comp]) => `
${comp.name}:
- Evaluation criteria: ${comp.aspects.join(', ')}
- Score range: 1-5 where:
  1: Needs significant improvement
  2: Developing
  3: Meets expectations
  4: Exceeds expectations
  5: Outstanding performance
`).join('\n')}

Return a JSON array of insights, one for each relationship type, with this structure:
{
  "insights": [
    {
      "relationship": string,
      "themes": string[],
      "uniquePerspectives": string[],
      "competencies": [
        {
          "name": string (must match one of our core competencies),
          "score": number (1-5),
          "description": string (explain the score based on specific feedback evidence)
        }
      ]
    }
  ]
}

Important:
- Base scores on concrete evidence from feedback
- Consider the relationship context when interpreting feedback
- Provide specific examples to justify scores
- Ensure consistent scoring across different relationships
- Analyze ALL feedback responses in each category`
          },
          {
            role: "user",
            content: JSON.stringify({
              relationships: Object.entries(groupedFeedback).map(([relationship, responses]) => ({
                relationship,
                responseCount: responses.length,
                feedback: responses.map(r => ({
                  strengths: r.strengths,
                  areas_for_improvement: r.areas_for_improvement
                }))
              }))
            })
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      });

      const analysis = JSON.parse(completion.choices[0].message.content || '{}');
      const insights = analysis.insights || [];
      const timestamp = new Date().toISOString();
      
      // Insert new analysis
      const { error: insertError } = await supabase
        .from('feedback_analytics')
        .insert({
          feedback_request_id: feedbackRequestId,
          insights,
          feedback_hash: currentHash,
          last_analyzed_at: timestamp,
          updated_at: timestamp,
          created_at: timestamp
        });

      if (insertError) {
        console.error('Error storing analysis:', insertError);
        // Still set local state even if storage fails
        setInsights(insights);
        setLastAnalyzedAt(timestamp);
      } else {
        setInsights(insights);
        setLastAnalyzedAt(timestamp);
        console.log('Successfully stored analysis in database');
      }
    } catch (err) {
      console.error('Error analyzing feedback:', err);
      setError('Failed to analyze feedback');
    } finally {
      setIsAnalyzing(false);
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
            <p className="text-sm text-muted-foreground">Analyzing feedback responses...</p>
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

      {RELATIONSHIP_ORDER.map((relationshipType) => {
        const insight = insights.find(i => normalizeRelationship(i.relationship) === relationshipType);
        const responseCount = groupedFeedback[relationshipType]?.length || 0;
        const isExpanded = expandedSections[relationshipType] ?? true;

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
                        <span className="font-medium">{competency.score}/5</span>
                      </div>
                      <Progress value={(competency.score / 5) * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground">{competency.description}</p>
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
} 