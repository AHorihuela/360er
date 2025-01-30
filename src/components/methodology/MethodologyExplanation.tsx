import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  ClipboardList, 
  Brain, 
  Scale, 
  Target, 
  Shield, 
  BarChart2,
  MessagesSquare,
  Layers,
  LineChart
} from "lucide-react";

export function MethodologyExplanation() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      {/* Hero Section */}
      <div className="text-center space-y-6 mb-16">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
          How Our 360° Feedback Works
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          A step-by-step guide to our feedback collection and analysis process
        </p>
      </div>

      {/* Process Steps */}
      <div className="space-y-8 mb-16">
        <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">1. Collecting Diverse Feedback</h3>
              <p className="text-muted-foreground">We gather feedback from multiple perspectives to ensure a comprehensive view:</p>
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Who Provides Feedback?</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      Senior colleagues (managers, mentors)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      Peers and team members
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      Direct reports (if applicable)
                    </li>
                  </ul>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">What We Ask For</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      Specific examples of behaviors
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      Impact on team/projects
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      Areas for improvement
                    </li>
                  </ul>
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
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">2. Guiding Quality Feedback</h3>
              <p className="text-muted-foreground">We help reviewers provide meaningful feedback through:</p>
              <div className="grid gap-4 mt-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <ul className="space-y-4 text-sm text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <Badge className="mt-1 bg-primary/20 hover:bg-primary/30 text-primary font-medium">Examples</Badge>
                      <span>Prompting for specific situations where the behavior was observed</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Badge className="mt-1 bg-primary/20 hover:bg-primary/30 text-primary font-medium">Context</Badge>
                      <span>Asking about the setting and circumstances of the feedback</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Badge className="mt-1 bg-primary/20 hover:bg-primary/30 text-primary font-medium">Impact</Badge>
                      <span>Understanding how the behavior affected the team or project outcomes</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Badge className="mt-1 bg-primary/20 hover:bg-primary/30 text-primary font-medium">Growth</Badge>
                      <span>Suggesting specific ways the person could improve or develop further</span>
                    </li>
                  </ul>
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

      {/* Privacy & Security Section */}
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

