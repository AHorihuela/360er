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
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">3. Aggregating & Weighting Feedback</h3>
              <p className="text-muted-foreground">We process feedback using a sophisticated weighting system:</p>
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Relationship Weighting</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Badge variant="outline" className="w-24 text-center bg-blue-500/10 text-blue-700 border-blue-200">Senior (40%)</Badge>
                      <span>Manager & mentor feedback</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="outline" className="w-24 text-center bg-green-500/10 text-green-700 border-green-200">Peer (35%)</Badge>
                      <span>Team member feedback</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="outline" className="w-24 text-center bg-yellow-500/10 text-yellow-700 border-yellow-200">Junior (25%)</Badge>
                      <span>Direct report feedback</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Confidence Weighting</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Badge variant="outline" className="w-24 text-center bg-green-500/10 text-green-700 border-green-200">High (100%)</Badge>
                      <span>Direct observation</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="outline" className="w-24 text-center bg-yellow-500/10 text-yellow-700 border-yellow-200">Med (75%)</Badge>
                      <span>Indirect observation</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="outline" className="w-24 text-center bg-red-500/10 text-red-700 border-red-200">Low (50%)</Badge>
                      <span>Limited interaction</span>
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
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">4. AI Analysis & Pattern Recognition</h3>
              <p className="text-muted-foreground">Our AI system processes the aggregated feedback to provide insights:</p>
              <div className="grid gap-4 mt-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <ul className="space-y-4 text-sm text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <Badge className="mt-1 bg-primary/20 hover:bg-primary/30 text-primary font-medium">Patterns</Badge>
                      <span>Identifying recurring themes and behaviors across different feedback sources</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Badge className="mt-1 bg-primary/20 hover:bg-primary/30 text-primary font-medium">Sentiment</Badge>
                      <span>Analyzing the tone and context of feedback to understand nuances</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Badge className="mt-1 bg-primary/20 hover:bg-primary/30 text-primary font-medium">Growth</Badge>
                      <span>Generating specific, actionable recommendations for improvement</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Badge className="mt-1 bg-primary/20 hover:bg-primary/30 text-primary font-medium">Trends</Badge>
                      <span>Tracking progress and development over time across review cycles</span>
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
              <LineChart className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">5. Competency Assessment</h3>
              <p className="text-muted-foreground">We evaluate performance across six core competencies:</p>
              <div className="grid gap-4 mt-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-3">Leadership & Communication</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                          Vision communication
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                          Team influence
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                          Stakeholder management
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">Execution & Innovation</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                          Project delivery
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                          Problem-solving
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                          Initiative & creativity
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
                All feedback is submitted anonymously
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                Individual responses are never revealed
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                Minimum response thresholds protect identity
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="font-medium text-lg">Data Protection</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                End-to-end encryption for all feedback
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                Secure access controls
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                Regular security audits
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 

