import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardClient } from "./ui";

export default function DashboardPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Queue</CardTitle>
        <CardDescription>Your queue: approve, edit, and cancel here. GetLate runs in the background when you schedule.</CardDescription>
      </CardHeader>
      <CardContent>
        <DashboardClient />
      </CardContent>
    </Card>
  );
}

