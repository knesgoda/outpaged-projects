import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Grid3x3 } from "lucide-react";

export function SkillMatrix() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Grid3x3 className="h-5 w-5" />
          Skill Matrix
        </CardTitle>
        <CardDescription>
          View team skills, proficiency levels, and identify gaps
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-96 items-center justify-center rounded-lg border border-dashed">
          <div className="text-center space-y-2">
            <Grid3x3 className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Skill matrix coming soon</p>
            <p className="text-sm text-muted-foreground">
              Track skills, certifications, and match to demand
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
