# Squad360 🎯

<div align="center">
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

### Step 1: Create Your Team 👥
![Step 1 - Team Setup](/public/images/step-1.png)
Add your team members and organize them into review cycles. Each employee gets a unique profile where their feedback and growth can be tracked over time.

### Step 2: Generate Feedback Links 🔗
![Step 2 - Generate Links](/public/images/step-2.png)
Generate anonymous feedback links for each team member. These links can be shared with peers, managers, and direct reports, ensuring complete anonymity in the feedback process.

### Step 3: AI-Enhanced Feedback Collection 📝
![Step 3 - Feedback Collection](/public/images/step-3.png)
Reviewers provide detailed feedback through a guided form. Our AI system helps ensure feedback is:
- Specific and actionable
- Balanced between strengths and areas for growth
- Supported by concrete examples
- Professional and constructive

### Step 4: Real-time Analysis 🔄
![Step 4 - Analysis](/public/images/step-4.png)
As feedback comes in, our system:
- Processes responses in real-time
- Maps feedback to core competencies
- Identifies patterns and trends
- Calculates confidence scores
- Aggregates insights across relationship types

### Step 5: Comprehensive Insights 📊
![Step 5 - Insights](/public/images/step-5.png)
Access detailed analytics that provide:
- Team-wide competency analysis
- Individual performance insights
- Evidence-based scoring
- Relationship-weighted evaluations
- Growth recommendations

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
