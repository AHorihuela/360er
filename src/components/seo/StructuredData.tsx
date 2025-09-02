import React from 'react';

interface StructuredDataProps {
  data: Record<string, any>;
}

export function StructuredData({ data }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data, null, 2) }}
    />
  );
}

// Predefined schema objects
export const schemas = {
  organization: {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Squad360",
    "url": "https://www.squad360.io",
    "logo": "https://www.squad360.io/favicon.svg",
    "description": "AI-powered 360° team feedback platform for professional development and performance analytics",
    "foundingDate": "2024",
    "industry": "Human Resources Technology",
    "sameAs": [
      "https://www.squad360.io"
    ]
  },

  softwareApplication: {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Squad360",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web Browser",
    "description": "AI-powered 360° team feedback platform that transforms anonymous peer feedback into actionable insights with comprehensive performance analytics and growth recommendations.",
    "url": "https://www.squad360.io",
    "screenshot": "https://www.squad360.io/images/og-preview.png",
    "author": {
      "@type": "Organization",
      "name": "Squad360"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Free tier available"
    },
    "featureList": [
      "360° feedback collection",
      "Manager effectiveness surveys", 
      "AI-powered analysis",
      "Anonymous feedback",
      "Competency scoring",
      "Performance analytics",
      "Growth recommendations"
    ]
  },

  faqPage: {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is 360° feedback?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "360° feedback is a comprehensive evaluation system that collects anonymous feedback from peers, managers, and direct reports to provide a complete view of an individual's performance across key competencies."
        }
      },
      {
        "@type": "Question", 
        "name": "How does Squad360's AI analysis work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Squad360 uses AI to analyze feedback patterns, provide confidence-rated insights, score competencies, and generate actionable growth recommendations based on anonymous peer feedback."
        }
      },
      {
        "@type": "Question",
        "name": "Is feedback truly anonymous?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, all feedback in Squad360 is completely anonymous. We ensure feedback providers cannot be identified, creating a safe environment for honest, constructive feedback."
        }
      },
      {
        "@type": "Question",
        "name": "What's the difference between 360° feedback and manager effectiveness surveys?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "360° feedback evaluates individual performance across competencies from multiple perspectives, while manager effectiveness surveys specifically assess leadership capabilities, communication skills, and team development abilities."
        }
      }
    ]
  },

  howTo: {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to Get Started with Squad360",
    "description": "Step-by-step guide to implementing 360° feedback in your organization using Squad360",
    "step": [
      {
        "@type": "HowToStep",
        "position": 1,
        "name": "Create Account",
        "text": "Sign up in seconds with your work email - no credit card required"
      },
      {
        "@type": "HowToStep", 
        "position": 2,
        "name": "Add Your Team",
        "text": "Create review cycles and add team members to collect feedback from"
      },
      {
        "@type": "HowToStep",
        "position": 3, 
        "name": "Gather Feedback",
        "text": "Share anonymous feedback links for 360° reviews or manager effectiveness surveys"
      },
      {
        "@type": "HowToStep",
        "position": 4,
        "name": "Get Detailed Insights", 
        "text": "Receive confidence-rated analysis, competency scoring, and actionable growth recommendations"
      }
    ]
  }
};