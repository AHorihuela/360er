import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function ThankYouPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center space-y-4 p-6 text-center">
      <h1 className="text-3xl font-bold">Thank You!</h1>
      <p className="text-muted-foreground">
        Your feedback has been submitted successfully. Thank you for taking the time to provide feedback.
      </p>
      <Button onClick={() => navigate('/')}>Return Home</Button>
    </div>
  );
} 