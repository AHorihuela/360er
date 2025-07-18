import { Badge } from "@/components/ui/badge";
import { RelationshipBadge } from "@/components/ui/badge-variants";
import { 
  Users,
  Brain,
  Shield,
  MessagesSquare,
  Layers,
  LineChart,
  UserCheck,
  Briefcase,
  BarChart
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function MethodologyExplanation() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      {/* Hero Section */}
      <div className="text-center space-y-6 mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
          Our Feedback Methodology
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          A step-by-step guide to our feedback collection and analysis process
        </p>
      </div>
      
      {/* Tabs for switching between methodologies */}
      <Tabs defaultValue="360_feedback" className="w-full mb-8">
        <TabsList className="grid w-full max-w-lg mx-auto grid-cols-2">
          <TabsTrigger value="360_feedback">360° Feedback</TabsTrigger>
          <TabsTrigger value="manager_effectiveness">Manager Effectiveness</TabsTrigger>
        </TabsList>
        
        {/* 360 Feedback Tab Content */}
        <TabsContent value="360_feedback" className="mt-6">
          {/* Process Steps - all original content preserved */}
          <div className="space-y-8 mb-16">
            <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">1. Collecting Diverse Feedback</h3>
                    <p className="text-muted-foreground">We gather feedback from multiple perspectives to ensure a comprehensive view:</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="bg-muted/50 p-6 rounded-lg">
                      <h4 className="font-medium text-base mb-4">Who Provides Feedback?</h4>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <RelationshipBadge type="senior" className="min-w-[100px] text-center">Senior</RelationshipBadge>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Managers & mentors</p>
                            <p className="text-xs text-muted-foreground">Strategic oversight and experience</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <RelationshipBadge type="peer" className="min-w-[100px] text-center">Peer</RelationshipBadge>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Team members</p>
                            <p className="text-xs text-muted-foreground">Day-to-day collaboration insights</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <RelationshipBadge type="junior" className="min-w-[100px] text-center">Junior</RelationshipBadge>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Direct reports</p>
                            <p className="text-xs text-muted-foreground">Upward management perspective</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-muted/50 p-6 rounded-lg">
                      <h4 className="font-medium text-base mb-4">What We Ask For</h4>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <Badge className="mt-1 bg-primary/20 hover:bg-primary/30 text-primary font-medium">Examples</Badge>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Specific behaviors</p>
                            <p className="text-xs text-muted-foreground">Concrete situations and actions observed</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Badge className="mt-1 bg-primary/20 hover:bg-primary/30 text-primary font-medium">Impact</Badge>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Team & project effects</p>
                            <p className="text-xs text-muted-foreground">How behaviors influenced outcomes</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Badge className="mt-1 bg-primary/20 hover:bg-primary/30 text-primary font-medium">Growth</Badge>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Areas for improvement</p>
                            <p className="text-xs text-muted-foreground">Specific development opportunities</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <MessagesSquare className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">2. Guiding Quality Feedback</h3>
                    <p className="text-muted-foreground">We help reviewers provide meaningful feedback through structured prompts:</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="bg-muted/50 p-6 rounded-lg space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Badge className="mt-1 bg-primary/20 hover:bg-primary/30 text-primary font-medium">Examples</Badge>
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Specific Situations</p>
                            <p className="text-sm text-muted-foreground">Describe concrete instances where you observed the behavior in action</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Badge className="mt-1 bg-primary/20 hover:bg-primary/30 text-primary font-medium">Context</Badge>
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Setting & Circumstances</p>
                            <p className="text-sm text-muted-foreground">Provide details about when and where the behavior occurred</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-muted/50 p-6 rounded-lg space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Badge className="mt-1 bg-primary/20 hover:bg-primary/30 text-primary font-medium">Impact</Badge>
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Team & Project Effects</p>
                            <p className="text-sm text-muted-foreground">Explain how the behavior influenced outcomes and team dynamics</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Badge className="mt-1 bg-primary/20 hover:bg-primary/30 text-primary font-medium">Growth</Badge>
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Development Areas</p>
                            <p className="text-sm text-muted-foreground">Suggest specific ways the person could improve or develop further</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Layers className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">3. Aggregating & Weighting Feedback</h3>
                    <p className="text-muted-foreground">Our sophisticated weighting system ensures balanced and reliable feedback analysis:</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="bg-muted/50 p-6 rounded-lg">
                      <h4 className="font-medium text-base mb-4">Relationship Weighting</h4>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="min-w-[100px] text-center bg-blue-500/10 text-blue-700 border-blue-200 font-medium">Senior (40%)</Badge>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Manager & mentor feedback</p>
                            <p className="text-xs text-muted-foreground">Strategic oversight and experience</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="min-w-[100px] text-center bg-green-500/10 text-green-700 border-green-200 font-medium">Peer (35%)</Badge>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Team member feedback</p>
                            <p className="text-xs text-muted-foreground">Day-to-day collaboration insights</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="min-w-[100px] text-center bg-yellow-500/10 text-yellow-700 border-yellow-200 font-medium">Junior (25%)</Badge>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Direct report feedback</p>
                            <p className="text-xs text-muted-foreground">Upward management perspective</p>
                          </div>
                        </div>
                        <div className="mt-6 pt-4 border-t">
                          <h5 className="text-sm font-medium mb-2">Dynamic Weight Adjustment</h5>
                          <p className="text-sm text-muted-foreground mb-3">If any relationship type is missing, weights are redistributed proportionally:</p>
                          <div className="space-y-2 text-sm">
                            <div className="bg-background/50 p-3 rounded">
                              <p className="font-medium mb-1">Example: No Junior Feedback</p>
                              <ul className="space-y-1 text-muted-foreground">
                                <li>• Senior: 53.3% (40/75)</li>
                                <li>• Peer: 46.7% (35/75)</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-muted/50 p-6 rounded-lg">
                      <h4 className="font-medium text-base mb-4">Confidence Weighting</h4>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="min-w-[100px] text-center bg-green-500/10 text-green-700 border-green-200 font-medium">High (100%)</Badge>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Direct observation</p>
                            <p className="text-xs text-muted-foreground">First-hand experience with behavior</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="min-w-[100px] text-center bg-yellow-500/10 text-yellow-700 border-yellow-200 font-medium">Med (75%)</Badge>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Indirect observation</p>
                            <p className="text-xs text-muted-foreground">Second-hand or occasional interaction</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="min-w-[100px] text-center bg-red-500/10 text-red-700 border-red-200 font-medium">Low (50%)</Badge>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Limited interaction</p>
                            <p className="text-xs text-muted-foreground">Minimal direct experience</p>
                          </div>
                        </div>
                        <div className="mt-6 pt-4 border-t">
                          <h5 className="text-sm font-medium mb-2">Confidence Factors</h5>
                          <div className="space-y-3">
                            <div className="bg-background/50 p-3 rounded">
                              <p className="font-medium text-sm mb-2">Evidence Quantity (40%)</p>
                              <ul className="text-xs space-y-1 text-muted-foreground">
                                <li>• First piece: Full value</li>
                                <li>• Additional pieces: Diminishing returns</li>
                                <li>• Maximum: 15 pieces considered</li>
                              </ul>
                            </div>
                            <div className="bg-background/50 p-3 rounded">
                              <p className="font-medium text-sm mb-2">Score Consistency (30%)</p>
                              <ul className="text-xs space-y-1 text-muted-foreground">
                                <li>• Perfect consistency: 100%</li>
                                <li>• Some variance: Partial weight</li>
                                <li>• High variance: Weight reduced</li>
                              </ul>
                            </div>
                            <div className="bg-background/50 p-3 rounded">
                              <p className="font-medium text-sm mb-2">Coverage & Distribution (30%)</p>
                              <ul className="text-xs space-y-1 text-muted-foreground">
                                <li>• Multiple relationship types</li>
                                <li>• Even feedback distribution</li>
                                <li>• Minimum review thresholds</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 bg-muted/50 p-6 rounded-lg">
                    <h4 className="font-medium text-base mb-3">How Weights Work Together</h4>
                    <div className="space-y-4">
                      <div className="bg-background/50 p-4 rounded">
                        <p className="font-medium text-sm mb-2">Example Calculation</p>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <p>A senior manager (40% relationship weight) provides feedback:</p>
                          <ul className="space-y-1 ml-4">
                            <li>• With direct observation (100% confidence)</li>
                            <li>• Score: 4.0 out of 5.0</li>
                          </ul>
                          <p className="mt-2 font-medium">Final weighted contribution:</p>
                          <p>4.0 × 0.40 × 1.0 = 1.6 points toward final score</p>
                        </div>
                      </div>
                      <div className="bg-background/50 p-4 rounded">
                        <p className="font-medium text-sm mb-2">Same Example with Low Confidence</p>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <p>If the confidence is low (50%):</p>
                          <p className="mt-2 font-medium">Adjusted weighted contribution:</p>
                          <p>4.0 × 0.40 × 0.5 = 0.8 points toward final score</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">4. AI Analysis & Pattern Recognition</h3>
                    <p className="text-muted-foreground">Our AI system processes the aggregated feedback to provide comprehensive insights:</p>
                  </div>
                  <div className="grid gap-4">
                    <div className="bg-muted/50 p-6 rounded-lg">
                      <div className="grid sm:grid-cols-2 gap-6">
                        <div className="space-y-6">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-primary/20 hover:bg-primary/30 text-primary font-medium">Patterns</Badge>
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Theme Identification</p>
                              <p className="text-sm text-muted-foreground">Identifying recurring behaviors and feedback patterns across different sources and time periods</p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-primary/20 hover:bg-primary/30 text-primary font-medium">Sentiment</Badge>
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Context Analysis</p>
                              <p className="text-sm text-muted-foreground">Understanding the tone, impact, and circumstances of each piece of feedback</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-primary/20 hover:bg-primary/30 text-primary font-medium">Growth</Badge>
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Action Planning</p>
                              <p className="text-sm text-muted-foreground">Converting feedback into specific, actionable development recommendations</p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-primary/20 hover:bg-primary/30 text-primary font-medium">Trends</Badge>
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Progress Tracking</p>
                              <p className="text-sm text-muted-foreground">Monitoring development and improvement across multiple review cycles</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <LineChart className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">5. Competency Assessment</h3>
                  <p className="text-muted-foreground">We evaluate performance across seven core competencies:</p>
                  <div className="grid gap-4 mt-4">
                    <div className="bg-muted/50 p-6 rounded-lg">
                      <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-6">
                          <div>
                            <h4 className="font-medium text-lg mb-2">How We Evaluate</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                              Each competency is evaluated on a scale of 1.0 to 5.0, using specific evidence and examples from feedback. 
                              Scores are weighted based on the reviewer's relationship and confidence level.
                            </p>
                          </div>
                          
                          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-10">
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium text-base mb-2 flex items-center gap-2">
                                  Technical/Functional Expertise
                                  <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-200">1.0 - 5.0</Badge>
                                </h4>
                                <p className="text-sm text-muted-foreground mb-3">
                                  Measures proficiency in role-specific technical skills and knowledge sharing capabilities.
                                </p>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Role-specific skills
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Industry and domain expertise
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Technical proficiency
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Knowledge sharing
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Problem-solving capabilities
                                  </li>
                                </ul>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium text-base mb-2 flex items-center gap-2">
                                  Leadership & Influence
                                  <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-200">1.0 - 5.0</Badge>
                                </h4>
                                <p className="text-sm text-muted-foreground mb-3">
                                  Evaluates ability to guide teams, communicate vision, and take ownership of initiatives.
                                </p>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Taking initiative and ownership
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Guiding and inspiring others
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Influencing outcomes positively
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Mentoring and role modeling
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Creating and communicating vision
                                  </li>
                                </ul>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium text-base mb-2 flex items-center gap-2">
                                  Collaboration & Communication
                                  <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-200">1.0 - 5.0</Badge>
                                </h4>
                                <p className="text-sm text-muted-foreground mb-3">
                                  Assesses effectiveness in team collaboration and stakeholder communication.
                                </p>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Clear and effective communication
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Cross-team collaboration
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Stakeholder management
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Conflict resolution
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Team cohesion building
                                  </li>
                                </ul>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium text-base mb-2 flex items-center gap-2">
                                  Innovation & Problem-Solving
                                  <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-200">1.0 - 5.0</Badge>
                                </h4>
                                <p className="text-sm text-muted-foreground mb-3">
                                  Measures ability to find creative solutions and adapt to challenges.
                                </p>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Creative problem-solving
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Adaptability to change
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Process improvement
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Strategic thinking
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Innovation initiatives
                                  </li>
                                </ul>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium text-base mb-2 flex items-center gap-2">
                                  Execution & Accountability
                                  <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-200">1.0 - 5.0</Badge>
                                </h4>
                                <p className="text-sm text-muted-foreground mb-3">
                                  Evaluates reliability in delivering quality work and meeting commitments.
                                </p>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Meeting commitments
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Quality of deliverables
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Project ownership
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Time management
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Problem resolution
                                  </li>
                                </ul>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium text-base mb-2 flex items-center gap-2">
                                  Emotional Intelligence
                                  <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-200">1.0 - 5.0</Badge>
                                </h4>
                                <p className="text-sm text-muted-foreground mb-3">
                                  Assesses self-awareness and ability to build strong relationships.
                                </p>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Self-awareness
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Empathy and respect
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Cultural alignment
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Interpersonal dynamics
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Emotional regulation
                                  </li>
                                </ul>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium text-base mb-2 flex items-center gap-2">
                                  Growth & Development
                                  <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-200">1.0 - 5.0</Badge>
                                </h4>
                                <p className="text-sm text-muted-foreground mb-3">
                                  Measures commitment to continuous learning and professional development.
                                </p>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Continuous learning
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Skill development
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Feedback receptivity
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Knowledge sharing
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Career progression
                                  </li>
                                </ul>
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 border-t">
                            <h4 className="font-medium text-base mb-3">Scoring Guidelines</h4>
                            <div className="grid sm:grid-cols-2 gap-6">
                              <div>
                                <h5 className="text-sm font-medium mb-2">Score Ranges</h5>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                  <li className="flex items-center gap-2">
                                    <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200">4.5 - 5.0</Badge>
                                    <span>Exceptional performance</span>
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-200">3.5 - 4.4</Badge>
                                    <span>Exceeding expectations</span>
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-200">2.5 - 3.4</Badge>
                                    <span>Meeting expectations</span>
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <Badge variant="outline" className="bg-orange-500/10 text-orange-700 border-orange-200">1.5 - 2.4</Badge>
                                    <span>Development needed</span>
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-200">1.0 - 1.4</Badge>
                                    <span>Significant improvement required</span>
                                  </li>
                                </ul>
                              </div>
                              <div>
                                <h5 className="text-sm font-medium mb-2">Evidence Requirements</h5>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Minimum 3 specific examples per score
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Feedback from multiple relationships
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Recent examples (within review period)
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    Impact-focused observations
                                  </li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        
        {/* Manager Effectiveness Tab Content */}
        <TabsContent value="manager_effectiveness" className="mt-6">
          <div className="space-y-8 mb-16">
            <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <UserCheck className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">1. Gathering Manager Effectiveness Feedback</h3>
                    <p className="text-muted-foreground">We collect structured feedback on management effectiveness from team members:</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="bg-muted/50 p-6 rounded-lg">
                      <h4 className="font-medium text-base mb-4">Key Feedback Areas</h4>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="min-w-[130px] text-center bg-blue-500/10 text-blue-700 border-blue-200 font-medium">Communication</Badge>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Clarity and transparency</p>
                            <p className="text-xs text-muted-foreground">Effective information sharing and expectation setting</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="min-w-[130px] text-center bg-green-500/10 text-green-700 border-green-200 font-medium">Team Support</Badge>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Development and advocacy</p>
                            <p className="text-xs text-muted-foreground">Resource allocation and growth opportunities</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="min-w-[130px] text-center bg-yellow-500/10 text-yellow-700 border-yellow-200 font-medium">Decision Making</Badge>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Quality and promptness</p>
                            <p className="text-xs text-muted-foreground">Navigating complexity with appropriate input</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="min-w-[130px] text-center bg-purple-500/10 text-purple-700 border-purple-200 font-medium">Direction Setting</Badge>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Vision and alignment</p>
                            <p className="text-xs text-muted-foreground">Strategic planning and goal clarity</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-muted/50 p-6 rounded-lg">
                      <h4 className="font-medium text-base mb-4">Feedback Approach</h4>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <Badge className="mt-1 bg-primary/20 hover:bg-primary/30 text-primary font-medium">Anonymous</Badge>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Protected responses</p>
                            <p className="text-xs text-muted-foreground">Team members can provide honest feedback without fear</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Badge className="mt-1 bg-primary/20 hover:bg-primary/30 text-primary font-medium">Specific</Badge>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Evidence-based</p>
                            <p className="text-xs text-muted-foreground">Feedback tied to concrete situations and outcomes</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Badge className="mt-1 bg-primary/20 hover:bg-primary/30 text-primary font-medium">Actionable</Badge>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Development focused</p>
                            <p className="text-xs text-muted-foreground">Clear opportunities for improvement and growth</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Badge className="mt-1 bg-primary/20 hover:bg-primary/30 text-primary font-medium">Balanced</Badge>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Strengths and growth areas</p>
                            <p className="text-xs text-muted-foreground">Recognition of positive impact alongside improvement needs</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">2. Evaluating Management Dimensions</h3>
                    <p className="text-muted-foreground">We assess managers across key dimensions of leadership effectiveness:</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="bg-muted/50 p-6 rounded-lg space-y-6">
                      <div>
                        <h4 className="font-medium text-base mb-3">Core Management Dimensions</h4>
                        <ul className="space-y-3">
                          <li className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 mt-2 rounded-full bg-primary flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium">Communication Effectiveness</p>
                              <p className="text-sm text-muted-foreground">Clear, timely, and appropriate communication with team members</p>
                            </div>
                          </li>
                          <li className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 mt-2 rounded-full bg-primary flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium">Team Development</p>
                              <p className="text-sm text-muted-foreground">Coaching, mentoring, and growing team capabilities</p>
                            </div>
                          </li>
                          <li className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 mt-2 rounded-full bg-primary flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium">Strategic Direction</p>
                              <p className="text-sm text-muted-foreground">Providing clear goals and aligning work to organization objectives</p>
                            </div>
                          </li>
                          <li className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 mt-2 rounded-full bg-primary flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium">Execution & Results</p>
                              <p className="text-sm text-muted-foreground">Delivering outcomes and managing team performance</p>
                            </div>
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div className="bg-muted/50 p-6 rounded-lg space-y-6">
                      <div>
                        <h4 className="font-medium text-base mb-3">Advanced Management Skills</h4>
                        <ul className="space-y-3">
                          <li className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 mt-2 rounded-full bg-primary flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium">Change Management</p>
                              <p className="text-sm text-muted-foreground">Leading teams through transitions and organizational changes</p>
                            </div>
                          </li>
                          <li className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 mt-2 rounded-full bg-primary flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium">Conflict Resolution</p>
                              <p className="text-sm text-muted-foreground">Addressing and managing team conflicts constructively</p>
                            </div>
                          </li>
                          <li className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 mt-2 rounded-full bg-primary flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium">Innovation Support</p>
                              <p className="text-sm text-muted-foreground">Fostering creativity and continuous improvement</p>
                            </div>
                          </li>
                          <li className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 mt-2 rounded-full bg-primary flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium">Cross-Team Collaboration</p>
                              <p className="text-sm text-muted-foreground">Building effective partnerships across the organization</p>
                            </div>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <BarChart className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">3. Analyzing & Reporting Results</h3>
                    <p className="text-muted-foreground">We process manager feedback to create actionable insights:</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="bg-muted/50 p-6 rounded-lg">
                      <h4 className="font-medium text-base mb-4">Feedback Processing</h4>
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Score Calculation</p>
                          <p className="text-sm text-muted-foreground">
                            Numeric ratings are aggregated across all respondents, with equal weighting for all team members. Scores range from 1.0 (needs significant improvement) to 5.0 (exceptional).
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Comment Analysis</p>
                          <p className="text-sm text-muted-foreground">
                            Qualitative feedback is analyzed to identify patterns and themes. These insights highlight key strengths and development areas.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Comparison Benchmarks</p>
                          <p className="text-sm text-muted-foreground">
                            Results are compared against organizational benchmarks and past performance to provide context for development.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-muted/50 p-6 rounded-lg">
                      <h4 className="font-medium text-base mb-4">Results Visualization</h4>
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Score Distribution</p>
                          <p className="text-sm text-muted-foreground">
                            Visual representations of score distributions help identify areas of consensus and divergence in team perception.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Dimension Analysis</p>
                          <p className="text-sm text-muted-foreground">
                            Detailed breakdowns of scores across each management dimension, showing relative strengths and growth opportunities.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Trend Tracking</p>
                          <p className="text-sm text-muted-foreground">
                            Comparative analysis across review cycles to track progress and development over time.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* New section for Survey Questions */}
            <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <MessagesSquare className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-4 w-full">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Survey Questions</h3>
                    <p className="text-muted-foreground">The Manager Effectiveness Survey includes the following structured questions:</p>
                  </div>
                  
                  <div className="grid gap-8">
                    {/* Likert Scale Questions with visual rating scale */}
                    <div className="bg-muted/50 p-6 rounded-lg">
                      <div className="flex items-center gap-2 mb-5">
                        <Badge className="bg-primary/20 hover:bg-primary/30 text-primary font-medium">Quantitative</Badge>
                        <h4 className="font-medium text-base">Likert Scale Questions</h4>
                      </div>
                      
                      {/* Rating scale legend */}
                      <div className="mb-6 bg-background/80 p-4 rounded-md border border-border/40">
                        <p className="text-sm font-medium mb-3">Rating Scale:</p>
                        <div className="grid grid-cols-5 gap-1 text-center text-xs">
                          <div className="flex flex-col items-center">
                            <div className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center mb-1 font-medium">1</div>
                            <span className="text-muted-foreground">Strongly Disagree</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center mb-1 font-medium">2</div>
                            <span className="text-muted-foreground">Disagree</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="w-6 h-6 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center mb-1 font-medium">3</div>
                            <span className="text-muted-foreground">Neutral</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center mb-1 font-medium">4</div>
                            <span className="text-muted-foreground">Agree</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1 font-medium">5</div>
                            <span className="text-muted-foreground">Strongly Agree</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Questions with category badges */}
                      <div className="space-y-4">
                        <div className="p-4 bg-background/80 rounded-md border border-border/40 flex items-start gap-3">
                          <Badge variant="outline" className="mt-0.5 min-w-[90px] text-center bg-blue-500/10 text-blue-700 border-blue-200 font-medium">Expectations</Badge>
                          <p className="text-sm">I understand what is expected of me at work.</p>
                        </div>
                        
                        <div className="p-4 bg-background/80 rounded-md border border-border/40 flex items-start gap-3">
                          <Badge variant="outline" className="mt-0.5 min-w-[90px] text-center bg-green-500/10 text-green-700 border-green-200 font-medium">Productivity</Badge>
                          <p className="text-sm">My manager contributes to my productivity.</p>
                        </div>
                        
                        <div className="p-4 bg-background/80 rounded-md border border-border/40 flex items-start gap-3">
                          <Badge variant="outline" className="mt-0.5 min-w-[90px] text-center bg-purple-500/10 text-purple-700 border-purple-200 font-medium">Feedback</Badge>
                          <p className="text-sm">My manager frequently provides feedback that helps me improve my performance.</p>
                        </div>
                        
                        <div className="p-4 bg-background/80 rounded-md border border-border/40 flex items-start gap-3">
                          <Badge variant="outline" className="mt-0.5 min-w-[90px] text-center bg-yellow-500/10 text-yellow-700 border-yellow-200 font-medium">Direction</Badge>
                          <p className="text-sm">My manager effectively directs our people and resources toward our most important priorities.</p>
                        </div>
                        
                        <div className="p-4 bg-background/80 rounded-md border border-border/40 flex items-start gap-3">
                          <Badge variant="outline" className="mt-0.5 min-w-[90px] text-center bg-orange-500/10 text-orange-700 border-orange-200 font-medium">Balance</Badge>
                          <p className="text-sm">My manager effectively balances doing work, delegating work, coaching, and influencing others.</p>
                        </div>
                        
                        <div className="p-4 bg-background/80 rounded-md border border-border/40 flex items-start gap-3">
                          <Badge variant="outline" className="mt-0.5 min-w-[90px] text-center bg-red-500/10 text-red-700 border-red-200 font-medium">Growth</Badge>
                          <p className="text-sm">My manager actively supports my career growth and development.</p>
                        </div>
                        
                        <div className="p-4 bg-background/80 rounded-md border border-border/40 flex items-start gap-3">
                          <Badge variant="outline" className="mt-0.5 min-w-[90px] text-center bg-indigo-500/10 text-indigo-700 border-indigo-200 font-medium">Inclusion</Badge>
                          <p className="text-sm">My manager values my opinions and gives me the opportunity to contribute ideas to help our department achieve its goals.</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Open-Ended Questions with visual text area representation */}
                    <div className="bg-muted/50 p-6 rounded-lg">
                      <div className="flex items-center gap-2 mb-5">
                        <Badge className="bg-primary/20 hover:bg-primary/30 text-primary font-medium">Qualitative</Badge>
                        <h4 className="font-medium text-base">Open-Ended Questions</h4>
                      </div>
                      
                      <div className="space-y-6">
                        <div className="bg-background/80 p-5 rounded-md border border-border/40">
                          <p className="text-sm font-medium mb-3">What could this manager do to better support the team's success and development?</p>
                          <div className="h-20 bg-muted/40 rounded border border-border/30 p-3">
                            <div className="w-1/2 h-2 bg-muted rounded"></div>
                            <div className="w-3/4 h-2 bg-muted rounded mt-2"></div>
                            <div className="w-2/3 h-2 bg-muted rounded mt-2"></div>
                          </div>
                        </div>
                        
                        <div className="bg-background/80 p-5 rounded-md border border-border/40">
                          <p className="text-sm font-medium mb-3">What is one suggestion or improvement that this manager could do that would improve your overall experience?</p>
                          <div className="h-20 bg-muted/40 rounded border border-border/30 p-3">
                            <div className="w-2/3 h-2 bg-muted rounded"></div>
                            <div className="w-1/2 h-2 bg-muted rounded mt-2"></div>
                            <div className="w-3/5 h-2 bg-muted rounded mt-2"></div>
                          </div>
                        </div>
                        
                        <div className="bg-background/80 p-5 rounded-md border border-border/40">
                          <p className="text-sm font-medium mb-3">Is there any additional feedback you would like to share?</p>
                          <div className="h-20 bg-muted/40 rounded border border-border/30 p-3">
                            <div className="w-1/3 h-2 bg-muted rounded"></div>
                            <div className="w-2/5 h-2 bg-muted rounded mt-2"></div>
                            <div className="w-1/4 h-2 bg-muted rounded mt-2"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Privacy & Security Section - Keep this outside the tabs as it applies to both */}
      <div className="bg-muted/30 rounded-lg p-8 border shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold">Our Privacy Commitment</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-medium text-lg">Protecting Reviewers</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                Anonymous access through unique feedback links
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                Session-based response tracking
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                Relationship-based aggregation (senior/peer/junior)
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="font-medium text-lg">Data Security</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                Row-level security policies
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                Secure credential storage with Supabase Vault
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                Cryptographic functions for data protection
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 

