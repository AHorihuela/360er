import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AudioLevelVisualizer } from '../AudioLevelVisualizer';

// Mock UI components
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <div data-testid="badge" data-variant={variant} className={className}>
      {children}
    </div>
  )
}));

// Mock utils
vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' ')
}));

describe('AudioLevelVisualizer', () => {
  const defaultProps = {
    audioLevel: 0.5,
    averageLevel: 0.3
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Audio Level Bars', () => {
    it('should render 8 audio level bars', () => {
      const { container } = render(<AudioLevelVisualizer {...defaultProps} />);
      
      // Count the number of bar elements
      const bars = container.querySelectorAll('[style*="height"]');
      expect(bars).toHaveLength(8);
    });

    it('should activate bars based on audio level', () => {
      const { container } = render(
        <AudioLevelVisualizer audioLevel={0.5} averageLevel={0.3} />
      );
      
      // With 50% audio level, approximately half the bars should be active
      // (Active bars have higher opacity)
      const bars = container.querySelectorAll('[style*="height"]');
      
      let activeBars = 0;
      bars.forEach(bar => {
        const style = (bar as HTMLElement).style;
        if (style.opacity === '1') {
          activeBars++;
        }
      });
      
      // Should have some active bars for 50% level
      expect(activeBars).toBeGreaterThan(0);
      expect(activeBars).toBeLessThanOrEqual(8);
    });

    it('should have no active bars for zero audio level', () => {
      const { container } = render(
        <AudioLevelVisualizer audioLevel={0} averageLevel={0} />
      );
      
      const bars = container.querySelectorAll('[style*="height"]');
      
      let activeBars = 0;
      bars.forEach(bar => {
        const style = (bar as HTMLElement).style;
        if (style.opacity === '1') {
          activeBars++;
        }
      });
      
      expect(activeBars).toBe(0);
    });

    it('should activate all bars for maximum audio level', () => {
      const { container } = render(
        <AudioLevelVisualizer audioLevel={1} averageLevel={1} />
      );
      
      const bars = container.querySelectorAll('[style*="height"]');
      
      let activeBars = 0;
      bars.forEach(bar => {
        const style = (bar as HTMLElement).style;
        if (style.opacity === '1') {
          activeBars++;
        }
      });
      
      expect(activeBars).toBe(8);
    });

    it('should scale bar heights based on audio level', () => {
      const { container } = render(
        <AudioLevelVisualizer audioLevel={0.8} averageLevel={0.6} />
      );
      
      const bars = container.querySelectorAll('[style*="height"]');
      const heights: number[] = [];
      
      bars.forEach(bar => {
        const style = (bar as HTMLElement).style;
        const heightMatch = style.height.match(/(\d+)px/);
        if (heightMatch) {
          heights.push(parseInt(heightMatch[1], 10));
        }
      });
      
      // Heights should vary based on the level
      const uniqueHeights = new Set(heights);
      expect(uniqueHeights.size).toBeGreaterThan(1);
    });
  });

  describe('Status Messages', () => {
    it('should show "Speak louder" for very low average level', () => {
      render(
        <AudioLevelVisualizer audioLevel={0.1} averageLevel={0.01} />
      );
      
      expect(screen.getByText('🎤 Speak louder')).toBeInTheDocument();
      expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'destructive');
    });

    it('should show "Good signal" for moderate average level', () => {
      render(
        <AudioLevelVisualizer audioLevel={0.3} averageLevel={0.05} />
      );
      
      expect(screen.getByText('🎤 Good signal')).toBeInTheDocument();
      expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'secondary');
    });

    it('should show "Perfect level" for high average level', () => {
      render(
        <AudioLevelVisualizer audioLevel={0.8} averageLevel={0.1} />
      );
      
      expect(screen.getByText('🎤 Perfect level')).toBeInTheDocument();
      expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'default');
    });

    it('should not show status message for good signal threshold and above', () => {
      render(
        <AudioLevelVisualizer audioLevel={0.9} averageLevel={0.08} />
      );
      
      // Should not show any status message when averageLevel >= goodSignalThreshold
      expect(screen.queryByTestId('badge')).not.toBeInTheDocument();
    });

    it('should use averageLevel for status determination, not audioLevel', () => {
      // High instant audioLevel but low averageLevel
      render(
        <AudioLevelVisualizer audioLevel={0.9} averageLevel={0.01} />
      );
      
      // Should show "Speak louder" based on averageLevel
      expect(screen.getByText('🎤 Speak louder')).toBeInTheDocument();
    });
  });

  describe('Visual Styling', () => {
    it('should apply gradient background to bar container', () => {
      const { container } = render(<AudioLevelVisualizer {...defaultProps} />);
      
      const barContainer = container.querySelector('.bg-gradient-to-r');
      expect(barContainer).toBeInTheDocument();
      expect(barContainer?.className).toContain('from-slate-50');
      expect(barContainer?.className).toContain('to-slate-100');
    });

    it('should apply proper styling to individual bars', () => {
      const { container } = render(
        <AudioLevelVisualizer audioLevel={0.6} averageLevel={0.4} />
      );
      
      const bars = container.querySelectorAll('[class*="w-3"]');
      expect(bars.length).toBeGreaterThan(0);
      
      bars.forEach(bar => {
        expect(bar.className).toContain('w-3');
        expect(bar.className).toContain('rounded-full');
        expect(bar.className).toContain('transition-all');
      });
    });

    it('should apply different colors based on level ranges', () => {
      const { container } = render(
        <AudioLevelVisualizer audioLevel={0.8} averageLevel={0.6} />
      );
      
      // Check that bars have gradient color classes applied
      const coloredBars = container.querySelectorAll('[class*="bg-gradient"]');
      expect(coloredBars.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative audio levels', () => {
      render(
        <AudioLevelVisualizer audioLevel={-0.1} averageLevel={-0.05} />
      );
      
      // Should not crash and should show appropriate status
      expect(screen.getByText('🎤 Speak louder')).toBeInTheDocument();
    });

    it('should handle audio levels above 1', () => {
      const { container } = render(
        <AudioLevelVisualizer audioLevel={1.5} averageLevel={1.2} />
      );
      
      // Should cap at maximum and not crash
      const bars = container.querySelectorAll('[style*="height"]');
      expect(bars).toHaveLength(8);
    });

    it('should handle zero audio levels', () => {
      render(
        <AudioLevelVisualizer audioLevel={0} averageLevel={0} />
      );
      
      expect(screen.getByText('🎤 Speak louder')).toBeInTheDocument();
    });

    it('should handle exact threshold values', () => {
      // Test exact speakLouderThreshold (0.03)
      render(
        <AudioLevelVisualizer audioLevel={0.1} averageLevel={0.03} />
      );
      
      expect(screen.getByText('🎤 Good signal')).toBeInTheDocument();
    });

    it('should handle exact goodSignalThreshold (0.08)', () => {
      render(
        <AudioLevelVisualizer audioLevel={0.1} averageLevel={0.08} />
      );
      
      // Should not show badge at exactly the threshold
      expect(screen.queryByTestId('badge')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper contrast and visual indicators', () => {
      const { container } = render(
        <AudioLevelVisualizer audioLevel={0.5} averageLevel={0.3} />
      );
      
      // Check that visual elements are present
      const barContainer = container.querySelector('[class*="h-12"]');
      expect(barContainer).toBeInTheDocument();
      
      const statusBadge = screen.queryByTestId('badge');
      if (statusBadge) {
        expect(statusBadge).toHaveAttribute('data-variant');
      }
    });

    it('should provide visual feedback through animation classes', () => {
      const { container } = render(
        <AudioLevelVisualizer audioLevel={0.7} averageLevel={0.5} />
      );
      
      const animatedBars = container.querySelectorAll('[class*="transition-all"]');
      expect(animatedBars.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should render efficiently with many updates', () => {
      const { rerender } = render(
        <AudioLevelVisualizer audioLevel={0.1} averageLevel={0.1} />
      );
      
      // Simulate rapid level updates
      for (let i = 0; i < 10; i++) {
        rerender(
          <AudioLevelVisualizer 
            audioLevel={i / 10} 
            averageLevel={i / 20} 
          />
        );
      }
      
      // Should not crash and render final state
      const { container } = render(
        <AudioLevelVisualizer audioLevel={0.9} averageLevel={0.45} />
      );
      
      const bars = container.querySelectorAll('[style*="height"]');
      expect(bars).toHaveLength(8);
    });
  });

  describe('Responsive Behavior', () => {
    it('should maintain bar count across different levels', () => {
      const levels = [0, 0.2, 0.5, 0.8, 1.0];
      
      levels.forEach(level => {
        const { container } = render(
          <AudioLevelVisualizer audioLevel={level} averageLevel={level / 2} />
        );
        
        const bars = container.querySelectorAll('[style*="height"]');
        expect(bars).toHaveLength(8);
      });
    });

    it('should handle rapid level changes smoothly', () => {
      const { rerender } = render(
        <AudioLevelVisualizer audioLevel={0} averageLevel={0} />
      );
      
      // Rapid change from silent to loud
      rerender(
        <AudioLevelVisualizer audioLevel={1} averageLevel={0.8} />
      );
      
      // Should handle the change without issues
      expect(screen.queryByTestId('badge')).not.toBeInTheDocument();
    });
  });
}); 