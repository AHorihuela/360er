import { ErrorState as UnifiedErrorState } from "@/components/ui/loading-variants";

interface Props {
  error: string;
}

export function ErrorState({ error }: Props) {
  return (
    <UnifiedErrorState 
      message={error}
      title="Analysis Error"
    />
  );
} 