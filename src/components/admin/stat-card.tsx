import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-sans text-3xl uppercase tracking-tight text-foreground">
          {value}
        </p>
        {hint ? (
          <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-dim">
            {hint}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
