# Squad360 🎯

<div align="center">

[![Stars](https://img.shields.io/github/stars/AHorihuela/360er?style=flat-square&logo=github)](https://github.com/AHorihuela/360er/stargazers)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)

  <img src="public/images/og-preview.png" alt="Squad360 - AI-Powered Team Feedback Platform" width="800"/>

  <p>
    Transform your team's feedback process with automated, anonymous 360-degree feedback collection and AI-enhanced insights.
  </p>

  <p>
    <a href="https://squad360.vercel.app">View Demo</a>
    ·
    <a href="https://squad360.vercel.app/signup">Get Started</a>
    ·
    <a href="#how-it-works">Explore Features</a>
  </p>
</div>

## How It Works 🚀

### 1. Anonymous Feedback Collection
![Feedback Form](/public/images/feedback-form.png)
Each employee receives a unique feedback link that can be shared with peers, reports, and managers. The feedback is completely anonymous - not even administrators can see who provided specific feedback.

### 2. AI-Enhanced Insights ✨
![Sample AI Review](/public/images/sample-ai-review.png)
Our platform leverages AI to:
- Generate comprehensive feedback reports
- Identify patterns across multiple feedback sources
- Provide actionable insights for growth
- Synthesize qualitative feedback into clear recommendations

### 3. Comprehensive Analysis 📊
![Feedback Analysis](/public/images/feedback-analysis.png)
The platform aggregates feedback across seven key performance indicators, providing:
- Detailed performance insights
- Pattern recognition across feedback sources
- Visual breakdown of feedback trends
- Relationship-based analysis (peer, senior, junior perspectives)

### 4. Manager Effectiveness Surveys 📈
![Overall Analysis](/public/images/overall-analysis.png)
In addition to 360-degree reviews, the platform supports specialized manager effectiveness surveys that:
- Evaluate leadership capabilities
- Assess team management skills
- Provide targeted improvement recommendations
- Compare performance against organizational benchmarks

## Competency Framework 🎯

Our platform evaluates seven core competencies across key aspects:

| Competency | Key Aspects |
|------------|-------------|
| **Leadership & Influence** 👑 | • Taking initiative<br>• Guiding and inspiring others<br>• Influencing outcomes positively<br>• Mentoring and role modeling<br>• Unifying vision |
| **Execution & Accountability** ⚡ | • Meeting deadlines<br>• Quality of deliverables<br>• Taking ownership<br>• Problem resolution<br>• Project completion |
| **Collaboration & Communication** 🤝 | • Information sharing<br>• Cross-team effectiveness<br>• Clarity of communication<br>• Stakeholder management<br>• Conflict resolution |
| **Innovation & Problem-Solving** 💡 | • Creative solutions<br>• Adaptability to change<br>• Initiative in improvements<br>• Collaborative ideation<br>• Impact of solutions |
| **Growth & Development** 📈 | • Continuous learning<br>• Skill development<br>• Feedback receptiveness<br>• Knowledge sharing<br>• Goal setting |
| **Technical/Functional Expertise** 💻 | • Role-specific skills<br>• Industry knowledge<br>• Technical proficiency<br>• Best practices<br>• Knowledge sharing |
| **Emotional Intelligence & Culture Fit** 🫂 | • Self-awareness<br>• Empathy and respect<br>• Cultural alignment<br>• Interpersonal effectiveness<br>• Conflict management |

## Analysis Methodology 📊

### Hybrid Analytics Approach
- **Default View**: Pre-calculated aggregate scores (Senior 40%, Peer 35%, Junior 25%)
- **Relationship Filtering**: Dynamic analysis by specific feedback sources (Senior/Peer/Junior)
- **Employee Filtering**: Subset analysis for selected team members
- **Combined Filtering**: Employee and relationship filters work together

### Data Requirements & Confidence
- **Minimum Review Threshold**: 5 reviews required for analysis
- **Confidence Ratings**:
  - High: Strong evidence (4+ pieces) with consistent feedback
  - Medium: Moderate evidence (3 pieces) with some variation
  - Low: Limited evidence (0-2 pieces) or high variation
- **Evidence Tracking**: Count of specific examples per competency
- **Role Context**: Analysis adjusted for managerial vs IC roles

### Score Consistency
- **Aggregate Scores**: Match exactly with individual employee review pages
- **No Discrepancies**: Same scores across analytics and individual views
- **Relationship Perspectives**: Separate insights available for senior, peer, and junior feedback when filtering is applied

## Documentation 📚

For detailed information about our analysis methodology and feedback framework, please refer to:

- [Competency Analysis Methodology](documentation/competency_analysis.md) - Detailed explanation of our scoring system, confidence levels, relationship weighting, and outlier handling.
- [Quantitative Feedback Framework](documentation/quantitative_feedback_framework.md) - Overview of how we transform qualitative feedback into actionable insights.
- [Database Structure](documentation/database.md) - Comprehensive documentation of our database schema, relationships, and security policies.
- [Manager Effectiveness Implementation](documentation/manager-effectiveness-implementation-plan.md) - Details on our manager effectiveness survey implementation.

## Tech Stack 🛠️

### Frontend 🎨
- React 18 with TypeScript
- Tailwind CSS for styling
- Shadcn UI components
- React Router for navigation
- Lucide React for icons
- TipTap for rich text editing
- GSAP for animations
- Framer Motion for UI transitions
- Recharts for data visualization
- jsPDF for PDF generation
- html2canvas for PDF rendering
- markdown-it for markdown parsing
- Sonner for toast notifications
- Zustand for state management

### Backend ⚙️
- Supabase for database and authentication
- Row Level Security (RLS) policies
- Real-time data synchronization
- OpenAI GPT-4o for report generation
- Express.js for API endpoints
- tRPC for type-safe API calls

### Testing 🧪
- Vitest for unit and integration testing
- Testing Library for component testing
- Coverage reporting with v8

## Project Structure 📂

```
src/
├── api/        # API client functions
├── assets/     # Static assets
├── components/ # Reusable UI components
├── constants/  # Application constants
├── features/   # Feature-specific components
├── hooks/      # Custom React hooks
├── lib/        # Third-party library integrations
├── pages/      # Page components
├── scripts/    # Utility scripts
├── server/     # Backend server code
├── tests/      # Integration tests and shared utilities
├── types/      # TypeScript type definitions
└── utils/      # Helper functions
```

> **Note**: Additional unit tests can be found in `__tests__` folders next to
> their respective components.

## Getting Started 🚀

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account
- OpenAI API key

### Environment Setup 🔧

1. Clone the repository
2. Copy `.env.example` to `.env`
3. Fill in your credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   OPENAI_API_KEY=your_openai_api_key
   ```

### Installation 📦

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Preview production build
npm run preview
```

## Security Features 🔒

- Row Level Security (RLS) policies for data protection
- Anonymous feedback submission through unique links
- Secure authentication flow with Supabase Auth
- Protected API endpoints with proper CORS configuration
- Secure report storage and access control
- XSS protection through proper content sanitization
- CSRF protection through secure token handling

## Known Issues & TODO 🚧

### Critical Issues to Address

#### 1. Authentication Session Sync Issue (HIGH PRIORITY)
**Problem**: Supabase `auth.uid()` returns `null` in database queries despite browser showing authenticated session.
- **Symptoms**: 
  - Browser session appears valid with user ID
  - Database queries show `auth.uid()` as null
  - Console warning: "Multiple GoTrueClient instances"
  - RLS policies fail due to null authentication context
- **Current Workaround**: Hardcoded bypass in `is_master_account()` function for production stability
- **Impact**: Affects all authentication-dependent features across the application
- **Root Cause**: Likely Supabase client configuration issue or session state management
- **Action Required**: 
  - Investigate Supabase client initialization patterns
  - Review session management and storage
  - Test authentication flow in isolation
  - Consider migrating to latest Supabase client version
  - Remove hardcoded workarounds once resolved

#### 2. Master Account Function Hardcoding (MEDIUM PRIORITY)
**Problem**: Temporary hardcoded logic in database function bypasses proper authentication checks.
- **Current State**: `is_master_account()` returns `true` when `auth.uid()` is null
- **Risk**: Potential security vulnerability if authentication context is compromised
- **Action Required**: Remove hardcoded logic once session sync issue is resolved

#### 3. Development-Only Master Account Bypass (LOW PRIORITY)
**Problem**: Temporary development bypass in `useAIReportManagement.ts` for local testing.
- **Current State**: Development mode allows master accounts to generate reports for any feedback request
- **Location**: `src/hooks/useAIReportManagement.ts` lines ~170-185
- **Safety**: Protected by `import.meta.env.DEV` check and master account validation
- **Action Required**: Remove development bypass once authentication session sync is resolved

### Future Enhancements
- Implement proper session debugging tools
- Add authentication state monitoring dashboard
- Create automated tests for authentication flows
- Document authentication troubleshooting procedures

## Contributing 🤝

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License 📄

This project is open source and available under the MIT License.
