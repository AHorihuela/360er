import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Users, ArrowRight } from 'lucide-react';

export function OnboardingSection() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto max-w-4xl py-12">
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to Squad360! 👋
          </h1>
          <p className="text-lg text-muted-foreground">Let's get you set up with everything you need.</p>
        </div>

        <div className="grid gap-6">
          {/* Step 1: Add Team Members */}
          <div className="p-6 rounded-lg border bg-primary/5 border-primary">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Add Your Team Members</h3>
                  <Button 
                    onClick={() => navigate('/employees')} 
                    className="bg-black hover:bg-black/90 text-white transition-all duration-300"
                  >
                    Get Started <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">Start by adding the employees you want to collect feedback for.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 