# Squad360 - AI-Powered Team Feedback Platform

A modern, web-based 360-degree feedback platform that enables managers to collect comprehensive, anonymous feedback for their team members. Squad360 uses advanced AI analytics to provide confidence-rated insights, competency scoring, and detailed growth recommendations.

## Key Features

- **Advanced AI Analytics**:
  - Confidence-rated feedback analysis
  - Competency-based scoring framework
  - Visual progress tracking
  - Evidence-based insights
  - Role-specific analysis

- **Comprehensive Feedback Framework**:
  - Seven core competency areas
  - Detailed scoring rubrics
  - Evidence-based confidence ratings
  - Role-specific context analysis
  - Relationship-based perspectives

- **Visual Analytics**:
  - Progress tracking with visual indicators
  - Confidence-rated competency bars
  - Team-wide analytics dashboard
  - Individual performance insights
  - Review collection progress tracking

- **Quality Assurance**:
  - Minimum review thresholds
  - Confidence level indicators
  - Evidence count tracking
  - Data quality monitoring
  - Automated validation

- **Core Platform Features**:
  - Secure authentication
  - Anonymous feedback collection
  - Review cycle management
  - Team management
  - Export capabilities

## Competency Framework

Our platform evaluates seven core competencies:

1. **Leadership & Influence**
   - Taking initiative
   - Guiding and inspiring others
   - Influencing outcomes positively
   - Mentoring and role modeling
   - Unifying vision

2. **Execution & Accountability**
   - Meeting deadlines
   - Quality of deliverables
   - Taking ownership
   - Problem resolution
   - Project completion

3. **Collaboration & Communication**
   - Information sharing
   - Cross-team effectiveness
   - Clarity of communication
   - Stakeholder management
   - Conflict resolution

4. **Innovation & Problem-Solving**
   - Creative solutions
   - Adaptability to change
   - Initiative in improvements
   - Collaborative ideation
   - Impact of solutions

5. **Growth & Development**
   - Continuous learning
   - Skill development
   - Feedback receptiveness
   - Knowledge sharing
   - Goal setting

6. **Technical/Functional Expertise**
   - Role-specific skills
   - Industry knowledge
   - Technical proficiency
   - Best practices
   - Knowledge sharing

7. **Emotional Intelligence & Culture Fit**
   - Self-awareness
   - Empathy and respect
   - Cultural alignment
   - Interpersonal effectiveness
   - Conflict management

## Analysis Methodology

- **Minimum Review Threshold**: 5 reviews required for analysis
- **Confidence Ratings**:
  - Low: 0-2 pieces of evidence
  - Medium: 3 pieces of evidence
  - High: 4+ pieces of evidence
- **Evidence Tracking**: Count of specific examples per competency
- **Role Context**: Analysis adjusted for managerial vs IC roles
- **Relationship Perspectives**: Separate analysis for senior, peer, and junior feedback

## Features

- **Secure Authentication**: Email-based authentication using Supabase Auth
- **Guided Onboarding**: Step-by-step setup process for new users
- **Employee Management**: Add, edit, and manage employee profiles
- **Review Cycles**: Create and manage review cycles with customizable deadlines
- **Anonymous Feedback**: Generate unique, anonymous feedback links for reviewers
- **Progress Tracking**: Visual progress tracking of feedback collection
- **Feedback Management**: View, manage, and analyze collected feedback
- **AI Report Generation**: Generate comprehensive AI-powered feedback reports with managerial insights
- **Rich Text Editing**: Full-featured markdown editor for customizing reports
- **Export Options**: Export reports in PDF or text format with professional formatting
- **Keyboard Shortcuts**: Convenient shortcuts like Command+S for saving reports
- **Responsive Design**: Modern UI that works across devices
- **Real-time Updates**: Live feedback collection progress tracking
- **Version Tracking**: Built-in version display for deployment tracking

## Tech Stack

- **Frontend**:
  - React with TypeScript
  - Tailwind CSS for styling
  - Shadcn UI components
  - React Router for navigation
  - Lucide React for icons
  - TipTap for rich text editing
  - jsPDF for PDF generation
  - html2canvas for PDF rendering
  - markdown-it for markdown parsing

- **Backend**:
  - Supabase for database and authentication
  - Row Level Security (RLS) policies
  - Real-time data synchronization
  - OpenAI GPT-4 for report generation

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account
- OpenAI API key

### Environment Setup

1. Clone the repository
2. Copy `.env.example` to `.env`
3. Fill in your credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_OPENAI_API_KEY=your_openai_api_key
   ```

### Installation

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

### Database Setup

1. Create a new Supabase project
2. Run the consolidated migration file:
   - `20240130000001_consolidated_schema.sql`

This migration includes:
- All table definitions
- Row Level Security (RLS) policies
- Triggers and functions
- Permission grants
- Anonymous access setup

The migration handles:
- Employee management
- Review cycles
- Feedback requests and responses
- AI report generation
- Security policies
- Anonymous feedback submission

## Project Structure

```
src/
├── api/           # API endpoints and handlers
├── assets/        # Static assets and resources
├── components/    # Shared React components
├── features/      # Feature-specific components and logic
├── hooks/         # Custom React hooks
├── lib/           # Shared libraries and utilities
├── pages/         # Page components
├── server/        # Server-side code
├── types/         # TypeScript type definitions
└── utils/         # Helper functions

public/           # Static assets
supabase/
├── functions/    # Supabase Edge Functions
└── migrations/   # Database migrations

vite/            # Vite configuration
```

## Deployment

### Production Environment

The application is deployed on Vercel with the following configuration:

- **Production URL**: squad360-no2ery2py-ahorihuelas-projects.vercel.app
- **Database**: Supabase (vwckinhujlyviulpmtjo.supabase.co)

### Environment Variables

Required in Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_OPENAI_API_KEY`
- `PORT=3000`

### Deployment Process

1. Ensure all changes are committed to git
2. Run build locally to verify no TypeScript errors:
   ```bash
   npm run build
   ```
3. Deploy to production:
   ```bash
   vercel --prod
   ```
4. Verify deployment at Vercel dashboard
5. Check deployment logs at: https://vercel.com/ahorihuelas-projects/squad360/_logs

### Vercel Configuration

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "outputDirectory": "dist",
  "public": true,
  "routes": [
    {
      "src": "/assets/(.*)",
      "dest": "/assets/$1",
      "headers": {
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    },
    { 
      "src": "/feedback/(.*)", 
      "dest": "/index.html",
      "headers": {
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "X-XSS-Protection": "1; mode=block",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "*"
      },
      "continue": true
    },
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "github": {
    "silent": true
  }
}
```

## Security Features

- Row Level Security (RLS) policies for data protection
- Anonymous feedback submission through unique links
- Secure authentication flow with Supabase Auth
- Protected API endpoints with proper CORS configuration
- Secure report storage and access control
- XSS protection through proper content sanitization
- CSRF protection through secure token handling

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
