"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const visitorSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().min(1, "Phone number is required"),
  company: z.string().min(1, "Company is required"),
  purpose: z.enum([
    "MEETING",
    "INTERVIEW",
    "DELIVERY",
    "MAINTENANCE",
    "TOUR",
    "TRAINING",
    "CONSULTATION",
    "OTHER",
  ]),
  scheduledDate: z.string().min(1, "Date is required"),
  scheduledStart: z.string().min(1, "Start time is required"),
  scheduledEnd: z.string().min(1, "End time is required"),
  idDocumentType: z.string().optional(),
}).refine((data) => {
  if (data.scheduledDate && data.scheduledStart && data.scheduledEnd) {
    const start = new Date(`${data.scheduledDate}T${data.scheduledStart}`);
    const end = new Date(`${data.scheduledDate}T${data.scheduledEnd}`);
    return end > start;
  }
  return true;
}, {
  message: "End time must be after start time",
  path: ["scheduledEnd"],
});

type VisitorFormData = z.infer<typeof visitorSchema>;

export default function RegisterVisitorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VisitorFormData>({
    resolver: zodResolver(visitorSchema),
  });

  const onSubmit = async (data: VisitorFormData) => {
    setError("");
    setLoading(true);

    try {
      // Get current user session
      const sessionResponse = await fetch("/api/auth/session");
      const session = await sessionResponse.json();

      if (!session?.user?.id) {
        setError("You must be logged in to register a visitor");
        return;
      }

      // Format dates
      const scheduledDate = new Date(data.scheduledDate);
      const scheduledStart = new Date(`${data.scheduledDate}T${data.scheduledStart}`);
      const scheduledEnd = new Date(`${data.scheduledDate}T${data.scheduledEnd}`);

      const response = await fetch("/api/visitors/preregister", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          hostId: session.user.id,
          scheduledDate: scheduledDate.toISOString(),
          scheduledStart: scheduledStart.toISOString(),
          scheduledEnd: scheduledEnd.toISOString(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to register visitor");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>

            <Card>
              <CardHeader>
                <CardTitle>Register New Visitor</CardTitle>
                <CardDescription>
                  Pre-register a visitor for your meeting or event
                </CardDescription>
              </CardHeader>
              <CardContent>
                {success ? (
                  <div className="text-center py-8">
                    <div className="text-green-600 text-lg font-semibold mb-2">
                      Visitor registered successfully!
                    </div>
                    <p className="text-sm text-muted-foreground">
                      An approval request has been sent. Redirecting to dashboard...
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          {...register("firstName")}
                          placeholder="John"
                          disabled={loading}
                        />
                        {errors.firstName && (
                          <p className="text-sm text-destructive">
                            {errors.firstName.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          {...register("lastName")}
                          placeholder="Doe"
                          disabled={loading}
                        />
                        {errors.lastName && (
                          <p className="text-sm text-destructive">
                            {errors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        {...register("email")}
                        placeholder="john.doe@example.com"
                        disabled={loading}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive">
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        {...register("phone")}
                        placeholder="+1234567890"
                        disabled={loading}
                      />
                      {errors.phone && (
                        <p className="text-sm text-destructive">
                          {errors.phone.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company">Company *</Label>
                      <Input
                        id="company"
                        {...register("company")}
                        placeholder="Acme Corp"
                        disabled={loading}
                      />
                      {errors.company && (
                        <p className="text-sm text-destructive">
                          {errors.company.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="purpose">Purpose of Visit *</Label>
                      <select
                        id="purpose"
                        {...register("purpose")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={loading}
                      >
                        <option value="">Select purpose</option>
                        <option value="MEETING">Meeting</option>
                        <option value="INTERVIEW">Interview</option>
                        <option value="DELIVERY">Delivery</option>
                        <option value="MAINTENANCE">Maintenance</option>
                        <option value="TOUR">Tour</option>
                        <option value="TRAINING">Training</option>
                        <option value="CONSULTATION">Consultation</option>
                        <option value="OTHER">Other</option>
                      </select>
                      {errors.purpose && (
                        <p className="text-sm text-destructive">
                          {errors.purpose.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="scheduledDate">Visit Date *</Label>
                      <Input
                        id="scheduledDate"
                        type="date"
                        {...register("scheduledDate")}
                        disabled={loading}
                        min={new Date().toISOString().split("T")[0]}
                      />
                      {errors.scheduledDate && (
                        <p className="text-sm text-destructive">
                          {errors.scheduledDate.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="scheduledStart">Start Time *</Label>
                        <Input
                          id="scheduledStart"
                          type="time"
                          {...register("scheduledStart")}
                          disabled={loading}
                        />
                        {errors.scheduledStart && (
                          <p className="text-sm text-destructive">
                            {errors.scheduledStart.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="scheduledEnd">End Time *</Label>
                        <Input
                          id="scheduledEnd"
                          type="time"
                          {...register("scheduledEnd")}
                          disabled={loading}
                        />
                        {errors.scheduledEnd && (
                          <p className="text-sm text-destructive">
                            {errors.scheduledEnd.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {error && (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                        <p className="text-sm text-destructive font-medium">{error}</p>
                      </div>
                    )}

                    <div className="flex gap-4">
                      <Button type="submit" disabled={loading} className="flex-1">
                        {loading ? "Registering..." : "Register Visitor"}
                      </Button>
                      <Link href="/dashboard">
                        <Button type="button" variant="outline" disabled={loading}>
                          Cancel
                        </Button>
                      </Link>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
  );
}

