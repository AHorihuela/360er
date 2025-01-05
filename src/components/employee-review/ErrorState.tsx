import { Card, CardContent } from "@/components/ui/card";

interface Props {
  error: string;
}

export function ErrorState({ error }: Props) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-sm text-destructive text-center">{error}</div>
      </CardContent>
    </Card>
  );
} 