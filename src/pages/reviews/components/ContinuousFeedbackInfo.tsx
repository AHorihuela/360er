export function ContinuousFeedbackInfo() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h4 className="font-medium text-blue-900 mb-2">Continuous Feedback Cycle</h4>
      <p className="text-sm text-blue-800 mb-2">
        This cycle will allow ongoing feedback collection without a fixed end date. 
        You'll be able to provide feedback continuously and generate reports for any time period.
      </p>
      <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
        <li>Add team members to start collecting feedback</li>
        <li>Provide observations in real-time as they occur</li>
        <li>Generate reports for custom time periods (weekly, monthly, quarterly)</li>
        <li>Track feedback trends and progress over time</li>
      </ul>
    </div>
  );
} 