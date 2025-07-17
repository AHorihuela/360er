import { useState, useCallback, useMemo } from 'react';
import { TimeRangeSelection, FeedbackDensityInfo } from '@/types/review';

interface UseTimeRangeSelectionProps {
  onRangeChange?: (range: TimeRangeSelection) => void;
}

const TIME_RANGE_PRESETS = [
  { preset: 'last_week' as const, label: 'Last 7 days', days: 7 },
  { preset: 'last_month' as const, label: 'Last 30 days', days: 30 },
  { preset: 'last_quarter' as const, label: 'Last 3 months', days: 90 },
  { preset: 'custom' as const, label: 'Custom date range', days: null }
];

const DENSITY_THRESHOLDS = {
  minimum: 3,    // < 3 entries: suggest expanding range
  optimal: 15,   // > 15 entries: suggest focusing on key themes
  maximum: 25    // > 25 entries: warn about report length
};

export function useTimeRangeSelection({ onRangeChange }: UseTimeRangeSelectionProps = {}) {
  const [selectedRange, setSelectedRange] = useState<TimeRangeSelection>(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Default to last 30 days
    
    return {
      preset: 'last_month',
      startDate,
      endDate,
      label: 'Last 30 days'
    };
  });

  // Generate time range from preset
  const generateRangeFromPreset = useCallback((preset: typeof TIME_RANGE_PRESETS[number]['preset']): TimeRangeSelection => {
    const endDate = new Date();
    const startDate = new Date();
    
    const presetConfig = TIME_RANGE_PRESETS.find(p => p.preset === preset);
    if (!presetConfig || !presetConfig.days) {
      return {
        preset: 'custom',
        startDate: new Date(),
        endDate: new Date(),
        label: 'Custom date range'
      };
    }
    
    startDate.setDate(startDate.getDate() - presetConfig.days);
    
    return {
      preset,
      startDate,
      endDate,
      label: presetConfig.label
    };
  }, []);

  // Set range from preset
  const selectPreset = useCallback((preset: typeof TIME_RANGE_PRESETS[number]['preset']) => {
    const range = generateRangeFromPreset(preset);
    setSelectedRange(range);
    onRangeChange?.(range);
  }, [generateRangeFromPreset, onRangeChange]);

  // Set custom range
  const setCustomRange = useCallback((startDate: Date, endDate: Date) => {
    const range: TimeRangeSelection = {
      preset: 'custom',
      startDate,
      endDate,
      label: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
    };
    setSelectedRange(range);
    onRangeChange?.(range);
  }, [onRangeChange]);

  // Calculate feedback density info
  const calculateDensityInfo = useCallback((feedbackCount: number): FeedbackDensityInfo => {
    if (feedbackCount < DENSITY_THRESHOLDS.minimum) {
      const suggestedRange = generateRangeFromPreset('last_quarter');
      return {
        feedbackCount,
        qualitySuggestion: 'expand_range',
        suggestedRange,
        message: `${feedbackCount} feedback entries - consider expanding to last 3 months for a more comprehensive report`
      };
    }
    
    if (feedbackCount > DENSITY_THRESHOLDS.maximum) {
      return {
        feedbackCount,
        qualitySuggestion: 'too_large',
        message: `${feedbackCount} feedback entries - report will focus on key themes and recent patterns`
      };
    }
    
    return {
      feedbackCount,
      qualitySuggestion: 'sufficient',
      message: `${feedbackCount} feedback entries - perfect for a comprehensive report`
    };
  }, [generateRangeFromPreset]);

  // Get suggested ranges based on feedback count
  const getSuggestedRanges = useCallback((feedbackCount: number): TimeRangeSelection[] => {
    if (feedbackCount < DENSITY_THRESHOLDS.minimum) {
      // Suggest longer ranges
      return [
        generateRangeFromPreset('last_quarter'),
        generateRangeFromPreset('last_month')
      ];
    }
    
    if (feedbackCount > DENSITY_THRESHOLDS.maximum) {
      // Suggest shorter ranges
      return [
        generateRangeFromPreset('last_week'),
        generateRangeFromPreset('last_month')
      ];
    }
    
    // Current range is good
    return [];
  }, [generateRangeFromPreset]);

  // Available presets
  const availablePresets = useMemo(() => TIME_RANGE_PRESETS, []);

  // Check if current range is a preset
  const isPresetSelected = useMemo(() => {
    return selectedRange.preset !== 'custom';
  }, [selectedRange.preset]);

  // Get days between selected dates
  const daysBetween = useMemo(() => {
    const timeDiff = selectedRange.endDate.getTime() - selectedRange.startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }, [selectedRange.startDate, selectedRange.endDate]);

  return {
    selectedRange,
    selectPreset,
    setCustomRange,
    calculateDensityInfo,
    getSuggestedRanges,
    availablePresets,
    isPresetSelected,
    daysBetween,
    densityThresholds: DENSITY_THRESHOLDS
  };
} 