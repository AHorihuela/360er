import React from 'react';

interface TeamSummaryStatsProps {
  employeesWithAnalytics: number;
  totalEmployees: number;
  includedReviewCount: number;
  totalReviewCount: number;
  averageEvidenceCount: number;
}

export function TeamSummaryStats({
  employeesWithAnalytics,
  totalEmployees,
  includedReviewCount,
  totalReviewCount,
  averageEvidenceCount
}: TeamSummaryStatsProps) {
  return (
    <div className="grid gap-4 grid-cols-3">
      <div className="p-4 border rounded-lg bg-slate-50">
        <div className="text-sm font-medium text-muted-foreground mb-1">Team Coverage</div>
        <div className="text-2xl font-semibold">{employeesWithAnalytics}/{totalEmployees}</div>
        <div className="text-sm text-muted-foreground">employees analyzed</div>
      </div>
      <div className="p-4 border rounded-lg bg-slate-50">
        <div className="text-sm font-medium text-muted-foreground mb-1">Total Reviews</div>
        <div className="text-2xl font-semibold">{includedReviewCount}/{totalReviewCount}</div>
        <div className="text-sm text-muted-foreground">reviews processed</div>
      </div>
      <div className="p-4 border rounded-lg bg-slate-50">
        <div className="text-sm font-medium text-muted-foreground mb-1">Average Evidence</div>
        <div className="text-2xl font-semibold">{averageEvidenceCount.toFixed(1)}</div>
        <div className="text-sm text-muted-foreground">pieces per competency</div>
      </div>
    </div>
  );
} 