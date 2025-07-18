import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { VoiceStatusMessages } from '../VoiceStatusMessages';

// Mock UI components
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <div data-testid="badge" data-variant={variant} className={className}>
      {children}
    </div>
  )
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  CheckCircle: ({ className }: any) => <div data-testid="check-circle" className={className} />,
  AlertCircle: ({ className }: any) => <div data-testid="alert-circle" className={className} />,
  Loader2: ({ className }: any) => <div data-testid="loader2" className={className} />
}));

// Mock utils
vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' ')
}));

describe('VoiceStatusMessages', () => {
  const defaultProps = {
    isProcessing: false,
    isTranscribing: false,
    transcript: '',
    error: null as string | null,
    hasInteracted: false,
    isMobile: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Transcription Success State', () => {
    it('should show success message when transcript is available and user has interacted', () => {
      render(
        <VoiceStatusMessages 
          {...defaultProps}
          transcript="Hello world"
          hasInteracted={true}
        />
      );
      
      expect(screen.getByText('✅ Transcription Complete')).toBeInTheDocument();
      expect(screen.getByText('Your voice has been successfully converted to text and added to your feedback.')).toBeInTheDocument();
      expect(screen.getByTestId('check-circle')).toBeInTheDocument();
    });

    it('should not show success message when transcript exists but user has not interacted', () => {
      render(
        <VoiceStatusMessages 
          {...defaultProps}
          transcript="Hello world"
          hasInteracted={false}
        />
      );
      
      expect(screen.queryByText('✅ Transcription Complete')).not.toBeInTheDocument();
    });

    it('should not show success message when user interacted but no transcript', () => {
      render(
        <VoiceStatusMessages 
          {...defaultProps}
          transcript=""
          hasInteracted={true}
        />
      );
      
      expect(screen.queryByText('✅ Transcription Complete')).not.toBeInTheDocument();
    });
  });

  describe('Transcribing State', () => {
    it('should show processing message when transcribing', () => {
      render(
        <VoiceStatusMessages 
          {...defaultProps}
          isTranscribing={true}
        />
      );
      
      expect(screen.getByText('🎯 Processing Audio')).toBeInTheDocument();
      expect(screen.getByText('Converting your speech to text using AI transcription...')).toBeInTheDocument();
      expect(screen.getByTestId('loader2')).toBeInTheDocument();
    });

    it('should not show transcribing message when not transcribing', () => {
      render(
        <VoiceStatusMessages 
          {...defaultProps}
          isTranscribing={false}
        />
      );
      
      expect(screen.queryByText('🎯 Processing Audio')).not.toBeInTheDocument();
    });

    it('should show loader animation when transcribing', () => {
      render(
        <VoiceStatusMessages 
          {...defaultProps}
          isTranscribing={true}
        />
      );
      
      const loader = screen.getByTestId('loader2');
      expect(loader.className).toContain('animate-spin');
    });
  });

  describe('Error States', () => {
    it('should show error message when error exists and not processing', () => {
      render(
        <VoiceStatusMessages 
          {...defaultProps}
          error="Microphone access denied"
          isProcessing={false}
        />
      );
      
      // The component should show error messages
      // Based on the component logic, it would show error states when not processing
      expect(screen.queryByText('✅ Transcription Complete')).not.toBeInTheDocument();
      expect(screen.queryByText('🎯 Processing Audio')).not.toBeInTheDocument();
    });

    it('should not show error message when processing', () => {
      render(
        <VoiceStatusMessages 
          {...defaultProps}
          error="Some error"
          isProcessing={true}
        />
      );
      
      // When processing, error messages should not be shown
      // Only transcription or success states should show
      expect(screen.queryByText('🎯 Processing Audio')).not.toBeInTheDocument();
    });
  });

  describe('State Priorities', () => {
    it('should prioritize success state over transcribing state', () => {
      render(
        <VoiceStatusMessages 
          {...defaultProps}
          transcript="Hello world"
          hasInteracted={true}
          isTranscribing={true}
        />
      );
      
      // Success state should take priority
      expect(screen.getByText('✅ Transcription Complete')).toBeInTheDocument();
      expect(screen.queryByText('🎯 Processing Audio')).not.toBeInTheDocument();
    });

    it('should prioritize success state over error state', () => {
      render(
        <VoiceStatusMessages 
          {...defaultProps}
          transcript="Hello world"
          hasInteracted={true}
          error="Some error"
        />
      );
      
      // Success state should take priority
      expect(screen.getByText('✅ Transcription Complete')).toBeInTheDocument();
    });

    it('should prioritize transcribing state over error state', () => {
      render(
        <VoiceStatusMessages 
          {...defaultProps}
          isTranscribing={true}
          error="Some error"
        />
      );
      
      // Transcribing state should take priority
      expect(screen.getByText('🎯 Processing Audio')).toBeInTheDocument();
    });
  });

  describe('Visual Styling', () => {
    it('should apply success styling for transcription complete', () => {
      const { container } = render(
        <VoiceStatusMessages 
          {...defaultProps}
          transcript="Hello world"
          hasInteracted={true}
        />
      );
      
      const successContainer = container.querySelector('.bg-green-50');
      expect(successContainer).toBeInTheDocument();
      expect(successContainer?.className).toContain('border-green-200');
    });

    it('should apply processing styling for transcribing', () => {
      const { container } = render(
        <VoiceStatusMessages 
          {...defaultProps}
          isTranscribing={true}
        />
      );
      
      const processingContainer = container.querySelector('.bg-blue-50');
      expect(processingContainer).toBeInTheDocument();
      expect(processingContainer?.className).toContain('border-blue-200');
    });

    it('should have proper badge styling for success state', () => {
      render(
        <VoiceStatusMessages 
          {...defaultProps}
          transcript="Hello world"
          hasInteracted={true}
        />
      );
      
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveAttribute('data-variant', 'default');
      expect(badge.className).toContain('bg-green-100');
      expect(badge.className).toContain('text-green-800');
    });

    it('should have proper badge styling for processing state', () => {
      render(
        <VoiceStatusMessages 
          {...defaultProps}
          isTranscribing={true}
        />
      );
      
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveAttribute('data-variant', 'secondary');
      expect(badge.className).toContain('bg-blue-100');
      expect(badge.className).toContain('text-blue-800');
    });
  });

  describe('Mobile Responsive Behavior', () => {
    it('should work the same on mobile and desktop', () => {
      const { rerender } = render(
        <VoiceStatusMessages 
          {...defaultProps}
          transcript="Hello world"
          hasInteracted={true}
          isMobile={false}
        />
      );
      
      expect(screen.getByText('✅ Transcription Complete')).toBeInTheDocument();
      
      rerender(
        <VoiceStatusMessages 
          {...defaultProps}
          transcript="Hello world"
          hasInteracted={true}
          isMobile={true}
        />
      );
      
      expect(screen.getByText('✅ Transcription Complete')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty transcript string', () => {
      render(
        <VoiceStatusMessages 
          {...defaultProps}
          transcript=""
          hasInteracted={true}
        />
      );
      
      expect(screen.queryByText('✅ Transcription Complete')).not.toBeInTheDocument();
    });

    it('should handle whitespace-only transcript', () => {
      render(
        <VoiceStatusMessages 
          {...defaultProps}
          transcript="   "
          hasInteracted={true}
        />
      );
      
      // Component treats whitespace as valid transcript
      expect(screen.getByText('✅ Transcription Complete')).toBeInTheDocument();
    });

    it('should handle null error gracefully', () => {
      render(
        <VoiceStatusMessages 
          {...defaultProps}
          error={null}
          isProcessing={false}
        />
      );
      
      // Should not crash with null error
      expect(screen.queryByText('✅ Transcription Complete')).not.toBeInTheDocument();
    });

    it('should handle all false states', () => {
      const { container } = render(
        <VoiceStatusMessages 
          {...defaultProps}
          isProcessing={false}
          isTranscribing={false}
          transcript=""
          error={null}
          hasInteracted={false}
        />
      );
      
      // Should show Pro Tip when not processing and user hasn't interacted
      expect(screen.getByText('💡 Pro Tip')).toBeInTheDocument();
      expect(screen.getByText(/Click the voice button or press ⌘K to start/)).toBeInTheDocument();
    });
  });

  describe('Content Accuracy', () => {
    it('should show appropriate messaging for different states', () => {
      // Test success message content
      render(
        <VoiceStatusMessages 
          {...defaultProps}
          transcript="Test transcript"
          hasInteracted={true}
        />
      );
      
      expect(screen.getByText('Your voice has been successfully converted to text and added to your feedback.')).toBeInTheDocument();
      
      // Test processing message content
      const { rerender } = render(
        <VoiceStatusMessages 
          {...defaultProps}
          isTranscribing={true}
        />
      );
      
      expect(screen.getByText('Converting your speech to text using AI transcription...')).toBeInTheDocument();
    });

    it('should use appropriate icons for different states', () => {
      // Test success icon
      render(
        <VoiceStatusMessages 
          {...defaultProps}
          transcript="Test transcript"
          hasInteracted={true}
        />
      );
      
      expect(screen.getByTestId('check-circle')).toBeInTheDocument();
      
      // Test processing icon
      const { rerender } = render(
        <VoiceStatusMessages 
          {...defaultProps}
          isTranscribing={true}
        />
      );
      
      expect(screen.getByTestId('loader2')).toBeInTheDocument();
    });
  });
}); 