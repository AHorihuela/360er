export const RELATIONSHIP_TYPES = {
  SENIOR: 'senior',
  PEER: 'peer',
  JUNIOR: 'junior'
} as const;

export const RELATIONSHIP_ORDER = [
  RELATIONSHIP_TYPES.SENIOR,
  RELATIONSHIP_TYPES.PEER,
  RELATIONSHIP_TYPES.JUNIOR
] as const;

export const CORE_COMPETENCIES = {
  COMMUNICATION: {
    name: "Communication",
    aspects: [
      "Clear and effective expression of ideas",
      "Active listening and understanding",
      "Constructive feedback delivery",
      "Written communication clarity"
    ],
    rubric: {
      1: "Struggles with clear communication, often leading to misunderstandings",
      2: "Basic communication skills with room for improvement",
      3: "Communicates effectively in most situations",
      4: "Strong communicator who adapts style to audience",
      5: "Exceptional communicator who elevates team discussions"
    }
  },
  TECHNICAL_SKILLS: {
    name: "Technical Skills",
    aspects: [
      "Technical knowledge depth",
      "Problem-solving ability",
      "Code quality and standards",
      "Technical documentation"
    ],
    rubric: {
      1: "Limited technical skills, requires significant support",
      2: "Basic technical competency with regular guidance needed",
      3: "Solid technical skills for role requirements",
      4: "Strong technical expertise, helps others grow",
      5: "Technical leader who drives innovation"
    }
  },
  COLLABORATION: {
    name: "Collaboration",
    aspects: [
      "Team contribution",
      "Cross-functional partnerships",
      "Conflict resolution",
      "Knowledge sharing"
    ],
    rubric: {
      1: "Struggles to work effectively with others",
      2: "Basic collaboration with occasional challenges",
      3: "Good team player who contributes consistently",
      4: "Strong collaborator who builds team unity",
      5: "Exceptional at fostering collaboration and team success"
    }
  },
  LEADERSHIP: {
    name: "Leadership",
    aspects: [
      "Decision making",
      "Team motivation",
      "Strategic thinking",
      "Mentorship and guidance"
    ],
    rubric: {
      1: "Shows limited leadership qualities",
      2: "Emerging leadership skills need development",
      3: "Demonstrates good leadership in most situations",
      4: "Strong leader who inspires and guides others",
      5: "Exceptional leader who transforms team and culture"
    }
  },
  INITIATIVE: {
    name: "Initiative & Innovation",
    aspects: [
      "Proactive problem solving",
      "Creative thinking",
      "Continuous improvement",
      "Learning agility"
    ],
    rubric: {
      1: "Rarely shows initiative or new ideas",
      2: "Sometimes takes initiative with prompting",
      3: "Good self-starter with regular contributions",
      4: "Consistently drives improvements and innovation",
      5: "Exceptional innovator who transforms processes"
    }
  }
} as const;

export const ANALYSIS_STAGES = [
  "Preparing feedback data",
  "Processing aggregate feedback",
  "Analyzing senior feedback",
  "Analyzing peer feedback",
  "Analyzing junior feedback",
  "Generating final insights"
] as const; 