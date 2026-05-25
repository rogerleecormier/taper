import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  Upload,
  Trash2,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";
import { formatCurrency } from "~/lib/currency";
import { useIncomeSourceDetail, useUploadAndAnalyzePaystub, useDeletePaystub } from "~/hooks/use-paystubs";
import { DEDUCTION_CATEGORY_LABELS, type DeductionCategory } from "~/db/schema/paystub-deductions";

export const Route = createFileRoute("/_app/income/$id")({
  component: PayrollDetailPage,
  head: () => ({
    meta: [
      {
        title: "Income Source Details - Taper",
      },
      {
        name: "description",
        content: "View and manage income source details",
      },
    ],
  }),
});

const INTERVAL_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  standalone: "One-time",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type AnalysisPhase = "idle" | "preparing" | "analyzing" | "reviewing" | "error";

type AnalysisResult = {
  paystubId: string;
  grossPayCents: number;
  netPayCents: number;
  regularPayCents: number;
  overtimePayCents: number;
  otherPayCents: number;
  payPeriodStart: string | null;
  payPeriodEnd: string | null;
  payDate: string | null;
  deductions: Array<{
    label: string;
    category: string;
    amountCents: number;
    isPretax: boolean;
  }>;
};

// ─── File helpers ─────────────────────────────────────────────────────────────

const MAX_UPLOAD_DIMENSION = 1024;
const UPLOAD_JPEG_QUALITY = 0.75;

function canvasToUploadResult(
  canvas: HTMLCanvasElement,
  baseName: string,
): { base64: string; mimeType: string; fileName: string } {
  const dataUrl = canvas.toDataURL("image/jpeg", UPLOAD_JPEG_QUALITY);
  return {
    base64: dataUrl.split(",")[1],
    mimeType: "image/jpeg",
    fileName: baseName.replace(/\.[^.]+$/, ".jpg"),
  };
}

async function resizeImageForUpload(
  file: File,
): Promise<{ base64: string; mimeType: string; fileName: string }> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    const url = URL.createObjectURL(file);
    el.onload = () => { URL.revokeObjectURL(url); resolve(el); };
    el.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
    el.src = url;
  });

  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (w > MAX_UPLOAD_DIMENSION || h > MAX_UPLOAD_DIMENSION) {
    if (w >= h) { h = Math.round((h * MAX_UPLOAD_DIMENSION) / w); w = MAX_UPLOAD_DIMENSION; }
    else        { w = Math.round((w * MAX_UPLOAD_DIMENSION) / h); h = MAX_UPLOAD_DIMENSION; }
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
  return canvasToUploadResult(canvas, file.name);
}

async function extractPdfText(file: File): Promise<{ text: string; fileBase64: string }> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const fileBase64 = btoa(binary);

  type PdfItem = { str: string; x: number; y: number };
  type ColDef = { amountX: number; ytdX: number };

  const EXCLUDED_SECTIONS = ["employer paid benefits", "taxable wages", "payment information"];
  const DEDUCTION_SECTIONS = ["employee taxes", "pre tax deductions", "post tax deductions"];
  const ALL_KNOWN_SECTIONS = ["earnings", ...DEDUCTION_SECTIONS, ...EXCLUDED_SECTIONS];
  const AMOUNT_VARIANTS = ["amount", "current", "this period", "this check"];
  const YTD_VARIANTS = ["ytd", "year to date", "year-to-date"];

  function isMoneyAmount(s: string) {
    return /^\d[\d,]*\.\d{2}$/.test(s);
  }

  // Match a known section name from consecutive items starting at startIdx (up to 4 items).
  function matchSection(items: PdfItem[], startIdx: number): [string, number] | null {
    for (let len = Math.min(4, items.length - startIdx); len >= 1; len--) {
      const phrase = items
        .slice(startIdx, startIdx + len)
        .map((it) => it.str.toLowerCase())
        .join(" ");
      const found = ALL_KNOWN_SECTIONS.find((s) => s === phrase);
      if (found) return [found, len];
    }
    return null;
  }

  // Detect Amount+YTD column pairs from a single row. Returns [] if not a column-header row.
  function detectColumns(row: PdfItem[]): ColDef[] {
    const lc = row.map((i) => i.str.toLowerCase());
    const amountXs: number[] = [];
    const ytdXs: number[] = [];
    lc.forEach((s, idx) => {
      if (AMOUNT_VARIANTS.includes(s)) amountXs.push(row[idx].x);
      if (YTD_VARIANTS.some((v) => s.includes(v))) ytdXs.push(row[idx].x);
    });
    if (amountXs.length === 0 || ytdXs.length === 0) return [];
    return amountXs
      .map((ax) => ({ amountX: ax, ytdX: ytdXs.find((yx) => yx > ax)! }))
      .filter((c) => c.ytdX !== undefined);
  }

  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const items: PdfItem[] = content.items
      .filter((it: any) => "str" in it && it.str.trim())
      .map((it: any) => ({
        str: (it.str as string).trim(),
        x: Math.round((it as any).transform[4]),
        y: Math.round((it as any).transform[5]),
      }));

    const byY = new Map<number, PdfItem[]>();
    for (const item of items) {
      if (!byY.has(item.y)) byY.set(item.y, []);
      byY.get(item.y)!.push(item);
    }
    for (const row of byY.values()) row.sort((a, b) => a.x - b.x);
    const sortedRows = Array.from(byY.entries()).sort((a, b) => b[0] - a[0]);

    // Locate the first column-header row (has Amount + YTD headers).
    let colDefs: ColDef[] = [];
    let columnHeaderY: number | null = null;
    for (const [y, row] of sortedRows) {
      const cols = detectColumns(row);
      if (cols.length > 0) {
        colDefs = cols;
        columnHeaderY = y;
        break;
      }
    }

    const lines: string[] = [];

    // Rows ABOVE the column-header row: output as raw text for the HEADER section.
    // This captures the pay-summary table (gross, net, hours, dates) without column filtering,
    // so the parser can find the "Current ..." row with all its numbers intact.
    for (const [y, row] of sortedRows) {
      if (columnHeaderY !== null && y <= columnHeaderY) break;
      const text = row.map((i) => i.str).join(" ").trim();
      if (text) lines.push(text);
    }

    if (colDefs.length > 0) {
      // x-start for each column: col 0 starts at 0, each subsequent col starts just past
      // the previous col's YTD header (leaving the inter-column gap safely in neither column).
      const xStarts = colDefs.map((_, i) =>
        i === 0 ? 0 : colDefs[i - 1].ytdX + 20,
      );

      // Process each column INDEPENDENTLY to keep section content grouped correctly.
      // Workday uses a two-column layout (e.g. Earnings left / Employee Taxes right),
      // so we do a full pass per column rather than interleaving both columns' lines.
      for (let ci = 0; ci < colDefs.length; ci++) {
        const def = colDefs[ci];
        const xStart = xStarts[ci];
        const xEnd = ci + 1 < colDefs.length ? xStarts[ci + 1] : Infinity;
        const midX = (def.amountX + def.ytdX) / 2;

        let isDeduction = false;
        let isExcluded = false;

        for (const [y, row] of sortedRows) {
          if (columnHeaderY !== null && y >= columnHeaderY) continue; // skip header zone

          const colItems = row.filter((it) => it.x >= xStart && it.x < xEnd);
          if (colItems.length === 0) continue;

          const colHasAmount = colItems.some((i) => isMoneyAmount(i.str));

          // Section header detection: check each item individually so that side-by-side
          // headers ("Earnings" at x=50, "Employee Taxes" at x=420) each emit their own marker.
          if (!colHasAmount) {
            const hits: string[] = [];
            let i = 0;
            while (i < colItems.length) {
              const m = matchSection(colItems, i);
              if (m) { hits.push(m[0]); i += m[1]; }
              else { i++; }
            }
            if (hits.length > 0) {
              for (const name of hits) {
                isDeduction = DEDUCTION_SECTIONS.includes(name);
                isExcluded = EXCLUDED_SECTIONS.includes(name);
                if (!isExcluded) lines.push(`\n[${name.toUpperCase()}]`);
              }
              continue;
            }
          }

          if (isExcluded) continue;

          const labelParts = colItems
            .filter((it) => it.x < def.amountX - 10)
            .map((it) => it.str);
          const currentParts = colItems
            .filter((it) => it.x >= def.amountX - 10 && it.x < midX)
            .map((it) => it.str);

          const label = labelParts.join(" ").trim();
          if (!label) continue;

          const numericCurrent = currentParts.find((s) => isMoneyAmount(s));
          if (numericCurrent !== undefined) {
            lines.push(`${label}: ${numericCurrent}`);
          } else if (currentParts.length === 0 && isDeduction) {
            // Blank Amount column in a deduction section → $0.00 this period
            lines.push(`${label}: 0.00`);
          } else if (currentParts.length === 0 && !colHasAmount) {
            lines.push(label);
          }
        }
      }
    }
    // If no columns detected, header-loop above already output everything as raw text.

    pageTexts.push(lines.join("\n"));
  }

  const text = pageTexts.join("\n\n").slice(0, 8000);
  return { text, fileBase64 };
}

// ─── Pipeline step ────────────────────────────────────────────────────────────

function PipelineStep({
  label,
  status,
  note,
}: {
  label: string;
  status: "pending" | "active" | "done";
  note?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex-shrink-0 w-5">
        {status === "done" && <CheckCircle2 className="h-5 w-5 text-success" />}
        {status === "active" && <Loader2 className="h-5 w-5 text-accent animate-spin" />}
        {status === "pending" && (
          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
        )}
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            "text-sm font-medium leading-5",
            status === "pending" && "text-muted-foreground",
          )}
        >
          {label}
        </p>
        {note && <p className="text-xs text-muted-foreground mt-0.5">{note}</p>}
      </div>
    </div>
  );
}

// ─── Analysis modal ───────────────────────────────────────────────────────────

function PaystubAnalysisModal({
  open,
  phase,
  result,
  errorMessage,
  onConfirm,
  onReject,
  isRejecting,
}: {
  open: boolean;
  phase: AnalysisPhase;
  result: AnalysisResult | null;
  errorMessage: string | null;
  onConfirm: () => void;
  onReject: () => void;
  isRejecting: boolean;
}) {
  const isAnalyzing = phase === "preparing" || phase === "analyzing";

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && isAnalyzing) return; // block dismiss during analysis
    if (!nextOpen) onConfirm(); // X or overlay click = keep data
  }

  const pretax = result?.deductions.filter((d) => d.isPretax) ?? [];
  const posttax = result?.deductions.filter((d) => !d.isPretax) ?? [];
  const totalDeductions = result?.deductions.reduce((s, d) => s + d.amountCents, 0) ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-md",
          phase === "reviewing" && "sm:max-w-lg",
          isAnalyzing && "[&>button:last-child]:hidden", // hide the X during analysis
        )}
      >
        {/* ── Analyzing ── */}
        {isAnalyzing && (
          <>
            <DialogHeader>
              <DialogTitle>Analyzing Paystub</DialogTitle>
              <DialogDescription>
                Please wait — do not close this window.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-4">
              <PipelineStep
                label="Preparing file"
                status={phase === "preparing" ? "active" : "done"}
              />
              <PipelineStep
                label="Uploading & analyzing with AI"
                status={phase === "analyzing" ? "active" : "pending"}
                note={phase === "analyzing" ? "This usually takes 10–20 seconds…" : undefined}
              />
              <PipelineStep
                label="Extracting data"
                status="pending"
              />
            </div>
          </>
        )}

        {/* ── Review ── */}
        {phase === "reviewing" && result && (
          <>
            <DialogHeader>
              <DialogTitle>Review Analysis</DialogTitle>
              <DialogDescription>
                Confirm the extracted data or reject to re-upload.
              </DialogDescription>
            </DialogHeader>

            {/* Pay summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Gross Pay</p>
                <p className="text-lg font-bold">{formatCurrency(result.grossPayCents)}</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Deductions</p>
                <p className="text-lg font-bold text-destructive">−{formatCurrency(totalDeductions)}</p>
              </div>
              <div className="rounded-lg border bg-success/10 border-success/20 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Net Pay</p>
                <p className="text-lg font-bold text-success">{formatCurrency(result.netPayCents)}</p>
              </div>
            </div>

            {/* Dates */}
            {(result.payPeriodStart || result.payDate) && (
              <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm space-y-1">
                {result.payPeriodStart && result.payPeriodEnd && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pay period</span>
                    <span className="font-medium">
                      {result.payPeriodStart} – {result.payPeriodEnd}
                    </span>
                  </div>
                )}
                {result.payDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pay date</span>
                    <span className="font-medium">{result.payDate}</span>
                  </div>
                )}
              </div>
            )}

            {/* Deductions */}
            {result.deductions.length > 0 && (
              <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                {pretax.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      Pre-tax
                    </p>
                    <div className="space-y-1">
                      {pretax.map((d, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {DEDUCTION_CATEGORY_LABELS[d.category as DeductionCategory] ?? d.label}
                          </span>
                          <span className="font-medium tabular-nums">
                            −{formatCurrency(d.amountCents)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {posttax.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      Post-tax
                    </p>
                    <div className="space-y-1">
                      {posttax.map((d, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {DEDUCTION_CATEGORY_LABELS[d.category as DeductionCategory] ?? d.label}
                          </span>
                          <span className="font-medium tabular-nums">
                            −{formatCurrency(d.amountCents)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={onReject}
                disabled={isRejecting}
                className="text-destructive hover:text-destructive/80 hover:border-destructive/30"
              >
                {isRejecting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <XCircle className="h-4 w-4 mr-1.5" />
                )}
                Reject
              </Button>
              <Button onClick={onConfirm}>
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Confirm & Save
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Error ── */}
        {phase === "error" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                Analysis Failed
              </DialogTitle>
              <DialogDescription>
                Analysis failed. See the error details below.
              </DialogDescription>
            </DialogHeader>
            {errorMessage && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
                {errorMessage}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={onConfirm}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Paystub status badge ─────────────────────────────────────────────────────

function PaystubStatusBadge({ status }: { status: string }) {
  if (status === "analyzed")
    return (
      <Badge className="border-success/20 bg-success/10 text-success gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Analyzed
      </Badge>
    );
  if (status === "analyzing")
    return (
      <Badge className="border-accent/20 bg-accent/10 text-accent gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Analyzing
      </Badge>
    );
  if (status === "error")
    return (
      <Badge className="border-destructive/20 bg-destructive/10 text-destructive gap-1">
        <AlertCircle className="h-3 w-3" />
        Error
      </Badge>
    );
  return (
    <Badge variant="secondary" className="gap-1">
      <Clock className="h-3 w-3" />
      Pending
    </Badge>
  );
}

// ─── Occurrence row ───────────────────────────────────────────────────────────

interface OccurrenceRowProps {
  incomeSourceId: string;
  occurrence: {
    id: string;
    expectedDate: string;
    amountCents: number;
    status: string;
    receivedAmountCents: number | null;
    receivedDate: string | null;
  };
  paystub: {
    id: string;
    status: string;
    payPeriodStart: string | null;
    payPeriodEnd: string | null;
    payDate: string | null;
    grossPayCents: number | null;
    netPayCents: number | null;
    regularPayCents: number | null;
    overtimePayCents: number | null;
    errorMessage: string | null;
    deductions: Array<{
      id: string;
      label: string;
      category: string;
      amountCents: number;
      isPretax: boolean;
    }>;
  } | null;
}

function OccurrenceRow({ incomeSourceId, occurrence, paystub }: OccurrenceRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState<AnalysisPhase>("idle");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upload = useUploadAndAnalyzePaystub(incomeSourceId);
  const deleteStub = useDeletePaystub(incomeSourceId);

  const isModalOpen = analysisPhase !== "idle";

  function resetModal() {
    setAnalysisPhase("idle");
    setAnalysisResult(null);
    setAnalysisError(null);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalysisPhase("preparing");
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      let result;

      if (file.type === "application/pdf") {
        const { text, fileBase64 } = await extractPdfText(file);
        setAnalysisPhase("analyzing");
        result = await upload.mutateAsync({
          incomeSourceId,
          incomeOccurrenceId: occurrence.id,
          textContent: text,
          fileBase64,
          fileName: file.name,
          mimeType: "application/pdf",
        });
      } else {
        const { base64: imageBase64, mimeType, fileName } = await resizeImageForUpload(file);
        setAnalysisPhase("analyzing");
        result = await upload.mutateAsync({
          incomeSourceId,
          incomeOccurrenceId: occurrence.id,
          imageBase64,
          fileName,
          mimeType,
        });
      }

      setAnalysisResult(result as AnalysisResult);
      setAnalysisPhase("reviewing");
    } catch (err) {
      let message = "Analysis failed. Please try again.";
      if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) {
        message =
          "Could not reach the server. Check that the dev server is running and the AI/R2/D1 bindings are available, then try again.";
      } else if (err instanceof Error && err.message) {
        message = err.message;
      }
      setAnalysisError(message);
      setAnalysisPhase("error");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleReject() {
    if (analysisResult) {
      await deleteStub.mutateAsync(analysisResult.paystubId);
    }
    resetModal();
  }

  async function handleDelete() {
    if (!paystub || !confirm("Delete this paystub? This will revert the occurrence to pending."))
      return;
    await deleteStub.mutateAsync(paystub.id);
  }

  const hasStub = !!paystub;
  const isAnalyzing = paystub?.status === "analyzing";

  const pretaxDeductions = paystub?.deductions.filter((d) => d.isPretax) ?? [];
  const postaxDeductions = paystub?.deductions.filter((d) => !d.isPretax) ?? [];

  return (
    <>
      <PaystubAnalysisModal
        open={isModalOpen}
        phase={analysisPhase}
        result={analysisResult}
        errorMessage={analysisError}
        onConfirm={resetModal}
        onReject={handleReject}
        isRejecting={deleteStub.isPending}
      />

      <div className="border rounded-lg overflow-hidden">
        <div
          className="flex items-center justify-between px-4 py-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => hasStub && setExpanded((v) => !v)}
        >
          <div className="flex items-center gap-3 min-w-0">
            {hasStub ? (
              expanded ? (
                <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              )
            ) : (
              <div className="h-4 w-4" />
            )}
            <div>
              <p className="font-medium text-sm">{occurrence.expectedDate}</p>
              {paystub?.payPeriodStart && paystub.payPeriodEnd && (
                <p className="text-xs text-muted-foreground">
                  Period: {paystub.payPeriodStart} – {paystub.payPeriodEnd}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {paystub?.status === "analyzed" && paystub.netPayCents != null && (
              <div className="text-right hidden sm:block">
                <p className="text-xs text-muted-foreground">Net Pay</p>
                <p className="font-semibold text-sm text-success">
                  {formatCurrency(paystub.netPayCents)}
                </p>
              </div>
            )}
            {hasStub ? (
              <PaystubStatusBadge status={paystub!.status} />
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={isModalOpen}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload Paystub
                </Button>
              </>
            )}
            {hasStub && !isAnalyzing && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                disabled={deleteStub.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="sr-only">Delete paystub</span>
              </Button>
            )}
          </div>
        </div>

        {expanded && paystub?.status === "analyzed" && (
          <div className="px-4 py-4 space-y-4 border-t">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md bg-muted/40 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-0.5">Gross Pay</p>
                <p className="font-semibold text-sm">{formatCurrency(paystub.grossPayCents ?? 0)}</p>
              </div>
              <div className="rounded-md bg-muted/40 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-0.5">Total Deductions</p>
                <p className="font-semibold text-sm text-destructive">
                  {formatCurrency(
                    paystub.deductions.reduce((s, d) => s + d.amountCents, 0),
                  )}
                </p>
              </div>
              <div className="rounded-md bg-success/10 border-success/20 border p-3 text-center">
                <p className="text-xs text-muted-foreground mb-0.5">Net Pay</p>
                <p className="font-semibold text-sm text-success">
                  {formatCurrency(paystub.netPayCents ?? 0)}
                </p>
              </div>
            </div>

            {pretaxDeductions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Pre-tax Deductions
                </p>
                <div className="space-y-1">
                  {pretaxDeductions.map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {DEDUCTION_CATEGORY_LABELS[d.category as DeductionCategory] ?? d.label}
                      </span>
                      <span className="font-medium tabular-nums">−{formatCurrency(d.amountCents)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {postaxDeductions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Post-tax Deductions
                </p>
                <div className="space-y-1">
                  {postaxDeductions.map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {DEDUCTION_CATEGORY_LABELS[d.category as DeductionCategory] ?? d.label}
                      </span>
                      <span className="font-medium tabular-nums">−{formatCurrency(d.amountCents)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {expanded && paystub?.status === "error" && (
          <div className="px-4 py-3 border-t border-destructive/20 bg-destructive/10 text-sm text-destructive">
            {paystub.errorMessage ?? "An error occurred during analysis."}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function PayrollDetailPage() {
  const { id } = Route.useParams();
  const { data, isLoading, isError } = useIncomeSourceDetail(id);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 text-sm text-destructive">
        Failed to load income source.{" "}
        <Link to="/income" className="underline">
          Go back
        </Link>
      </div>
    );
  }

  const { source, occurrences, projection } = data;

  return (
    <div className="entity-page max-w-3xl">
      <div>
        <Link
          to="/income"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Income Sources
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-heading text-foreground">{source.name}</h1>
              {source.sourceType === "payroll" && (
                <Badge className="border-accent/20 bg-accent/10 text-accent">Payroll</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {INTERVAL_LABELS[source.interval] ?? source.interval} · Started {source.startDate}
            </p>
          </div>
        </div>
      </div>

      {projection ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 font-heading">
              <TrendingUp className="h-4 w-4 text-accent" />
              Paycheck Projection
              <span className="text-xs font-normal text-muted-foreground font-sans">
                based on last {projection.basedOnCount} paystub
                {projection.basedOnCount !== 1 ? "s" : ""}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground mb-1">Avg Gross Pay</p>
                <p className="text-lg font-semibold">{formatCurrency(projection.avgGrossPayCents)}</p>
              </div>
              <div className="rounded-md border bg-success/10 border-success/20 p-3">
                <p className="text-xs text-muted-foreground mb-1">Avg Net Pay</p>
                <p className="text-lg font-semibold text-success">
                  {formatCurrency(projection.avgNetPayCents)}
                </p>
              </div>
            </div>

            {projection.avgDeductions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Average Deductions
                </p>
                <div className="space-y-1.5">
                  {projection.avgDeductions
                    .sort((a, b) => b.avgAmountCents - a.avgAmountCents)
                    .map((d) => (
                      <div key={d.category} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {DEDUCTION_CATEGORY_LABELS[d.category as DeductionCategory] ?? d.label}
                        </span>
                        <span className="font-medium tabular-nums text-destructive">
                          −{formatCurrency(d.avgAmountCents)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center">
            <DollarSign className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Upload paystubs to see projected gross/net pay and average deductions.
            </p>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-base font-semibold font-heading mb-3 text-foreground">Pay Periods</h2>
        {occurrences.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pay periods generated yet.</p>
        ) : (
          <div className="space-y-2">
            {occurrences.map(({ occurrence, paystub }) => (
              <OccurrenceRow
                key={occurrence.id}
                incomeSourceId={source.id}
                occurrence={occurrence}
                paystub={paystub}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
