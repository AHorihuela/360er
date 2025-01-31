# Squad360 🎯

<div align="center">

[![Stars](https://img.shields.io/github/stars/ahorihuelas/squad360?style=flat-square&logo=github)](https://github.com/ahorihuelas/squad360/stargazers)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.0-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.0-green?style=flat-square&logo=supabase)](https://supabase.com/)
[![GPT-4](https://img.shields.io/badge/GPT--4-Powered-orange?style=flat-square&logo=openai)](https://openai.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?style=flat-square&logo=vercel)](https://squad360.vercel.app)

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

### 2. AI-Enhanced Quality Review ✨
![Sample AI Review](/public/images/sample-ai-review.png)
Before submission, feedback is processed through an AI review system that:
- Ensures specific examples are included
- Follows feedback best practices
- Enhances clarity and actionability

### 3. Comprehensive Analysis 📊
![Feedback Analysis](/public/images/feedback-analysis.png)
The platform aggregates feedback across seven key performance indicators, providing:
- Detailed performance insights
- Pattern recognition across feedback sources
- Visual breakdown of feedback trends

### 4. Quantitative Assessment 📈
![Overall Analysis](/public/images/overall-analysis.png)
Each review generates:
- Confidence-scored evaluations (High/Medium/Low)
- Evidence-based competency ratings
- Actionable growth recommendations

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

- **Minimum Review Threshold**: 5 reviews required for analysis
- **Confidence Ratings**:
  - Low: 0-2 pieces of evidence
  - Medium: 3 pieces of evidence
  - High: 4+ pieces of evidence
- **Evidence Tracking**: Count of specific examples per competency
- **Role Context**: Analysis adjusted for managerial vs IC roles
- **Relationship Perspectives**: Separate analysis for senior, peer, and junior feedback

## Documentation 📚

For detailed information about our analysis methodology and feedback framework, please refer to:

- [Competency Analysis Methodology](documentation/competency_analysis.md) - Detailed explanation of our scoring system, confidence levels, relationship weighting, and outlier handling.
- [Quantitative Feedback Framework](documentation/quantitative_feedback_framew.md) - Overview of how we transform qualitative feedback into actionable insights.

## Tech Stack 🛠️

### Frontend 🎨
- React with TypeScript
- Tailwind CSS for styling
- Shadcn UI components
- React Router for navigation
- Lucide React for icons
- TipTap for rich text editing
- jsPDF for PDF generation
- html2canvas for PDF rendering
- markdown-it for markdown parsing
- Sonner for toast notifications

### Backend ⚙️
- Supabase for database and authentication
- Row Level Security (RLS) policies
- Real-time data synchronization
- OpenAI GPT-4 for report generation

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
   VITE_OPENAI_API_KEY=your_openai_api_key
   ```

### Installation 📦

```bash
# Install dependencies
npm install

# Start development server
npm run dev

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

## Contributing 🤝

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License 📄

This project is open source and available under the MIT License.
