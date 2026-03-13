import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GenerateForm } from "./ui";

export default function GeneratePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate a draft</CardTitle>
        <CardDescription>Kimi writes content only. Scheduling happens after approval.</CardDescription>
      </CardHeader>
      <CardContent>
        <GenerateForm />
      </CardContent>
    </Card>
  );
}

