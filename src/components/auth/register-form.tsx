"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordStrength } from "@/components/auth/password-strength";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";

const HCaptcha = dynamic(
  () => import("@hcaptcha/react-hcaptcha").then((mod) => mod.default || mod),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[78px] w-full bg-gray-100 rounded flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading CAPTCHA...</p>
      </div>
    )
  }
) as any;

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
  department: z.string().min(1, "Department is required"),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms of service",
  }),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const captchaRef = useRef<any>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      termsAccepted: false,
    },
  });

  const password = watch("password");
  const termsAccepted = watch("termsAccepted");

  
  useEffect(() => {
    console.log("captchaToken state changed:", captchaToken ? "Token set" : "No token");
  }, [captchaToken]);

  const onSubmit = async (data: RegisterFormData) => {
    
    
    
    
    

    if (!termsAccepted) {
      setError("You must accept the terms of service");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          captchaToken: captchaToken,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Registration failed");
        setLoading(false);
        if (captchaRef.current) {
          captchaRef.current.resetCaptcha();
          setCaptchaToken(null);
        }
        return;
      }

      
      router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (err) {
      console.error("Registration error:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>
          Create your account to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="John Doe"
              aria-invalid={errors.name ? "true" : "false"}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="you@example.com"
              aria-invalid={errors.email ? "true" : "false"}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              {...register("password")}
              placeholder="Create a strong password (min 12 characters)"
              aria-invalid={errors.password ? "true" : "false"}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
            {password && <PasswordStrength password={password} />}
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              {...register("department")}
              placeholder="e.g., IT, HR, Security"
              aria-invalid={errors.department ? "true" : "false"}
            />
            {errors.department && (
              <p className="text-sm text-destructive">{errors.department.message}</p>
            )}
          </div>

          {/* CAPTCHA */}
          <div className="space-y-2">
            <Label>Security Verification</Label>
            <div id="hcaptcha-container">
              <HCaptcha
                sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || "98bea898-edd8-4276-b4fe-1a7eae2ac536"}
                onVerify={(token: string) => {
                  console.log("CAPTCHA verified, token received:", token ? `Yes (length: ${token.length})` : "No");
                  console.log("Token value:", token?.substring(0, 20) + "...");
                  if (token && token.length > 0) {
                    setCaptchaToken(token);
                    setError("");
                    console.log("CAPTCHA token set successfully");
                  } else {
                    console.error("Invalid CAPTCHA token received");
                    setError("CAPTCHA verification failed. Please try again.");
                    setCaptchaToken(null);
                  }
                }}
                onError={(error: any) => {
                  console.error("CAPTCHA error:", error);
                  setError("CAPTCHA verification failed. Please try again.");
                  setCaptchaToken(null);
                }}
                onExpire={() => {
                  console.log("CAPTCHA expired");
                  setCaptchaToken(null);
                  setError("CAPTCHA expired. Please complete it again.");
                }}
                ref={captchaRef}
              />
            </div>
            {captchaToken ? (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <span>✓</span> CAPTCHA verified
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Please complete the CAPTCHA to continue
              </p>
            )}
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => setValue("termsAccepted", checked === true)}
              className="mt-1"
            />
            <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
              I accept the{" "}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </label>
          </div>
          {errors.termsAccepted && (
            <p className="text-sm text-destructive">{errors.termsAccepted.message}</p>
          )}

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading || !termsAccepted}>
            {loading ? "Creating account..." : "Register"}
          </Button>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link
              href="/auth/login"
              className="text-primary hover:underline font-medium"
            >
              Login
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

