import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsClient } from "./ui";

export default function SettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>Keys are stored in the database (Postgres) via Prisma. They’re never committed to code.</CardDescription>
      </CardHeader>
      <CardContent>
        <SettingsClient />
      </CardContent>
    </Card>
  );
}

