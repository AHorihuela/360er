import { AggregateScore, AdjustmentDetail } from './types';
import { OUTLIER_THRESHOLDS } from './constants';

interface OutlierNotificationProps {
  score: AggregateScore;
}

export function OutlierNotification({ score }: OutlierNotificationProps) {
  if (!score.hasOutliers || !score.adjustmentDetails?.length) return null;

  const extremeAdjustments = score.adjustmentDetails.filter(d => d.adjustmentType === 'extreme');
  const moderateAdjustments = score.adjustmentDetails.filter(d => d.adjustmentType === 'moderate');

  return (
    <>
      <br />
      <div className="text-yellow-600 space-y-1">
        <p>Note: Some outlier scores were adjusted:</p>
        <ul className="text-xs pl-4 space-y-0.5">
          {extremeAdjustments.length > 0 && (
            <li>
              • {extremeAdjustments.length} extreme {extremeAdjustments.length === 1 ? 'score' : 'scores'} reduced to 50% impact
              {extremeAdjustments.map((adj: AdjustmentDetail, i: number) => (
                <div key={i} className="pl-2 text-muted-foreground">
                  {adj.relationship} feedback: {adj.originalScore.toFixed(1)} → {(adj.originalScore * OUTLIER_THRESHOLDS.maxReduction).toFixed(1)}
                </div>
              ))}
            </li>
          )}
          {moderateAdjustments.length > 0 && (
            <li>
              • {moderateAdjustments.length} moderate {moderateAdjustments.length === 1 ? 'score' : 'scores'} reduced to 75% impact
              {moderateAdjustments.map((adj: AdjustmentDetail, i: number) => (
                <div key={i} className="pl-2 text-muted-foreground">
                  {adj.relationship} feedback: {adj.originalScore.toFixed(1)} → {(adj.originalScore * OUTLIER_THRESHOLDS.moderateReduction).toFixed(1)}
                </div>
              ))}
            </li>
          )}
        </ul>
      </div>
    </>
  );
} 