import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const errorMessages: Record<string, string> = {
    Configuration: "There is a problem with the server configuration.",
    AccessDenied: "You do not have permission to sign in.",
    Verification: "The verification token has expired or has already been used.",
    Default: "An error occurred during authentication.",
  };

  const error = searchParams.error || "Default";
  const message = errorMessages[error] || errorMessages.Default;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Authentication Error</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full">
          <Link href="/auth/login">Return to Login</Link>
        </Button>
      </CardContent>
    </Card>
  );
}





