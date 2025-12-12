"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar } from "lucide-react";

interface Report {
  id: string;
  reportType: string;
  reportName: string;
  format: string;
  status: string;
  generatedAt: string;
  generatedBy: string;
}

export function ReportsManagement() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    try {
      const response = await fetch("/api/reports/list");
      if (response.ok) {
        const result = await response.json();
        setReports(result.reports || []);
      }
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setLoading(false);
    }
  }

  async function generateReport(type: string) {
    setGenerating(true);
    try {
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: type,
          format: "JSON",
        }),
      });

      if (response.ok) {
        await fetchReports();
      }
    } catch (err) {
      console.error("Failed to generate report:", err);
    } finally {
      setGenerating(false);
    }
  }

  async function downloadReport(reportId: string, format: string) {
    try {
      const response = await fetch(`/api/reports/generate?reportId=${reportId}&format=${format}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `report.${format.toLowerCase()}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error("Failed to download report:", err);
    }
  }

  const reportTypes = [
    "ACCESS_CONTROL_REVIEW",
    "USER_PERMISSION",
    "THREAT_INTELLIGENCE",
    "SECURITY_INCIDENT",
    "VISITOR_STATISTICS",
  ];

  if (loading) {
    return <Card><CardContent className="pt-6">Loading...</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      {/* Generate Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
          <CardDescription>Create a new compliance or security report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-3">
            {reportTypes.map((type) => (
              <Button
                key={type}
                onClick={() => generateReport(type)}
                disabled={generating}
                variant="outline"
                className="justify-start"
              >
                <FileText className="mr-2 h-4 w-4" />
                {type.replace(/_/g, " ")}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Report List */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
          <CardDescription>View and download previously generated reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-sm">{report.reportName}</span>
                    <span className="text-xs text-gray-500">({report.reportType})</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      report.status === "COMPLETED"
                        ? "bg-green-100 text-green-800"
                        : report.status === "GENERATING"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {report.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Generated: {new Date(report.generatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {report.status === "COMPLETED" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadReport(report.id, "JSON")}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        JSON
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadReport(report.id, "CSV")}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        CSV
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {reports.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No reports generated yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



