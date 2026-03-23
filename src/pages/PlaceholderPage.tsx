import { AppLayout } from "@/components/AppLayout";

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <AppLayout title={title}>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-lg font-semibold text-muted-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">{description}</p>
        </div>
      </div>
    </AppLayout>
  );
}