interface CompetencyRubric {
  [key: number]: string;
}

export interface Competency {
  name: string;
  aspects: string[];
  aspectDescriptions?: string[];  // Optional descriptions for each aspect
  rubric: CompetencyRubric;
}

// Map from full names to keys
export const COMPETENCY_NAME_TO_KEY: Record<string, string> = {
  'Technical/Functional Expertise': 'TECHNICAL',
  'Leadership & Influence': 'LEADERSHIP',
  'Collaboration & Communication': 'COLLABORATION',
  'Innovation & Problem-Solving': 'INNOVATION',
  'Execution & Accountability': 'EXECUTION',
  'Emotional Intelligence & Culture Fit': 'EMOTIONAL_INTELLIGENCE',
  'Growth & Development': 'GROWTH'
};

export const CORE_COMPETENCIES: Record<string, Competency> = {
  TECHNICAL: {
    name: 'Technical/Functional Expertise',
    aspects: [
      'Technical knowledge depth',
      'Problem-solving skills',
      'Quality of technical solutions',
      'Learning and adaptation',
      'Technical documentation'
    ],
    rubric: {
      1: 'Limited technical knowledge, requires significant guidance',
      2: 'Basic technical skills but struggles with complex problems',
      3: 'Solid technical foundation, handles most tasks independently',
      4: 'Strong technical expertise, solves complex problems effectively',
      5: 'Expert level knowledge, innovates and guides others'
    }
  },
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
  COLLABORATION: {
    name: 'Collaboration & Communication',
    aspects: [
      'Information sharing',
      'Cross-team effectiveness',
      'Active listening',
      'Clear communication',
      'Team support'
    ],
    rubric: {
      1: 'Struggles with team collaboration and communication',
      2: 'Inconsistent in communication and team participation',
      3: 'Works well with others, communicates effectively most of the time',
      4: 'Strong collaborator, facilitates team success through clear communication',
      5: 'Exceptional team player, builds bridges across teams and enhances collaboration'
    }
  },
  INNOVATION: {
    name: 'Innovation & Problem-Solving',
    aspects: [
      'Creative thinking',
      'Solution design',
      'Process improvement',
      'Adaptability',
      'Strategic thinking'
    ],
    rubric: {
      1: 'Rarely contributes new ideas or solutions',
      2: 'Sometimes offers solutions but may miss broader implications',
      3: 'Regularly contributes useful ideas and solves problems effectively',
      4: 'Consistently innovative, finds creative solutions to complex problems',
      5: 'Drives innovation, transforms challenges into opportunities'
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
  EMOTIONAL_INTELLIGENCE: {
    name: 'Emotional Intelligence & Culture Fit',
    aspects: [
      'Self-awareness',
      'Empathy and understanding',
      'Cultural sensitivity',
      'Conflict resolution',
      'Team morale impact'
    ],
    rubric: {
      1: 'Shows limited awareness of others\' feelings or team dynamics',
      2: 'Inconsistent in showing empathy or supporting team culture',
      3: 'Generally aware and supportive of team dynamics and culture',
      4: 'Strong emotional intelligence, positively influences team culture',
      5: 'Exceptional at building positive culture and managing relationships'
    }
  },
  GROWTH: {
    name: 'Growth & Development',
    aspects: [
      'Learning agility',
      'Skill development',
      'Feedback receptivity',
      'Career progression',
      'Knowledge sharing'
    ],
    rubric: {
      1: 'Shows little interest in personal or professional growth',
      2: 'Inconsistent in pursuing development opportunities',
      3: 'Actively works on personal growth and accepts feedback',
      4: 'Consistently seeks growth opportunities and applies learning',
      5: 'Exemplary commitment to growth, helps others develop'
    }
  }
}; 