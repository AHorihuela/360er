import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

interface SubmissionDetails {
  submittedAt: string;
  employeeName: string;
}

export function ThankYouPage() {
  const { uniqueLink } = useParams();
  const navigate = useNavigate();
  const [submissionDetails, setSubmissionDetails] = useState<SubmissionDetails | null>(null);

  useEffect(() => {
    const submittedFeedbacks = JSON.parse(localStorage.getItem('submittedFeedbacks') || '{}');
    if (uniqueLink && submittedFeedbacks[uniqueLink]) {
      setSubmissionDetails(submittedFeedbacks[uniqueLink]);
    }
  }, [uniqueLink]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-lg border bg-card p-8 shadow-sm text-center">
        <div className="mx-auto w-12 h-12 text-green-500">
          <CheckCircle className="w-full h-full" />
        </div>
        
        <h1 className="text-2xl font-bold">Thank You!</h1>
        
        <p className="text-muted-foreground">
          Your feedback has been submitted successfully.
          {submissionDetails?.employeeName && (
            <> Thank you for providing feedback for {submissionDetails.employeeName}.</>
          )}
        </p>

        {submissionDetails?.submittedAt && (
          <p className="text-sm text-muted-foreground">
            Submitted on: {new Date(submissionDetails.submittedAt).toLocaleDateString()}
          </p>
        )}

        <div className="pt-4">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
          >
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
} 