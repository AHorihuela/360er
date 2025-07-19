// Design tokens for consistent styling across the application

export const colors = {
  // Status colors
  status: {
    completed: {
      bg: "bg-orange-100",
      text: "text-orange-800", 
      border: "border-orange-200",
      hover: "hover:bg-orange-200"
    },
    active: {
      bg: "bg-green-100",
      text: "text-green-800",
      border: "border-green-200", 
      hover: "hover:bg-green-200"
    },
    inProgress: {
      bg: "bg-blue-100",
      text: "text-blue-800",
      border: "border-blue-200",
      hover: "hover:bg-blue-200"
    },
    overdue: {
      bg: "bg-red-100", 
      text: "text-red-800",
      border: "border-red-200",
      hover: "hover:bg-red-200"
    },
    warning: {
      bg: "bg-amber-100",
      text: "text-amber-800",
      border: "border-amber-200",
      hover: "hover:bg-amber-200"
    },
    draft: {
      bg: "bg-gray-100",
      text: "text-gray-800", 
      border: "border-gray-200",
      hover: "hover:bg-gray-200"
    }
  },

  // Neutral colors for badges and UI elements
  neutral: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    hover: "hover:bg-slate-200"
  },

  // Activity/metric card colors
  metrics: {
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200"
  },

  // Confidence level colors
  confidence: {
    high: {
      bg: "bg-green-100",
      text: "text-green-700",
      border: "border-green-200",
      hover: "hover:bg-green-200"
    },
    medium: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      hover: "hover:bg-amber-100"
    },
    low: {
      bg: "bg-red-100",
      text: "text-red-700",
      border: "border-red-200",
      hover: "hover:bg-red-200"
    }
  },

  // Relationship type colors
  relationship: {
    senior: {
      bg: "bg-blue-500/10",
      text: "text-blue-700",
      border: "border-blue-200",
      hover: "hover:bg-blue-500/20"
    },
    peer: {
      bg: "bg-green-500/10",
      text: "text-green-700",
      border: "border-green-200",
      hover: "hover:bg-green-500/20"
    },
    junior: {
      bg: "bg-yellow-500/10",
      text: "text-yellow-700",
      border: "border-yellow-200",
      hover: "hover:bg-yellow-500/20"
    }
  },

  // Feature/beta badge colors
  feature: {
    beta: {
      bg: "bg-black",
      text: "text-white",
      border: "border-black",
      hover: "hover:bg-black/90"
    },
    warning: {
      bg: "bg-amber-100",
      text: "text-amber-800",
      border: "border-amber-200",
      hover: "hover:bg-amber-200"
    }
  },

  // Loading state colors
  loading: {
    primary: {
      spinner: "text-primary",
      background: "bg-background"
    },
    muted: {
      spinner: "text-muted-foreground", 
      background: "bg-muted"
    },
    success: {
      spinner: "text-green-500",
      background: "bg-green-50"
    },
    error: {
      spinner: "text-red-500",
      background: "bg-red-50"
    },
    warning: {
      spinner: "text-amber-500",
      background: "bg-amber-50"
    }
  }
} as const;

export const spacing = {
  card: {
    header: "pb-4",
    content: "py-4", 
    footer: "pt-0 pb-4"
  },
  badge: {
    gap: "gap-2",
    margin: "mt-0.5"
  },
  loading: {
    container: {
      sm: "p-2",
      md: "p-4",
      lg: "p-6"
    },
    gap: {
      sm: "gap-2",
      md: "gap-3", 
      lg: "gap-4"
    }
  }
} as const;

export const sizes = {
  // Loading spinner sizes
  spinner: {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8",
    xl: "h-12 w-12"
  },
  // Status icon sizes
  statusIcon: {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  }
} as const;

export const animations = {
  loading: {
    spin: "animate-spin",
    pulse: "animate-pulse",
    ping: "animate-ping"
  }
} as const;

export const typography = {
  badge: "text-xs",
  cardTitle: "text-base font-semibold",
  metricValue: "text-lg font-semibold",
  metricLabel: "text-xs text-muted-foreground",
  sectionLabel: "text-sm font-medium text-muted-foreground"
} as const;

// Helper functions to combine color tokens
export function getStatusColorClasses(variant: keyof typeof colors.status) {
  const color = colors.status[variant];
  return `${color.bg} ${color.text} ${color.border} ${color.hover}`;
}

export function getNeutralColorClasses() {
  const color = colors.neutral;
  return `${color.bg} ${color.text} ${color.border} ${color.hover}`;
}

export function getConfidenceColorClasses(variant: keyof typeof colors.confidence) {
  const color = colors.confidence[variant];
  return `${color.bg} ${color.text} ${color.border} ${color.hover}`;
}

export function getRelationshipColorClasses(variant: keyof typeof colors.relationship) {
  const color = colors.relationship[variant];
  return `${color.bg} ${color.text} ${color.border} ${color.hover}`;
}

export function getFeatureColorClasses(variant: keyof typeof colors.feature) {
  const color = colors.feature[variant];
  return `${color.bg} ${color.text} ${color.border} ${color.hover}`;
}

export function getLoadingColorClasses(variant: keyof typeof colors.loading) {
  const color = colors.loading[variant];
  return `${color.spinner} ${color.background}`;
}