import type { AccessReviewItem } from "@/types/users.types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface AccessReviewViewProps {
  accessReview: AccessReviewItem[];
}

export function AccessReviewView({ accessReview }: AccessReviewViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Access Review</CardTitle>
        <CardDescription>Module coverage and assigned staff.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {accessReview.map((item) => (
          <div key={item.module} className="rounded-md border p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{item.label}</p>
              <Badge variant={item.count > 0 ? "secondary" : "outline"}>{item.count} assigned</Badge>
            </div>
            <Separator className="my-2" />
            {item.users.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {item.users.map((member) => (
                  <Badge key={`${item.module}-${member.id}`} variant="outline">
                    {member.fullName}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No staff assignments for this module.</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
