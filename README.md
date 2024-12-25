# 360er - Professional Feedback Platform

A modern, web-based 360-degree feedback platform that enables managers to collect comprehensive, anonymous feedback for their team members from peers, direct reports, and senior colleagues.

## Features

- **Secure Authentication**: Email-based authentication using Supabase Auth
- **Employee Management**: Add, edit, and manage employee profiles
- **Review Cycles**: Create and manage review cycles with customizable deadlines
- **Anonymous Feedback**: Generate unique, anonymous feedback links for reviewers
- **Progress Tracking**: Visual progress tracking of feedback collection
- **Feedback Management**: View, manage, and analyze collected feedback
- **AI Report Generation**: Generate comprehensive AI-powered feedback reports
- **Export Options**: Export reports in PDF or text format with professional formatting
- **Keyboard Shortcuts**: Convenient shortcuts like Command+S for saving reports
- **Responsive Design**: Modern UI that works across devices

## Tech Stack

- **Frontend**:
  - React with TypeScript
  - Tailwind CSS for styling
  - Shadcn UI components
  - React Router for navigation
  - Lucide React for icons
  - jsPDF for PDF generation
  - html2canvas for PDF rendering
  - marked for markdown parsing

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
2. Run the migration files in the `supabase/migrations` directory in sequence:
   - `create_employees_table.sql`
   - `create_feedback_tables.sql`
   - `update_review_cycles_table.sql`
   - `update_review_cycles_policies.sql`
   - `add_created_by_to_review_cycles.sql`
   - `update_feedback_policies.sql`
   - `fix_feedback_relationships.sql`
   - `add_feedback_delete_policy.sql`
   - `add_delete_policy.sql`
   - `create_ai_reports_table.sql`

## Usage

1. **Authentication**:
   - Sign up/login with your email
   - Verify your email address

2. **Employee Management**:
   - Add employees with their name and role
   - Edit or remove employees as needed

3. **Review Cycles**:
   - Create a new review cycle with title and deadline
   - Add employees to the review cycle
   - Generate and share anonymous feedback links

4. **Feedback Collection**:
   - Reviewers receive unique links
   - Submit anonymous feedback about strengths and areas for improvement
   - Specify their relationship to the reviewee

5. **Review Management**:
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
├── pages/         # Page components
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
