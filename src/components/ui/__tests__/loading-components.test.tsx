import { render, screen } from "@testing-library/react";
import { LoadingSpinner } from "../loading-spinner";
import { StatusIcon } from "../status-icon";
import { ProgressSteps, calculateStepsProgress, ProgressStep } from "../progress-steps";
import { LoadingContainer, InlineLoading } from "../loading-variants";

import { vi } from 'vitest';

// Mock Lucide React icons
vi.mock("lucide-react", () => ({
  Loader2: ({ className, "data-testid": testId }: any) => (
    <div className={className} data-testid={testId}>
      Loader2
    </div>
  ),
  CheckCircle2: ({ className, "data-testid": testId }: any) => (
    <div className={className} data-testid={testId}>
      CheckCircle2
    </div>
  ),
  AlertCircle: ({ className, "data-testid": testId }: any) => (
    <div className={className} data-testid={testId}>
      AlertCircle
    </div>
  ),
  X: ({ className, "data-testid": testId }: any) => (
    <div className={className} data-testid={testId}>
      X
    </div>
  ),
}));

describe("LoadingSpinner", () => {
  it("renders with default props", () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByTestId("loading-spinner");
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveTextContent("Loader2");
  });

  it("renders with custom size and color", () => {
    render(<LoadingSpinner size="lg" color="error" data-testid="custom-spinner" />);
    const spinner = screen.getByTestId("custom-spinner");
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass("h-8", "w-8", "text-red-500");
  });
});

describe("StatusIcon", () => {
  it("renders completed status", () => {
    render(<StatusIcon status="completed" />);
    const icon = screen.getByTestId("status-completed");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveTextContent("CheckCircle2");
  });

  it("renders in_progress status with spinner", () => {
    render(<StatusIcon status="in_progress" />);
    const icon = screen.getByTestId("status-in-progress");
    expect(icon).toBeInTheDocument();
  });

  it("renders pending status as empty circle", () => {
    render(<StatusIcon status="pending" />);
    const icon = screen.getByTestId("status-pending");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("rounded-full", "border");
  });

  it("renders error status", () => {
    render(<StatusIcon status="error" />);
    const icon = screen.getByTestId("status-error");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveTextContent("AlertCircle");
  });
});

describe("ProgressSteps", () => {
  const mockSteps: ProgressStep[] = [
    {
      id: "step1",
      label: "First Step",
      status: "completed",
      description: "This is the first step"
    },
    {
      id: "step2", 
      label: "Second Step",
      status: "in_progress",
      description: "This is the second step"
    },
    {
      id: "step3",
      label: "Third Step", 
      status: "pending"
    }
  ];

  it("renders steps in vertical layout", () => {
    render(<ProgressSteps steps={mockSteps} />);
    
    expect(screen.getByTestId("step-step1-label")).toHaveTextContent("First Step");
    expect(screen.getByTestId("step-step2-label")).toHaveTextContent("Second Step");
    expect(screen.getByTestId("step-step3-label")).toHaveTextContent("Third Step");
  });

  it("renders descriptions when enabled", () => {
    render(<ProgressSteps steps={mockSteps} showDescriptions={true} />);
    
    expect(screen.getByTestId("step-step1-description")).toHaveTextContent("This is the first step");
    expect(screen.getByTestId("step-step2-description")).toHaveTextContent("This is the second step");
  });

  it("does not render descriptions when disabled", () => {
    render(<ProgressSteps steps={mockSteps} showDescriptions={false} />);
    
    expect(screen.queryByTestId("step-step1-description")).not.toBeInTheDocument();
    expect(screen.queryByTestId("step-step2-description")).not.toBeInTheDocument();
  });
});

describe("calculateStepsProgress", () => {
  it("calculates progress correctly", () => {
    const steps: ProgressStep[] = [
      { id: "1", label: "Step 1", status: "completed" },
      { id: "2", label: "Step 2", status: "completed" },
      { id: "3", label: "Step 3", status: "in_progress" },
      { id: "4", label: "Step 4", status: "pending" }
    ];

    const progress = calculateStepsProgress(steps);
    expect(progress).toBe(50); // 2 out of 4 completed = 50%
  });

  it("handles empty steps array", () => {
    const progress = calculateStepsProgress([]);
    expect(progress).toBe(0);
  });

  it("calculates progress with substeps", () => {
    const steps: ProgressStep[] = [
      { 
        id: "1", 
        label: "Step 1", 
        status: "completed",
        substeps: [
          { id: "1a", label: "Substep 1a", status: "completed" },
          { id: "1b", label: "Substep 1b", status: "completed" }
        ]
      },
      { id: "2", label: "Step 2", status: "in_progress" }
    ];

    const progress = calculateStepsProgress(steps);
    expect(progress).toBe(75); // 3 out of 4 completed = 75%
  });
});

describe("LoadingContainer", () => {
  it("renders with title and description", () => {
    render(
      <LoadingContainer 
        title="Loading Data" 
        description="Please wait while we fetch your data..."
      />
    );
    
    expect(screen.getByText("Loading Data")).toBeInTheDocument();
    expect(screen.getByText("Please wait while we fetch your data...")).toBeInTheDocument();
  });

  it("renders with steps and progress", () => {
    const steps: ProgressStep[] = [
      { id: "1", label: "Step 1", status: "completed" },
      { id: "2", label: "Step 2", status: "in_progress" }
    ];

    render(
      <LoadingContainer 
        title="Processing" 
        steps={steps}
        showProgress={true}
      />
    );

    expect(screen.getByText("Step 1")).toBeInTheDocument();
    expect(screen.getByText("Step 2")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });
});

describe("InlineLoading", () => {
  it("renders with default text", () => {
    render(<InlineLoading />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders with custom text", () => {
    render(<InlineLoading text="Saving..." />);
    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });
}); 