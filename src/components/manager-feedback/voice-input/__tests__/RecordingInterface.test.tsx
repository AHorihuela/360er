import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { RecordingInterface } from '../RecordingInterface';

// Mock child components
vi.mock('../AudioLevelVisualizer', () => ({
  AudioLevelVisualizer: ({ audioLevel, averageLevel }: any) => (
    <div data-testid="audio-level-visualizer">
      Audio Level: {audioLevel}, Average: {averageLevel}
    </div>
  )
}));

vi.mock('../RecordingTimer', () => ({
  RecordingTimer: ({ startTime }: any) => (
    <div data-testid="recording-timer">
      Timer: {startTime ? 'Active' : 'Inactive'}
    </div>
  )
}));

// Mock utils
vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' ')
}));

describe('RecordingInterface', () => {
  const defaultProps = {
    isRecording: false,
    isRecordingStarting: false,
    audioLevel: 0.5,
    averageLevel: 0.3,
    recordingStartTime: Date.now(),
    baseText: '',
    isMobile: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering Conditions', () => {
    it('should not render when neither recording nor starting', () => {
      const { container } = render(
        <RecordingInterface 
          {...defaultProps}
          isRecording={false}
          isRecordingStarting={false}
        />
      );
      
      expect(container.firstChild).toBeNull();
    });

    it('should render when recording is starting', () => {
      render(
        <RecordingInterface 
          {...defaultProps}
          isRecording={false}
          isRecordingStarting={true}
        />
      );
      
      expect(screen.getByText('Starting...')).toBeInTheDocument();
    });

    it('should render when recording is active', () => {
      render(
        <RecordingInterface 
          {...defaultProps}
          isRecording={true}
          isRecordingStarting={false}
        />
      );
      
      expect(screen.getByText('Recording Active')).toBeInTheDocument();
    });

    it('should render when both recording and starting are true', () => {
      render(
        <RecordingInterface 
          {...defaultProps}
          isRecording={true}
          isRecordingStarting={true}
        />
      );
      
      // When both are true, isRecordingStarting takes priority
      expect(screen.getByText('Starting...')).toBeInTheDocument();
    });
  });

  describe('Recording States', () => {
    it('should show "Starting..." when recording is starting', () => {
      render(
        <RecordingInterface 
          {...defaultProps}
          isRecording={false}
          isRecordingStarting={true}
        />
      );
      
      expect(screen.getByText('Starting...')).toBeInTheDocument();
      expect(screen.queryByText('Recording Active')).not.toBeInTheDocument();
    });

    it('should show "Recording Active" when recording', () => {
      render(
        <RecordingInterface 
          {...defaultProps}
          isRecording={true}
          isRecordingStarting={false}
        />
      );
      
      expect(screen.getByText('Recording Active')).toBeInTheDocument();
      expect(screen.queryByText('Starting...')).not.toBeInTheDocument();
    });

    it('should show recording indicator with pulsing animation', () => {
      render(
        <RecordingInterface 
          {...defaultProps}
          isRecording={true}
        />
      );
      
      // Check for recording indicator elements
      const indicators = document.querySelectorAll('.bg-red-500, .bg-red-400');
      expect(indicators.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Timer Display', () => {
    it('should show timer when recording is active', () => {
      render(
        <RecordingInterface 
          {...defaultProps}
          isRecording={true}
          recordingStartTime={Date.now()}
        />
      );
      
      expect(screen.getByTestId('recording-timer')).toBeInTheDocument();
      expect(screen.getByText(/Timer: Active/)).toBeInTheDocument();
    });

    it('should not show timer when only starting to record', () => {
      render(
        <RecordingInterface 
          {...defaultProps}
          isRecording={false}
          isRecordingStarting={true}
        />
      );
      
      expect(screen.queryByTestId('recording-timer')).not.toBeInTheDocument();
    });

    it('should show timer even when recordingStartTime is null', () => {
      render(
        <RecordingInterface 
          {...defaultProps}
          isRecording={true}
          recordingStartTime={null}
        />
      );
      
      expect(screen.getByTestId('recording-timer')).toBeInTheDocument();
      expect(screen.getByText(/Timer: Inactive/)).toBeInTheDocument();
    });
  });

  describe('Audio Level Visualizer', () => {
    it('should show audio visualizer when recording', () => {
      render(
        <RecordingInterface 
          {...defaultProps}
          isRecording={true}
          audioLevel={0.7}
          averageLevel={0.4}
        />
      );
      
      expect(screen.getByTestId('audio-level-visualizer')).toBeInTheDocument();
      expect(screen.getByText(/Audio Level: 0.7, Average: 0.4/)).toBeInTheDocument();
    });

    it('should not show audio visualizer when only starting', () => {
      render(
        <RecordingInterface 
          {...defaultProps}
          isRecording={false}
          isRecordingStarting={true}
        />
      );
      
      expect(screen.queryByTestId('audio-level-visualizer')).not.toBeInTheDocument();
    });

    it('should pass correct audio levels to visualizer', () => {
      const audioLevel = 0.8;
      const averageLevel = 0.6;
      
      render(
        <RecordingInterface 
          {...defaultProps}
          isRecording={true}
          audioLevel={audioLevel}
          averageLevel={averageLevel}
        />
      );
      
      expect(screen.getByText(`Audio Level: ${audioLevel}, Average: ${averageLevel}`)).toBeInTheDocument();
    });
  });

  describe('Base Text Display', () => {
    it('should show base text when provided', () => {
      const baseText = 'This is existing text that will be appended to';
      
      render(
        <RecordingInterface 
          {...defaultProps}
          isRecording={true}
          baseText={baseText}
        />
      );
      
      expect(screen.getByText('Adding to existing text:')).toBeInTheDocument();
      expect(screen.getByText(baseText)).toBeInTheDocument();
    });

    it('should not show base text section when baseText is empty', () => {
      render(
        <RecordingInterface 
          {...defaultProps}
          isRecording={true}
          baseText=""
        />
      );
      
      expect(screen.queryByText('Adding to existing text:')).not.toBeInTheDocument();
    });

    it('should truncate long base text', () => {
      const longText = 'A'.repeat(100);
      
      render(
        <RecordingInterface 
          {...defaultProps}
          isRecording={true}
          baseText={longText}
        />
      );
      
      expect(screen.getByText('Adding to existing text:')).toBeInTheDocument();
      expect(screen.getByText(/A{80}\.\.\.$/)).toBeInTheDocument();
    });

    it('should show full text when under 80 characters', () => {
      const shortText = 'Short text';
      
      render(
        <RecordingInterface 
          {...defaultProps}
          isRecording={true}
          baseText={shortText}
        />
      );
      
      expect(screen.getByText(shortText)).toBeInTheDocument();
      expect(screen.queryByText(/\.\.\./)).not.toBeInTheDocument();
    });
  });

  describe('Mobile Responsive Behavior', () => {
    it('should apply mobile styles when isMobile is true', () => {
      const { container } = render(
        <RecordingInterface 
          {...defaultProps}
          isRecording={true}
          isMobile={true}
        />
      );
      
      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv.className).toContain('p-4 space-y-3');
    });

    it('should apply desktop styles when isMobile is false', () => {
      const { container } = render(
        <RecordingInterface 
          {...defaultProps}
          isRecording={true}
          isMobile={false}
        />
      );
      
      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv.className).not.toContain('p-4 space-y-3');
    });
  });

  describe('Visual Styling', () => {
    it('should apply gradient background and proper styling', () => {
      const { container } = render(
        <RecordingInterface 
          {...defaultProps}
          isRecording={true}
        />
      );
      
      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv.className).toContain('bg-gradient-to-br');
      expect(mainDiv.className).toContain('from-blue-50');
      expect(mainDiv.className).toContain('to-indigo-100');
      expect(mainDiv.className).toContain('rounded-2xl');
      expect(mainDiv.className).toContain('border-blue-200');
      expect(mainDiv.className).toContain('shadow-lg');
    });

    it('should have proper layout structure', () => {
      render(
        <RecordingInterface 
          {...defaultProps}
          isRecording={true}
          baseText="Some text"
        />
      );
      
      // Check for header section
      expect(screen.getByText('Recording Active')).toBeInTheDocument();
      
      // Check for timer
      expect(screen.getByTestId('recording-timer')).toBeInTheDocument();
      
      // Check for audio visualizer
      expect(screen.getByTestId('audio-level-visualizer')).toBeInTheDocument();
      
      // Check for base text section
      expect(screen.getByText('Adding to existing text:')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero audio levels', () => {
      render(
        <RecordingInterface 
          {...defaultProps}
          isRecording={true}
          audioLevel={0}
          averageLevel={0}
        />
      );
      
      expect(screen.getByText(/Audio Level: 0, Average: 0/)).toBeInTheDocument();
    });

    it('should handle maximum audio levels', () => {
      render(
        <RecordingInterface 
          {...defaultProps}
          isRecording={true}
          audioLevel={1}
          averageLevel={1}
        />
      );
      
      expect(screen.getByText(/Audio Level: 1, Average: 1/)).toBeInTheDocument();
    });

    it('should handle undefined isRecordingStarting prop', () => {
      const propsWithoutStarting = { ...defaultProps };
      delete (propsWithoutStarting as any).isRecordingStarting;
      
      render(
        <RecordingInterface 
          {...propsWithoutStarting}
          isRecording={true}
        />
      );
      
      expect(screen.getByText('Recording Active')).toBeInTheDocument();
    });

    it('should handle whitespace-only base text', () => {
      render(
        <RecordingInterface 
          {...defaultProps}
          isRecording={true}
          baseText="   "
        />
      );
      
      expect(screen.getByText('Adding to existing text:')).toBeInTheDocument();
    });
  });
}); 