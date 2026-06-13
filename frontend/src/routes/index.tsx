import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  CheckCircle2,
  CloudUpload,
  Database,
  Download,
  FileText,
  FlameKindling,
  Gauge,
  History,
  LayoutDashboard,
  Loader2,
  Moon,
  Radar,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Sun,
  Thermometer,
  Upload,
  Workflow,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend as ReLegend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mapBackendResponseToUI } from "@/lib/api-adapter";
import { JsonInspector } from "@/components/JsonInspector";
import { IndustrialLoader } from "@/components/IndustrialLoader";

// We only keep historicalLogs for the logs view. 
// We import the mock data as fallbacks for the "Run sample" button.
import {
  historicalLogs,
  metadata as mockMetadata,
  patterns as mockPatterns,
  processDetails as mockProcessDetails,
  rows as mockRows,
  verification as mockVerification,
} from "@/lib/forge-data";

// Define the expected structure from your API Adapter
export interface ParsedData {
  metadata: typeof mockMetadata;
  processDetails: typeof mockProcessDetails;
  patterns: typeof mockPatterns;
  rows: typeof mockRows;
  verification: typeof mockVerification;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Forge Intelligence — Heat Treatment Parsing Engine" },
      {
        name: "description",
        content:
          "Operational dashboard for the Heat Treatment Intelligent Document Parsing Engine — ingest, digitize, analyze, and audit cycle reports.",
      },
    ],
  }),
  component: ForgeDashboard,
});

type ViewId = "ingest" | "viewer" | "analytics" | "logs";

const NAV: { id: ViewId; label: string; icon: typeof LayoutDashboard; hint: string }[] = [
  { id: "ingest", label: "Ingest & Upload", icon: CloudUpload, hint: "Stage cycle reports" },
  { id: "viewer", label: "Digitized Viewer", icon: FileText, hint: "Parsed document blocks" },
  { id: "analytics", label: "Analytics", icon: Activity, hint: "Tonnage & cluster signals" },
  { id: "logs", label: "Historical Logs", icon: History, hint: "Saved cycle archive" },
];

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("forge-theme")) as
      | "light"
      | "dark"
      | null;
    const initial = stored ?? "dark";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);
  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      try {
        localStorage.setItem("forge-theme", next);
      } catch {
        /* noop */
      }
      return next;
    });
  }, []);
  return { theme, toggle };
}

function ForgeDashboard() {
  const [uploadState, setUploadState] = useState<"idle" | "scanning" | "done" | "error">("idle");
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [view, setView] = useState<ViewId>("ingest");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [apiFinished, setApiFinished] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const { theme, toggle } = useTheme();

  // Updated to handle actual File objects and API calls
  const startScan = useCallback(async (fileInput: File | "sample") => {
    setUploadState("scanning");
    setProgress(15);
    setErrorMessage(null);
    setApiFinished(false);
    setApiError(null);

    if (fileInput === "sample") {
      setFileName("sample-cycle-04173.pdf");
      // Simulate network delay for the sample to finish midway through the animation
      setTimeout(() => {
        setParsedData({
          metadata: mockMetadata,
          processDetails: mockProcessDetails,
          patterns: mockPatterns,
          rows: mockRows,
          verification: mockVerification,
        });
        setApiFinished(true);
      }, 3500);
      return;
    }

    // Actual FastAPI Backend Integration
    const file = fileInput as File;
    setFileName(file.name);
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      // Using environment variable to point to FastAPI
      const apiUrl = import.meta.env.VITE_API_BASE_URL || "https://kripasreeeee-heat.hf.space/api/v1";
      
      const response = await fetch(`${apiUrl}/documents/process`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Backend parsing failed");
      }

      setProgress(75);
      
      const data = await response.json();
      
      // Map the backend JSON response to UI schema
      const adaptedData = mapBackendResponseToUI(data); 
      
      setParsedData(adaptedData);
      setApiFinished(true);

    } catch (error) {
      console.error("API Upload Error:", error);
      const errStr = error instanceof Error ? error.message : String(error);
      setApiError(errStr);
      setApiFinished(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {uploadState === "scanning" && (
        <IndustrialLoader
          fileName={fileName}
          apiFinished={apiFinished}
          errorOccurred={apiError}
          theme={theme}
          onComplete={() => {
            if (apiError) {
              setUploadState("error");
              setErrorMessage(apiError);
            } else {
              setUploadState("done");
              setView("viewer");
            }
          }}
        />
      )}
      <div className="flex min-h-screen">
        <Sidebar view={view} setView={setView} uploadState={uploadState} />
        <main className="flex-1 min-w-0">
          <TopBar view={view} theme={theme} toggleTheme={toggle} />
          <div className="px-8 py-8 max-w-[1400px] mx-auto">
            {view === "ingest" && (
              <IngestView
                uploadState={uploadState}
                progress={progress}
                fileName={fileName}
                drag={drag}
                setDrag={setDrag}
                startScan={startScan}
                reset={() => {
                  setUploadState("idle");
                  setProgress(0);
                  setFileName(null);
                  setParsedData(null);
                  setErrorMessage(null);
                }}
                goView={() => setView("viewer")}
                errorMessage={errorMessage}
              />
            )}
            {view === "viewer" && (
              parsedData ? <ViewerView data={parsedData} /> : <EmptyState message="No document parsed yet. Stage a cycle report to view digitized data." />
            )}
            {view === "analytics" && (
              parsedData ? <AnalyticsView data={parsedData} /> : <EmptyState message="No data available for analytics. Stage a cycle report first." />
            )}
            {view === "logs" && <LogsView />}
          </div>
        </main>
      </div>
    </div>
  );
}

// Fallback UI when clicking on a view before parsing a document
function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-border rounded-xl bg-card/30">
      <div className="text-center text-muted-foreground">
        <Database className="w-8 h-8 mx-auto mb-3 opacity-20" />
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}

function Sidebar({
  view,
  setView,
  uploadState,
}: {
  view: ViewId;
  setView: (v: ViewId) => void;
  uploadState: "idle" | "scanning" | "done" | "error";
}) {
  return (
    <aside className="w-64 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="px-5 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="relative grid place-items-center w-10 h-10 rounded-lg bg-molten forge-glow">
            <FlameKindling className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">FORGE.IQ</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Parsing Engine v3.2
            </div>
          </div>
        </div>
      </div>

      <nav className="px-3 py-4 flex-1 space-y-1">
        {NAV.map((item) => {
          const active = view === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                "w-full text-left group flex items-start gap-3 px-3 py-2.5 rounded-md transition-all",
                active
                  ? "bg-sidebar-accent border-l-2 border-primary text-foreground"
                  : "border-l-2 border-transparent text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60",
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 mt-0.5",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              <div className="min-w-0">
                <div className="text-sm font-medium leading-tight">{item.label}</div>
                <div className="text-[11px] text-muted-foreground/80 mt-0.5">{item.hint}</div>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2">
          Engine Status
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              uploadState === "scanning" ? "bg-accent animate-ember" : uploadState === "error" ? "bg-destructive" : "bg-primary animate-ember",
            )}
          />
          <span className="text-xs font-mono">
            {uploadState === "scanning" ? "PARSING" : uploadState === "error" ? "OFFLINE" : "READY"}
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground font-mono">98.4%</span>
        </div>
      </div>
    </aside>
  );
}

function TopBar({
  view,
  theme,
  toggleTheme,
}: {
  view: ViewId;
  theme: "light" | "dark";
  toggleTheme: () => void;
}) {
  const current = NAV.find((n) => n.id === view)!;
  return (
    <div className="h-16 border-b border-border bg-card/40 backdrop-blur flex items-center px-8 gap-6">
      <div className="flex items-center gap-2">
        <current.icon className="w-4 h-4 text-primary" />
        <div className="text-sm font-medium">{current.label}</div>
        <div className="text-xs text-muted-foreground ml-2 hidden md:block">/ {current.hint}</div>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <Thermometer className="w-3.5 h-3.5 text-accent" /> 1042°C
          <span className="mx-2 w-px h-3 bg-border" />
          <Gauge className="w-3.5 h-3.5 text-primary" /> 4.2 t/h
        </div>
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-border bg-secondary/60 hover:bg-secondary transition-colors"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-accent" />
          ) : (
            <Moon className="w-4 h-4 text-primary" />
          )}
        </button>
      </div>
    </div>
  );
}

/* ---------------- INGEST ---------------- */
function IngestView({
  uploadState,
  progress,
  fileName,
  drag,
  setDrag,
  startScan,
  reset,
  goView,
  errorMessage,
}: {
  uploadState: "idle" | "scanning" | "done" | "error";
  progress: number;
  fileName: string | null;
  drag: boolean;
  setDrag: (b: boolean) => void;
  startScan: (f: File | "sample") => void;
  reset: () => void;
  goView: () => void;
  errorMessage: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-6">
      <HeaderBlock
        title="Stage a Heat Treatment Cycle Report"
        description="Drop a scanned PDF or photograph of the cycle log. The parsing engine extracts metadata, process telemetry, pattern specs, and verification signatures."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const f = e.dataTransfer.files?.[0];
              if (f) startScan(f);
            }}
            className={cn(
              "relative overflow-hidden rounded-xl border-2 border-dashed p-12 text-center transition-all",
              drag
                ? "border-primary bg-primary/5 forge-glow"
                : uploadState === "error" 
                  ? "border-destructive/50 bg-destructive/5" 
                  : "border-border bg-card hover:border-primary/60",
            )}
          >
            {uploadState === "scanning" && (
              <div className="absolute inset-x-0 top-0 h-full pointer-events-none overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent animate-scan opacity-80" />
              </div>
            )}

            <div className="relative flex flex-col items-center gap-4">
              <div className="grid place-items-center w-16 h-16 rounded-full bg-secondary border border-border">
                {uploadState === "scanning" ? (
                  <Loader2 className="w-7 h-7 text-primary animate-spin" />
                ) : uploadState === "done" ? (
                  <CheckCircle2 className="w-7 h-7 text-accent" />
                ) : uploadState === "error" ? (
                  <Activity className="w-7 h-7 text-destructive" />
                ) : (
                  <Upload className="w-7 h-7 text-primary" />
                )}
              </div>
              <div>
                <div className="text-base font-medium">
                  {uploadState === "scanning"
                    ? "Sending to IDP Engine…"
                    : uploadState === "done"
                      ? "Document digitized"
                      : uploadState === "error"
                        ? "Parsing failed"
                        : "Drag & drop cycle report"}
                </div>
                <div className="text-sm text-destructive mt-1 max-w-md break-words">
                  {uploadState === "error" && errorMessage
                    ? errorMessage
                    : fileName ?? "PDF · TIFF · JPG up to 40 MB"}
                </div>
              </div>

              {uploadState === "scanning" && (
                <div className="w-full max-w-md mt-3 space-y-2">
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-molten transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
                    <span>Engine: Production IDP</span>
                    <span>{Math.floor(progress)}%</span>
                  </div>
                </div>
              )}

              {(uploadState === "idle" || uploadState === "error") && (
                <div className="flex gap-2 mt-2">
                  <Button
                    onClick={() => inputRef.current?.click()}
                    className="bg-molten text-primary-foreground hover:opacity-90 forge-glow"
                  >
                    <Upload className="w-4 h-4 mr-2" /> Browse files
                  </Button>
                  <Button variant="outline" onClick={() => startScan("sample")}>
                    <ScanLine className="w-4 h-4 mr-2" /> Run sample
                  </Button>
                </div>
              )}

              {uploadState === "done" && (
                <div className="flex gap-2 mt-2">
                  <Button onClick={goView} className="bg-molten text-primary-foreground forge-glow">
                    Open digitized view
                  </Button>
                  <Button variant="outline" onClick={reset}>
                    Stage another
                  </Button>
                </div>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) startScan(f);
              }}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <div className="text-sm font-medium">Engine Profile</div>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Cloud-hosted neural extraction tuned for foundry and heat treatment documentation.
            </p>
            <dl className="space-y-2.5 text-xs">
              {[
                ["Model", "IDP Engine"],
                ["Avg latency", "~4.5 s / page"],
                ["F1 (validation)", "98.4%"],
                ["Compliance", "ISO 9001 · AMS 2750"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0 last:pb-0">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-mono text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-4 h-4 text-accent" />
              <div className="text-sm font-medium">Schema Targets</div>
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              {["Metadata", "Process Timeline", "Pattern Specs", "Main Table", "Verification"].map(
                (s) => (
                  <li key={s} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                    <span className="text-foreground/90">{s}</span>
                    <span className="ml-auto font-mono">block {s[0]}</span>
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- VIEWER ---------------- */
function ViewerView({ data }: { data: ParsedData }) {
  const [showRawJson, setShowRawJson] = useState(false);

  if (showRawJson) {
    return (
      <div className="space-y-6">
        <HeaderBlock
          title={data.metadata.title}
          description="Raw JSON extraction payload from the document processing backend."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRawJson(false)}
                className="border-accent/40 text-accent hover:bg-accent/10"
              >
                Show Formatted Report
              </Button>
              <Badge variant="outline" className="border-accent/40 text-accent">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Parsed
              </Badge>
            </div>
          }
        />
        <JsonInspector data={data} title="Digitized Schema Outputs" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HeaderBlock
        title={data.metadata.title}
        description="Structured extraction of the cycle report, aligned to backend schema blocks A through E."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRawJson(true)}
              className="border-accent/40 text-accent hover:bg-accent/10"
            >
              Show Raw JSON
            </Button>
            <Badge variant="outline" className="border-accent/40 text-accent">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Parsed
            </Badge>
          </div>
        }
      />

      <Section title="Block A · Metadata" icon={FileText}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            ["Document Title", data.metadata.title],
            ["Cycle No", data.metadata.cycleNo],
            ["Cycle Date", data.metadata.cycleDate],
            ["Furnace", data.metadata.furnace],
            ["Max Thickness", data.metadata.maxThickness],
          ].map(([k, v]) => (
            <div key={k} className="rounded-md bg-secondary/60 border border-border p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
              <div className="text-sm font-medium mt-1">{v}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Block B · Process Timeline" icon={Activity}>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {data.processDetails.map((p) => (
            <div
              key={p.label}
              className="relative rounded-md border border-border bg-secondary/50 p-3 overflow-hidden"
            >
              <div
                className={cn(
                  "absolute top-0 left-0 right-0 h-0.5",
                  p.tone === "molten" ? "bg-primary" : p.tone === "amber" ? "bg-accent" : "bg-chart-4",
                )}
              />
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {p.label}
              </div>
              <div className="text-sm font-mono font-medium mt-1">{p.value}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Block C · Pattern Specifications" icon={Workflow}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {data.patterns.map((p, i) => (
            <div key={`${p.code}-${i}`} className="rounded-md border border-border bg-card p-4">
              <div className="text-[10px] uppercase tracking-wider text-primary font-mono">
                {p.code}
              </div>
              <div className="text-sm font-medium mt-1">{p.item}</div>
              <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-accent" /> {p.remarks}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Block D · Main Table" icon={Database}>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/70 text-muted-foreground">
              <tr className="text-left">
                {["Pour Date", "Heat No", "Grade", "Sale Order", "Drawing No", "Part No", "Description", "Qty", "Weight (kg)"].map(
                  (h) => (
                    <th key={h} className="px-3 py-2.5 text-[11px] uppercase tracking-wider font-medium">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr
                  key={`${r.heatNo}-${i}`}
                  className={cn(
                    "border-t border-border hover:bg-secondary/40 transition-colors",
                    i % 2 === 1 && "bg-secondary/20",
                  )}
                >
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{r.pourDate}</td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-primary">{r.heatNo}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant="outline" className="border-accent/40 text-accent font-mono text-[10px]">
                      {r.grade}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">{r.saleOrder}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{r.drawingNo}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{r.partNo}</td>
                  <td className="px-3 py-2.5">{r.description}</td>
                  <td className="px-3 py-2.5 font-mono">{r.qty}</td>
                  <td className="px-3 py-2.5 font-mono">{r.weight.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Block E · Verification" icon={ShieldCheck}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <VerificationCard label="Lab-in-Charge" name={data.verification.labInCharge.name} ok={data.verification.labInCharge.ok} />
          <VerificationCard label="QA-in-Charge" name={data.verification.qaInCharge.name} ok={data.verification.qaInCharge.ok} />
          <div className="rounded-md border border-border bg-card p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Authorized Digital Signature
            </div>
            <div className="mt-2 font-mono text-xs text-accent break-all">
              {data.verification.digitalSignature}
            </div>
            <div className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-accent" /> SHA-256 · Verified on-chain
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

function VerificationCard({ label, name, ok }: { label: string; name: string; ok: boolean }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-center justify-between">
        <div className="text-sm font-medium">{name}</div>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px]",
            ok ? "border-accent/40 text-accent" : "border-destructive/40 text-destructive",
          )}
        >
          <CheckCircle2 className="w-3 h-3 mr-1" /> {ok ? "Signed" : "Pending"}
        </Badge>
      </div>
    </div>
  );
}

/* ---------------- ANALYTICS ---------------- */
function AnalyticsView({ data }: { data: ParsedData }) {
  const scatterData = useMemo(
    () =>
      data.rows.map((r) => ({
        qty: r.qty,
        weight: r.weight,
        grade: r.grade,
        z: r.weight / 100,
      })),
    [data.rows],
  );

  const tonnageByGrade = useMemo(() => {
    const m = new Map<string, number>();
    data.rows.forEach((r) => m.set(r.grade, (m.get(r.grade) ?? 0) + (r.weight * r.qty) / 1000));
    return Array.from(m.entries()).map(([grade, tonnage]) => ({
      grade,
      tonnage: Number(tonnage.toFixed(2)),
    }));
  }, [data.rows]);

  // Furnace temperature curve through cycle (representative thermal profile)
  const thermalCurve = useMemo(
    () => [
      { t: "00:00", temp: 25, target: 25 },
      { t: "01:00", temp: 220, target: 250 },
      { t: "02:00", temp: 540, target: 550 },
      { t: "03:00", temp: 840, target: 850 },
      { t: "04:00", temp: 1042, target: 1050 },
      { t: "05:00", temp: 1048, target: 1050 },
      { t: "06:00", temp: 1045, target: 1050 },
      { t: "07:00", temp: 880, target: 900 },
      { t: "08:00", temp: 610, target: 600 },
      { t: "09:00", temp: 320, target: 320 },
      { t: "10:00", temp: 140, target: 150 },
    ],
    [],
  );

  // 12-week throughput trend
  const throughputTrend = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        wk: `W${i + 1}`,
        tonnage: Number((42 + Math.sin(i / 1.6) * 8 + i * 1.2 + Math.random() * 3).toFixed(1)),
        cycles: Math.round(18 + Math.cos(i / 2) * 4 + i * 0.4),
      })),
    [],
  );

  // Grade share for pie
  const gradeShare = tonnageByGrade.map((g) => ({ name: g.grade, value: g.tonnage }));

  const gradeColors: Record<string, string> = {
    CA6NM: "var(--color-primary)",
    "FP-17": "var(--color-accent)",
    CA15: "var(--color-chart-4)",
  };
  const pieColors = ["var(--color-primary)", "var(--color-accent)", "var(--color-chart-4)", "var(--color-chart-5)"];

  const tooltipStyle = {
    background: "var(--color-card)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--color-foreground)",
  } as const;

  return (
    <div className="space-y-6">
      <HeaderBlock
        title="Operational Analytics"
        description="Cluster behavior of casting pours, thermal cycle profiles, and tonnage distribution across alloy grades."
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: "Total Heats", v: data.rows.length },
          {
            l: "Total Tonnage",
            v: `${tonnageByGrade.reduce((a, b) => a + b.tonnage, 0).toFixed(2)} t`,
          },
          {
            l: "Avg Weight",
            v: `${Math.round(data.rows.reduce((a, b) => a + b.weight, 0) / (data.rows.length || 1))} kg`,
          },
          { l: "Grades Active", v: tonnageByGrade.length },
        ].map((k) => (
          <div key={k.l} className="rounded-lg border border-border bg-card p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.l}</div>
            <div className="text-xl font-semibold mt-1 text-molten">{k.v}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Weight × Quantity Cluster" icon={Radar}>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="qty" name="Qty" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} stroke="var(--color-border)" />
                <YAxis dataKey="weight" name="Weight (kg)" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} stroke="var(--color-border)" />
                <ZAxis dataKey="z" range={[60, 260]} />
                <ReTooltip cursor={{ stroke: "var(--color-primary)", strokeDasharray: "3 3" }} contentStyle={tooltipStyle} />
                <Scatter data={scatterData}>
                  {scatterData.map((d, i) => (
                    <Cell key={i} fill={gradeColors[d.grade] ?? "var(--color-primary)"} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <Legend gradeColors={gradeColors} />
        </Section>

        <Section title="Tonnage by Material Grade" icon={Thermometer}>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tonnageByGrade} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <defs>
                  <linearGradient id="moltenBar" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="grade" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} stroke="var(--color-border)" />
                <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} stroke="var(--color-border)" />
                <ReTooltip cursor={{ fill: "var(--color-secondary)" }} contentStyle={tooltipStyle} />
                <Bar dataKey="tonnage" fill="url(#moltenBar)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Furnace Thermal Profile" icon={Thermometer}>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={thermalCurve} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <defs>
                  <linearGradient id="thermalFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="t" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} stroke="var(--color-border)" />
                <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} stroke="var(--color-border)" unit="°C" />
                <ReTooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="temp" stroke="var(--color-primary)" strokeWidth={2} fill="url(#thermalFill)" />
                <Area type="monotone" dataKey="target" stroke="var(--color-accent)" strokeWidth={1.5} strokeDasharray="4 4" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="12-Week Throughput Trend" icon={Activity}>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={throughputTrend} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="wk" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} stroke="var(--color-border)" />
                <YAxis yAxisId="l" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} stroke="var(--color-border)" />
                <YAxis yAxisId="r" orientation="right" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} stroke="var(--color-border)" />
                <ReTooltip contentStyle={tooltipStyle} />
                <ReLegend wrapperStyle={{ fontSize: 11, color: "var(--color-muted-foreground)" }} />
                <Line yAxisId="l" type="monotone" dataKey="tonnage" name="Tonnage (t)" stroke="var(--color-primary)" strokeWidth={2.2} dot={{ r: 3 }} />
                <Line yAxisId="r" type="monotone" dataKey="cycles" name="Cycles" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Grade Distribution Share" icon={Workflow}>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <ReTooltip contentStyle={tooltipStyle} />
                <Pie
                  data={gradeShare}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                  stroke="var(--color-card)"
                >
                  {gradeShare.map((_, i) => (
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
                <ReLegend wrapperStyle={{ fontSize: 11, color: "var(--color-muted-foreground)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Legend({ gradeColors }: { gradeColors: Record<string, string> }) {
  return (
    <div className="flex gap-4 mt-3 px-1">
      {Object.entries(gradeColors).map(([g, c]) => (
        <div key={g} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
          {g}
        </div>
      ))}
    </div>
  );
}

/* ---------------- LOGS ---------------- */
function LogsView() {
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const exportCsv = () => {
    setExporting(true);
    setExported(false);
    setTimeout(() => {
      const header = "id,date,furnace,grade,heats,tonnage,status\n";
      const csv =
        header +
        historicalLogs
          .map((l) => `${l.id},${l.date},${l.furnace},${l.grade},${l.heats},${l.tonnage},${l.status}`)
          .join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "forge-historical-cycles.csv";
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
      setExported(true);
      setTimeout(() => setExported(false), 2200);
    }, 1100);
  };

  return (
    <div className="space-y-6">
      <HeaderBlock
        title="Historical Cycle Archive"
        description="Master log of every saved cycle record. Export the full set as an Excel-ready sheet."
        actions={
          <Button
            onClick={exportCsv}
            disabled={exporting}
            className="bg-molten text-primary-foreground forge-glow"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Packaging…
              </>
            ) : exported ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Exported
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" /> Export to Excel
              </>
            )}
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/70 text-muted-foreground">
            <tr className="text-left">
              {["Cycle ID", "Date", "Furnace", "Grade", "Heats", "Tonnage (t)", "Status"].map(
                (h) => (
                  <th key={h} className="px-4 py-3 text-[11px] uppercase tracking-wider font-medium">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {historicalLogs.map((l, i) => (
              <tr
                key={l.id}
                className={cn(
                  "border-t border-border hover:bg-secondary/40 transition-colors",
                  i % 2 === 1 && "bg-secondary/15",
                )}
              >
                <td className="px-4 py-3 font-mono font-semibold text-primary">{l.id}</td>
                <td className="px-4 py-3 font-mono text-xs">{l.date}</td>
                <td className="px-4 py-3">{l.furnace}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="border-accent/40 text-accent font-mono text-[10px]">
                    {l.grade}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-mono">{l.heats}</td>
                <td className="px-4 py-3 font-mono">{l.tonnage}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-medium",
                      l.status === "Verified" ? "text-accent" : "text-primary",
                    )}
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        l.status === "Verified" ? "bg-accent" : "bg-primary animate-ember",
                      )}
                    />
                    {l.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- SHARED ---------------- */
function HeaderBlock({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end gap-4 md:justify-between border-b border-border pb-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{description}</p>
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof LayoutDashboard;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card/60 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}
