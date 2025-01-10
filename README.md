# Squad360 🎯

<div align="center">
  <img src="public/images/og-preview.png" alt="Squad360 - AI-Powered Team Feedback Platform" width="800"/>

  <h2>AI-Powered Team Feedback Platform</h2>
  
  <p>
    Transform peer feedback into actionable insights with confidence-rated analysis, competency scoring, and AI-powered recommendations.
  </p>

  <p>
    <a href="https://squad360.vercel.app">View Demo</a>
    ·
    <a href="https://squad360.vercel.app/signup">Get Started</a>
    ·
    <a href="#features">Explore Features</a>
  </p>
</div>

## About 🚀

Squad360 is a modern, web-based 360-degree feedback platform that enables managers to collect comprehensive, anonymous feedback for their team members. Using advanced AI analytics, we provide:

- 🧠 **Confidence-rated insights** based on evidence patterns
- 📊 **Competency scoring** across 7 key areas
- 🎯 **Role-specific analysis** for accurate context
- 🔒 **Anonymous feedback collection** via unique links
- 📈 **Visual progress tracking** and analytics

## Key Features 🚀

- **Advanced AI Analytics** 🧠:
  - Confidence-rated feedback analysis
  - Competency-based scoring framework
  - Visual progress tracking
  - Evidence-based insights
  - Role-specific analysis

- **Comprehensive Feedback Framework** 📊:
  - Seven core competency areas
  - Detailed scoring rubrics
  - Evidence-based confidence ratings
  - Role-specific context analysis
  - Relationship-based perspectives

- **Visual Analytics** 📈:
  - Progress tracking with visual indicators
  - Confidence-rated competency bars
  - Team-wide analytics dashboard
  - Individual performance insights
  - Review collection progress tracking
  - Status badges with consistent formatting
  - Real-time completion tracking

- **Quality Assurance** ✅:
  - Minimum review thresholds
  - Confidence level indicators
  - Evidence count tracking
  - Data quality monitoring
  - Automated validation

- **Core Platform Features** 🛠️:
  - Secure authentication
  - Anonymous feedback collection
  - Review cycle management
  - Team management
  - Export capabilities
  - Unique shareable feedback links
  - Editable review cycle titles

## Competency Framework 🎯

Our platform evaluates seven core competencies:

1. **Leadership & Influence** 👑
   - Taking initiative
   - Guiding and inspiring others
   - Influencing outcomes positively
   - Mentoring and role modeling
   - Unifying vision

2. **Execution & Accountability** ⚡
   - Meeting deadlines
   - Quality of deliverables
   - Taking ownership
   - Problem resolution
   - Project completion

3. **Collaboration & Communication** 🤝
   - Information sharing
   - Cross-team effectiveness
   - Clarity of communication
   - Stakeholder management
   - Conflict resolution

4. **Innovation & Problem-Solving** 💡
   - Creative solutions
   - Adaptability to change
   - Initiative in improvements
   - Collaborative ideation
   - Impact of solutions

5. **Growth & Development** 📈
   - Continuous learning
   - Skill development
   - Feedback receptiveness
   - Knowledge sharing
   - Goal setting

6. **Technical/Functional Expertise** 💻
   - Role-specific skills
   - Industry knowledge
   - Technical proficiency
   - Best practices
   - Knowledge sharing

7. **Emotional Intelligence & Culture Fit** 🫂
   - Self-awareness
   - Empathy and respect
   - Cultural alignment
   - Interpersonal effectiveness
   - Conflict management

## Analysis Methodology 📊

- **Minimum Review Threshold**: 5 reviews required for analysis
- **Confidence Ratings**:
  - Low: 0-2 pieces of evidence
  - Medium: 3 pieces of evidence
  - High: 4+ pieces of evidence
- **Evidence Tracking**: Count of specific examples per competency
- **Role Context**: Analysis adjusted for managerial vs IC roles
- **Relationship Perspectives**: Separate analysis for senior, peer, and junior feedback

## Tech Stack 🛠️

- **Frontend** 🎨:
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

- **Backend** ⚙️:
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

This project is licensed under the MIT License - see the LICENSE file for details.
