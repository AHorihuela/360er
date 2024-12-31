interface CompetencyRubric {
  [key: number]: string;
}

export interface Competency {
  name: string;
  aspects: string[];
  rubric: CompetencyRubric;
}

export const CORE_COMPETENCIES: Record<string, Competency> = {
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
}; 