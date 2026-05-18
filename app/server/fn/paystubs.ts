import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, desc, asc } from "drizzle-orm";
import { authMiddleware } from "~/server/middleware";
import { paystubs } from "~/db/schema/paystubs";
import { paystubDeductions } from "~/db/schema/paystub-deductions";
import { incomeOccurrences } from "~/db/schema/income-occurrences";
import { incomeSources } from "~/db/schema/income-sources";
import { toDateStr } from "~/lib/dates";

const AI_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

const ANALYSIS_PROMPT = `You are analyzing a pay stub / paycheck document. Extract financial data and return ONLY a valid JSON object with no markdown, no explanation, no code blocks.

Required JSON structure:
{
  "grossPay": 3598.47,
  "netPay": 3182.50,
  "regularPay": 3453.50,
  "overtimePay": 0.00,
  "otherPay": 147.74,
  "payPeriodStart": "2026-04-26",
  "payPeriodEnd": "2026-05-09",
  "payDate": "2026-05-15",
  "deductions": [
    {"label": "OASDI", "category": "social_security", "amount": 222.08, "isPretax": false},
    {"label": "Medicare", "category": "medicare", "amount": 51.94, "isPretax": false},
    {"label": "Federal Withholding", "category": "federal_tax", "amount": 0.00, "isPretax": false},
    {"label": "Dental Pretax", "category": "dental", "amount": 19.21, "isPretax": true},
    {"label": "401(k) Loan Repayment", "category": "retirement_401k", "amount": 122.74, "isPretax": false}
  ]
}

Valid deduction categories: federal_tax, state_tax, local_tax, social_security, medicare, health_insurance, dental, vision, retirement_401k, retirement_roth, hsa, fsa, life_insurance, disability_insurance, garnishment, child_support, other

DOCUMENT STRUCTURE — this stub has distinct sections. Read each section carefully:

EARNINGS section: lists salary, overtime, bonuses, benefits. Use the "Amount" (current period) column for grossPay, regularPay, overtimePay, otherPay. Never use YTD.

EMPLOYEE TAXES section: these are taxes withheld from the employee. Include ALL of these in deductions:
  - OASDI or OASDI Tax → category: social_security (this IS Social Security / FICA)
  - Medicare or Medicare Tax → category: medicare
  - Federal Withholding or Federal Income Tax → category: federal_tax
  - State Tax or State Withholding → category: state_tax
  - Local Tax → category: local_tax

PRE TAX DEDUCTIONS section: benefits taken before tax. Include ALL with isPretax: true:
  - 401(k), Traditional 401k → category: retirement_401k
  - Roth 401(k) → category: retirement_roth
  - Medical / Health Insurance → category: health_insurance
  - Dental Pretax, Dental Insurance → category: dental
  - Vision → category: vision
  - HSA → category: hsa
  - FSA → category: fsa

POST TAX DEDUCTIONS section: taken after tax. Include ALL with isPretax: false:
  - 401(k) Loan Repayment → category: retirement_401k
  - Life Insurance → category: life_insurance
  - Disability Insurance → category: disability_insurance
  - Garnishment → category: garnishment
  - Child Support → category: child_support
  - Any other post-tax item → category: other

DO NOT include these sections — they are NOT employee deductions:
  - "Employer Paid Benefits" or "ER - ..." items: these are the employer's cost, not taken from the employee's paycheck
  - "Taxable Wages" section: these are wage bases used to calculate taxes, NOT dollar amounts deducted

ADDITIONAL RULES:
1. CURRENT PERIOD ONLY. When a table has an Amount column and a YTD column, always use Amount (current period). Never use YTD.
2. ONE ENTRY PER LINE ITEM. Each row from Employee Taxes, Pre Tax Deductions, and Post Tax Deductions becomes one deduction entry.
3. ZERO-AMOUNT ENTRIES. Include deductions even if the current amount is $0.00 — omit them only if the row doesn't exist on the stub.
4. MATH VERIFICATION. Confirm: grossPay - sum(all deduction amounts) ≈ netPay (within $1). If the gap is larger, you missed a deduction — look at every section again.
5. All monetary values are positive numbers in dollars (NOT cents).
6. Dates must be in YYYY-MM-DD format, or null if not visible.
7. Return ONLY the JSON object — no markdown, no explanation, no code blocks.`;

type ParsedPaystub = {
  grossPay: number;
  netPay: number;
  regularPay: number;
  overtimePay: number;
  otherPay: number;
  payPeriodStart: string | null;
  payPeriodEnd: string | null;
  payDate: string | null;
  deductions: Array<{ label: string; category: string; amount: number; isPretax: boolean }>;
};

function mapDeductionCategory(label: string): string {
  const lc = label.toLowerCase();
  if (/oasdi|social.?security|fica/.test(lc)) return "social_security";
  if (/medicare/.test(lc)) return "medicare";
  if (/federal.*(withholding|income.?tax|tax)|fed.*tax|fwt/.test(lc)) return "federal_tax";
  if (/state.*(tax|withholding)|sit\b/.test(lc)) return "state_tax";
  if (/local.*(tax|withholding)/.test(lc)) return "local_tax";
  if (/roth/.test(lc)) return "retirement_roth";
  if (/401.?k|retirement/.test(lc) && !/loan/.test(lc)) return "retirement_401k";
  if (/\bhsa\b/.test(lc)) return "hsa";
  if (/\bfsa\b/.test(lc)) return "fsa";
  if (/dental/.test(lc)) return "dental";
  if (/vision/.test(lc)) return "vision";
  if (/health|medical/.test(lc)) return "health_insurance";
  if (/life.?ins/.test(lc)) return "life_insurance";
  if (/disability/.test(lc)) return "disability_insurance";
  if (/garnish/.test(lc)) return "garnishment";
  if (/child.?support/.test(lc)) return "child_support";
  return "other";
}

function parseStructuredPaystubText(text: string): ParsedPaystub {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Split into named sections by [SECTION HEADER] markers
  type SectionName = "HEADER" | "EARNINGS" | "EMPLOYEE TAXES" | "PRE TAX DEDUCTIONS" | "POST TAX DEDUCTIONS";
  const sections = new Map<SectionName, string[]>();
  let current: SectionName = "HEADER";
  sections.set(current, []);

  for (const line of lines) {
    const m = line.match(/^\[([A-Z\s]+)\]$/);
    if (m) {
      current = m[1].trim() as SectionName;
      if (!sections.has(current)) sections.set(current, []);
    } else {
      sections.get(current)?.push(line);
    }
  }

  const headerLines = sections.get("HEADER") ?? [];
  const earningsLines = sections.get("EARNINGS") ?? [];
  const taxLines = sections.get("EMPLOYEE TAXES") ?? [];
  const preTaxLines = sections.get("PRE TAX DEDUCTIONS") ?? [];
  const postTaxLines = sections.get("POST TAX DEDUCTIONS") ?? [];

  // Extract gross and net from the "Current ..." summary row
  // Workday format: "Current  [hours]  [gross]  [postTax]  [empTaxes]  [preTax]  [net]"
  let grossPay = 0;
  let netPay = 0;
  for (const line of headerLines) {
    if (/^current\b/i.test(line)) {
      const nums = [...line.matchAll(/[\d,]+\.\d{2}/g)].map((m) =>
        parseFloat(m[0].replace(/,/g, ""))
      );
      if (nums.length >= 2) {
        grossPay = nums[1]; // index 0 = hours, index 1 = gross
        netPay = nums[nums.length - 1];
      }
      break;
    }
  }

  // Extract dates: MM/DD/YYYY → YYYY-MM-DD (first three occurrences in header)
  const allHeaderText = headerLines.join(" ");
  const rawDates = [...allHeaderText.matchAll(/\b(\d{2})\/(\d{2})\/(\d{4})\b/g)].map(
    (m) => `${m[3]}-${m[1]}-${m[2]}`
  );
  const payPeriodStart = rawDates[0] ?? null;
  const payPeriodEnd = rawDates[1] ?? null;
  const payDate = rawDates[2] ?? null;

  // Parse earnings — only [EARNINGS] section, classify by label keywords
  let regularPay = 0;
  let overtimePay = 0;
  let otherPay = 0;
  for (const line of earningsLines) {
    const m = line.match(/^(.+):\s*([\d,]+\.\d{2})$/);
    if (!m) continue;
    const lc = m[1].toLowerCase();
    const amount = parseFloat(m[2].replace(/,/g, ""));
    if (/salary|regular|hourly|base/.test(lc)) regularPay += amount;
    else if (/overtime|\bOT\b/.test(lc)) overtimePay += amount;
    else otherPay += amount;
  }

  // Fall back: derive gross from earnings sum if summary row wasn't found
  if (grossPay === 0) grossPay = regularPay + overtimePay + otherPay;

  // Parse deductions — ONLY from the three deduction sections, never from Earnings
  const deductions: ParsedPaystub["deductions"] = [];

  function parseDeductionSection(sectionLines: string[], isPretax: boolean) {
    for (const line of sectionLines) {
      const m = line.match(/^(.+):\s*([\d,]+\.\d{2})$/);
      if (!m) continue;
      const label = m[1].trim();
      const amount = parseFloat(m[2].replace(/,/g, ""));
      deductions.push({ label, category: mapDeductionCategory(label), amount, isPretax });
    }
  }

  parseDeductionSection(taxLines, false);
  parseDeductionSection(preTaxLines, true);
  parseDeductionSection(postTaxLines, false);

  return { grossPay, netPay, regularPay, overtimePay, otherPay, payPeriodStart, payPeriodEnd, payDate, deductions };
}

function parseAiResponse(raw: string): ParsedPaystub {
  // Strip markdown code fences if present
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Extract first JSON object
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in AI response");

  const parsed = JSON.parse(match[0]);

  return {
    grossPay: Number(parsed.grossPay ?? 0),
    netPay: Number(parsed.netPay ?? 0),
    regularPay: Number(parsed.regularPay ?? 0),
    overtimePay: Number(parsed.overtimePay ?? 0),
    otherPay: Number(parsed.otherPay ?? 0),
    payPeriodStart: parsed.payPeriodStart ?? null,
    payPeriodEnd: parsed.payPeriodEnd ?? null,
    payDate: parsed.payDate ?? null,
    deductions: Array.isArray(parsed.deductions)
      ? parsed.deductions.map((d: any) => ({
          label: String(d.label ?? "Unknown"),
          category: String(d.category ?? "other"),
          amount: Number(d.amount ?? 0),
          isPretax: Boolean(d.isPretax),
        }))
      : [],
  };
}

export const getPaystubsForSource = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ incomeSourceId: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context;

    const stubs = await db
      .select()
      .from(paystubs)
      .where(
        and(
          eq(paystubs.userId, user.id),
          eq(paystubs.incomeSourceId, data.incomeSourceId)
        )
      )
      .orderBy(desc(paystubs.createdAt))
      .all();

    const results = [];
    for (const stub of stubs) {
      const deductions = await db
        .select()
        .from(paystubDeductions)
        .where(eq(paystubDeductions.paystubId, stub.id))
        .orderBy(asc(paystubDeductions.amountCents))
        .all();
      results.push({ ...stub, deductions });
    }

    return results;
  });

export const getIncomeSourceDetail = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context;

    const source = await db
      .select()
      .from(incomeSources)
      .where(and(eq(incomeSources.id, data.id), eq(incomeSources.userId, user.id)))
      .get();

    if (!source) throw new Error("Income source not found");

    const occurrences = await db
      .select()
      .from(incomeOccurrences)
      .where(
        and(
          eq(incomeOccurrences.incomeSourceId, data.id),
          eq(incomeOccurrences.userId, user.id)
        )
      )
      .orderBy(desc(incomeOccurrences.expectedDate))
      .all();

    // For each occurrence, find linked paystub
    const occurrenceResults = [];
    for (const occ of occurrences) {
      const stub = await db
        .select()
        .from(paystubs)
        .where(
          and(
            eq(paystubs.incomeOccurrenceId, occ.id),
            eq(paystubs.userId, user.id)
          )
        )
        .get();

      let deductions: typeof paystubDeductions.$inferSelect[] = [];
      if (stub) {
        deductions = await db
          .select()
          .from(paystubDeductions)
          .where(eq(paystubDeductions.paystubId, stub.id))
          .orderBy(desc(paystubDeductions.amountCents))
          .all();
      }

      occurrenceResults.push({
        occurrence: occ,
        paystub: stub ? { ...stub, deductions } : null,
      });
    }

    // Compute projection from last 3 analyzed stubs
    const analyzed = occurrenceResults
      .filter((r) => r.paystub?.status === "analyzed" && r.paystub.netPayCents)
      .slice(0, 3);

    let projection = null;
    if (analyzed.length > 0) {
      const avgGross = Math.round(
        analyzed.reduce((s, r) => s + (r.paystub!.grossPayCents ?? 0), 0) / analyzed.length
      );
      const avgNet = Math.round(
        analyzed.reduce((s, r) => s + (r.paystub!.netPayCents ?? 0), 0) / analyzed.length
      );

      // Aggregate deductions across analyzed stubs
      const deductionTotals = new Map<string, { label: string; total: number }>();
      for (const r of analyzed) {
        for (const d of r.paystub!.deductions) {
          const key = d.category;
          const existing = deductionTotals.get(key);
          if (existing) {
            existing.total += d.amountCents;
          } else {
            deductionTotals.set(key, { label: d.label, total: d.amountCents });
          }
        }
      }

      projection = {
        avgGrossPayCents: avgGross,
        avgNetPayCents: avgNet,
        avgDeductions: Array.from(deductionTotals.entries()).map(([category, v]) => ({
          category,
          label: v.label,
          avgAmountCents: Math.round(v.total / analyzed.length),
        })),
        basedOnCount: analyzed.length,
      };
    }

    return { source, occurrences: occurrenceResults, projection };
  });

export const uploadAndAnalyzePaystub = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      incomeSourceId: z.string(),
      incomeOccurrenceId: z.string(),
      fileName: z.string(),
      mimeType: z.string().default("application/octet-stream"),
      // Image upload path (photos, scanned images)
      imageBase64: z.string().optional(),
      // PDF text extraction path
      textContent: z.string().optional(),
      fileBase64: z.string().optional(),
    })
  )
  .handler(async ({ data, context }) => {
    const { db, user, env } = context;
    const now = new Date();
    const paystubId = nanoid();
    const isTextPath = !!data.textContent;

    // Decode file bytes for R2 storage
    const sourceBase64 = isTextPath ? data.fileBase64! : data.imageBase64!;
    if (!sourceBase64) {
      throw new Error("No file data provided.");
    }
    let fileBytes: Uint8Array;
    try {
      fileBytes = Uint8Array.from(atob(sourceBase64), (c) => c.charCodeAt(0));
    } catch {
      throw new Error("Invalid file data — could not decode the uploaded file.");
    }

    // Store in R2
    const r2Key = `paystubs/${user.id}/${paystubId}/${data.fileName}`;
    try {
      await env.R2.put(r2Key, fileBytes, {
        httpMetadata: { contentType: data.mimeType },
      });
    } catch (e) {
      throw new Error(`Storage unavailable: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Create paystub record in pending state
    try {
      await db.insert(paystubs).values({
        id: paystubId,
        userId: user.id,
        incomeSourceId: data.incomeSourceId,
        incomeOccurrenceId: data.incomeOccurrenceId,
        r2Key,
        fileName: data.fileName,
        status: "analyzing",
        createdAt: now,
        updatedAt: now,
      });
    } catch (e) {
      await env.R2.delete(r2Key).catch(() => {});
      throw new Error(`Database unavailable: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Parse the paystub — deterministic for PDF text, AI vision for images
    let parsed: ParsedPaystub;
    try {
      if (isTextPath) {
        if (!data.textContent || data.textContent.trim().length < 50) {
          throw new Error("No readable text found in the PDF. The file may be a scanned image — try uploading a photo instead.");
        }
        parsed = parseStructuredPaystubText(data.textContent);
      } else {
        if (!env.AI) {
          throw new Error("AI binding is not available. Ensure the [ai] binding is in wrangler.toml.");
        }
        let aiResponseText = "";
        const aiResponse = await (env.AI as any).run(AI_MODEL, {
          prompt: ANALYSIS_PROMPT,
          image: Array.from(fileBytes),
          max_tokens: 1024,
        });
        aiResponseText = aiResponse?.response ?? "";
        parsed = parseAiResponse(aiResponseText);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await db
        .update(paystubs)
        .set({ status: "error", errorMessage: msg, updatedAt: new Date() })
        .where(and(eq(paystubs.id, paystubId), eq(paystubs.userId, user.id)))
        .catch(() => {});
      throw err;
    }

    const grossPayCents = Math.round(parsed.grossPay * 100);
    const netPayCents = Math.round(parsed.netPay * 100);
    const updateNow = new Date();

    // Update paystub with extracted data
    await db
      .update(paystubs)
      .set({
        payPeriodStart: parsed.payPeriodStart,
        payPeriodEnd: parsed.payPeriodEnd,
        payDate: parsed.payDate,
        grossPayCents,
        netPayCents,
        regularPayCents: Math.round(parsed.regularPay * 100),
        overtimePayCents: Math.round(parsed.overtimePay * 100),
        otherPayCents: Math.round(parsed.otherPay * 100),
        status: "analyzed",
        updatedAt: updateNow,
      })
      .where(and(eq(paystubs.id, paystubId), eq(paystubs.userId, user.id)));

    // Insert deductions one at a time (D1 limitation)
    for (const d of parsed.deductions) {
      if (d.amount <= 0) continue;
      await db.insert(paystubDeductions).values({
        id: nanoid(),
        paystubId,
        userId: user.id,
        label: d.label,
        category: d.category,
        amountCents: Math.round(d.amount * 100),
        isPretax: d.isPretax,
        createdAt: updateNow,
      });
    }

    // Update the income occurrence with actual net pay
    if (netPayCents > 0) {
      await db
        .update(incomeOccurrences)
        .set({
          receivedAmountCents: netPayCents,
          status: "received",
          receivedDate: parsed.payDate ?? toDateStr(new Date()),
          updatedAt: updateNow,
        })
        .where(
          and(
            eq(incomeOccurrences.id, data.incomeOccurrenceId),
            eq(incomeOccurrences.userId, user.id)
          )
        );
    }

    return {
      paystubId,
      grossPayCents,
      netPayCents,
      regularPayCents: Math.round(parsed.regularPay * 100),
      overtimePayCents: Math.round(parsed.overtimePay * 100),
      otherPayCents: Math.round(parsed.otherPay * 100),
      payPeriodStart: parsed.payPeriodStart,
      payPeriodEnd: parsed.payPeriodEnd,
      payDate: parsed.payDate,
      deductions: parsed.deductions
        .filter((d) => d.amount > 0)
        .map((d) => ({
          label: d.label,
          category: d.category,
          amountCents: Math.round(d.amount * 100),
          isPretax: d.isPretax,
        })),
    };
  });

export const deletePaystub = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ paystubId: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user, env } = context;

    const stub = await db
      .select()
      .from(paystubs)
      .where(and(eq(paystubs.id, data.paystubId), eq(paystubs.userId, user.id)))
      .get();

    if (!stub) throw new Error("Paystub not found");

    // Delete from R2
    if (stub.r2Key) {
      await env.R2.delete(stub.r2Key);
    }

    // Revert income occurrence if it was marked received by this paystub
    if (stub.incomeOccurrenceId) {
      await db
        .update(incomeOccurrences)
        .set({ status: "pending", receivedAmountCents: null, receivedDate: null, updatedAt: new Date() })
        .where(
          and(
            eq(incomeOccurrences.id, stub.incomeOccurrenceId),
            eq(incomeOccurrences.userId, user.id)
          )
        );
    }

    await db
      .delete(paystubs)
      .where(and(eq(paystubs.id, data.paystubId), eq(paystubs.userId, user.id)));
  });
