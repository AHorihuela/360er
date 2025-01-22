export function calculateWeightedAverageScore(scores: Array<{ score: number; confidence: 'low' | 'medium' | 'high' }>) {
  return scores.reduce((acc, score) => {
    const weight = score.confidence === 'high' ? 1 : score.confidence === 'medium' ? 0.7 : 0.4;
    return acc + (score.score * weight);
  }, 0) / scores.reduce((acc, score) => {
    const weight = score.confidence === 'high' ? 1 : score.confidence === 'medium' ? 0.7 : 0.4;
    return acc + weight;
  }, 0);
}

export function getScoreProgressClass(score: number) {
  if (score >= 80) return "bg-emerald-100 [&>div]:bg-emerald-500";
  if (score >= 70) return "bg-blue-100 [&>div]:bg-blue-500";
  if (score >= 60) return "bg-yellow-100 [&>div]:bg-yellow-500";
  if (score >= 50) return "bg-orange-100 [&>div]:bg-orange-500";
  return "bg-red-100 [&>div]:bg-red-500";
}

export function getConfidenceClass(confidencePercentage: number) {
  if (confidencePercentage >= 80) return {
    base: "bg-green-100 text-green-700",
    hover: "hover:bg-green-200"
  };
  if (confidencePercentage >= 60) return {
    base: "bg-amber-50 text-amber-700",
    hover: "hover:bg-amber-100"
  };
  return {
    base: "bg-red-100 text-red-700",
    hover: "hover:bg-red-200"
  };
}

export function getConfidenceLabel(confidencePercentage: number) {
  if (confidencePercentage >= 80) return "High";
  if (confidencePercentage >= 60) return "Medium";
  return "Low";
} 