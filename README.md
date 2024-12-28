# Squad360 - Team Feedback Platform

A modern, web-based 360-degree feedback platform that enables managers to collect comprehensive, anonymous feedback for their team members from peers, direct reports, and senior colleagues. Squad360 helps teams grow together through structured, actionable feedback.

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

## Usage

1. **Authentication**:
   - Sign up/login with your email
   - Verify your email address

2. **Initial Setup**:
   - Follow the guided onboarding process
   - Add your first team members
   - Create your first review cycle

3. **Employee Management**:
   - Add employees with their name and role
   - Edit or remove employees as needed

4. **Review Cycles**:
   - Create a new review cycle with title and deadline
   - Add employees to the review cycle
   - Generate and share anonymous feedback links

5. **Feedback Collection**:
   - Reviewers receive unique links
   - Submit anonymous feedback about strengths and areas for improvement
   - Specify their relationship to the reviewee

6. **Review Management**:
   - Track feedback collection progress
   - View and manage submitted feedback
   - Generate AI-powered feedback reports
   - Export reports in PDF or text format
   - Use Command+S to quickly save report changes

## Security Features

- Row Level Security (RLS) policies for data protection
- Anonymous feedback submission
- Secure authentication flow
- Protected API endpoints
- Secure report storage and access control

## Project Structure

```
src/
├── components/     # Reusable React components
│   ├── feedback/  # Feedback-related components
│   ├── layout/    # Layout components
│   ├── reviews/   # Review management components
│   └── ui/        # UI components
├── pages/         # Page components
│   ├── auth/      # Authentication pages
│   ├── feedback/  # Feedback pages
│   └── reviews/   # Review management pages
├── lib/           # Utilities and configurations
├── types/         # TypeScript type definitions
└── hooks/         # Custom React hooks

supabase/
└── migrations/    # Database migration files
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
