import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { ConstructionIcon } from "lucide-react";

interface PagePlaceholderProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export const PagePlaceholder = ({
  title,
  description,
  icon,
}: PagePlaceholderProps) => {
  return (
    <Layout>
      <div className="min-h-screen p-6 md:p-8 bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Card className="max-w-md border-border/50 shadow-lg">
          <CardContent className="pt-8 space-y-6">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
                {icon || <ConstructionIcon className="h-8 w-8 text-primary" />}
              </div>
            </div>

            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              <p className="text-muted-foreground">{description}</p>
            </div>

            <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
              <p className="text-sm text-muted-foreground text-center">
                ✨ This page is ready to be implemented. Continue prompting to
                add features and functionality to this page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};
