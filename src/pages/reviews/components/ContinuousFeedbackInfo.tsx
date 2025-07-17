import { Clock, TrendingUp, Calendar, BarChart3 } from 'lucide-react';

export function ContinuousFeedbackInfo() {
  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
          <Clock className="h-4 w-4 text-purple-600" />
        </div>
        <h4 className="font-semibold text-gray-900">Continuous Feedback Cycle</h4>
      </div>
      
      <p className="text-sm text-gray-700 mb-4 leading-relaxed">
        This cycle enables ongoing feedback collection without fixed deadlines. 
        Capture observations in real-time and generate reports for any time period.
      </p>
      
      <div className="grid grid-cols-1 gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-purple-100">
            <TrendingUp className="h-3 w-3 text-purple-600" />
          </div>
          <span className="text-sm text-gray-600">Add team members and start collecting feedback</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-purple-100">
            <Calendar className="h-3 w-3 text-purple-600" />
          </div>
          <span className="text-sm text-gray-600">Provide observations in real-time as they occur</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-purple-100">
            <BarChart3 className="h-3 w-3 text-purple-600" />
          </div>
          <span className="text-sm text-gray-600">Generate reports for custom time periods</span>
        </div>
      </div>
    </div>
  );
} 