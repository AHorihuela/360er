import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AnalysisSection } from '../../AnalysisSection';
import { InsightContent } from '../../InsightContent';
import { RelationshipInsight, CompetencyScore } from '@/types/feedback/analysis';
import userEvent from '@testing-library/user-event';

// Mock InsightContent component
vi.mock('../../InsightContent', () => ({
  InsightContent: vi.fn(({ insight }) => (
    <div data-testid="insight-content">{insight.themes.join(', ')}</div>
  )),
}));

const mockCompetencyScore: CompetencyScore = {
  name: 'Leadership',
  score: 4.5,
  confidence: 'high',
  description: 'Strong leadership skills',
  evidenceCount: 3,
  roleSpecificNotes: 'Shows great potential',
  evidenceQuotes: ['Quote 1', 'Quote 2']
};

const mockAggregateInsight: RelationshipInsight = {
  relationship: 'aggregate',
  themes: ['Strong communication', 'Team player'],
  competencies: [mockCompetencyScore],
  responseCount: 5,
  uniquePerspectives: ['peer', 'senior']
};

const mockPerspectiveInsight: RelationshipInsight = {
  relationship: 'peer',
  themes: ['Technical expertise', 'Collaboration'],
  competencies: [mockCompetencyScore],
  responseCount: 3,
  uniquePerspectives: ['peer']
};

describe('AnalysisSection', () => {
  it('renders perspective variant correctly', () => {
    render(
      <AnalysisSection
        relationshipType="peer"
        insight={mockPerspectiveInsight}
        responseCount={3}
        isExpanded={false}
        onToggle={() => {}}
        variant="perspective"
      />
    );

    expect(screen.getByRole('heading', { name: 'Peer Perspective' })).toBeInTheDocument();
    const badge = screen.getByText(/responses/);
    expect(badge).toHaveTextContent('3 responses');
  });

  it('renders aggregate variant correctly', () => {
    render(
      <AnalysisSection
        relationshipType="aggregate"
        insight={mockAggregateInsight}
        responseCount={5}
        isExpanded={false}
        onToggle={() => {}}
        variant="aggregate"
      />
    );

    expect(screen.getByRole('heading', { name: 'Overall Analysis' })).toBeInTheDocument();
    const badge = screen.getByText(/responses/);
    expect(badge).toHaveTextContent('5 responses');
  });

  it('toggles content visibility when clicked', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();

    render(
      <AnalysisSection
        relationshipType="peer"
        insight={mockPerspectiveInsight}
        responseCount={3}
        isExpanded={false}
        onToggle={onToggle}
        variant="perspective"
      />
    );

    const header = screen.getByRole('heading', { name: 'Peer Perspective' }).closest('div');
    await user.click(header!);
    expect(onToggle).toHaveBeenCalled();
  });

  it('displays insight content when expanded', () => {
    render(
      <AnalysisSection
        relationshipType="peer"
        insight={mockPerspectiveInsight}
        responseCount={3}
        isExpanded={true}
        onToggle={() => {}}
        variant="perspective"
      />
    );

    expect(screen.getByTestId('insight-content')).toBeInTheDocument();
    expect(screen.getByText('Technical expertise, Collaboration')).toBeInTheDocument();
  });

  it('handles undefined insight gracefully', () => {
    render(
      <AnalysisSection
        relationshipType="peer"
        insight={undefined}
        responseCount={0}
        isExpanded={false}
        onToggle={() => {}}
        variant="perspective"
      />
    );

    expect(screen.getByRole('heading', { name: 'Peer Perspective' })).toBeInTheDocument();
    const badge = screen.getByText(/responses/);
    expect(badge).toHaveTextContent('0 responses');
    expect(screen.queryByTestId('insight-content')).not.toBeInTheDocument();
  });
}); 