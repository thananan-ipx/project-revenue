import { Project, PositionRate, OverheadItem, Employee } from "./types";
import { calculateProjectCosts } from "./calculations";
import { getProjectDateRange, TimelineWindow, computeYearWindow } from "./resource-planning";

/** Fully-loaded monthly cost for one employee. */
export function employeeMonthlyCost(emp: Employee): number {
  const benefitMul = 1 + (emp.benefitPercent || 0) / 100;
  return (emp.monthlySalary || 0) * benefitMul + (emp.socialSecurityAmount || 0);
}

/** Whether an employee is active during the given month (UTC first-of-month). */
export function isEmployeeActiveInMonth(emp: Employee, monthStart: Date): boolean {
  const monthEnd = new Date(monthStart);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
  const start = new Date(emp.startDate + "T00:00:00Z");
  if (start.getTime() >= monthEnd.getTime()) return false; // hasn't started yet
  if (emp.endDate) {
    const end = new Date(emp.endDate + "T00:00:00Z");
    if (end.getTime() < monthStart.getTime()) return false; // already left
  }
  return true;
}

export interface CashflowInflowDetail {
  projectId: string;
  projectName: string;
  installmentName: string;
  amount: number;       // amount received (after withholding deduction)
  invoiceDate: string;  // ISO
  receivedDate: string; // ISO
}

export interface CashflowOutflowDetail {
  projectId?: string; // undefined = overhead/payroll (company-wide)
  projectName?: string;
  category: "labor" | "direct" | "contingency" | "overhead" | "payroll" | "bonus";
  label: string;
  amount: number;
}

export interface CashflowMonth {
  monthDate: Date;
  monthLabel: string; // "Jan 24"
  inflow: number;
  outflow: number;
  net: number;        // inflow - outflow
  cumulative: number; // running balance
  inflowDetails: CashflowInflowDetail[];
  outflowDetails: CashflowOutflowDetail[];
}

export type LaborCostSource = "project-spread" | "payroll" | "both";

export interface CashflowOptions {
  excludeStatuses?: string[];
  /** Opening balance at start of window. Default 0. */
  openingBalance?: number;
  /** Whether to include overhead as outflow. Default true. */
  includeOverhead?: boolean;
  /**
   * Source of labor cost in cashflow:
   * - "project-spread" (default, legacy): spread project.laborCost linearly over duration
   * - "payroll": use actual employee salaries — labor cost is fixed monthly regardless of projects
   * - "both": include both (double-counts; only for debugging)
   */
  laborSource?: LaborCostSource;
  /** Employees on payroll — required when laborSource = "payroll" */
  employees?: Employee[];
}

/**
 * Compute month-by-month cashflow for the given window.
 *
 * Inflow model — payment installments:
 *   invoiceDate = projectStart + installment.dueAfterDays
 *   receivedDate = invoiceDate + paymentTerms.paymentDueDays
 *   amount = project.netReceivable × (installment.percent / 100)
 *
 *   We attribute the inflow to the month containing receivedDate.
 *
 * Outflow model — incurred costs spread linearly across project duration:
 *   - labor: project.laborCost / durationMonths per month
 *   - direct: project.directCost / durationMonths per month
 *   - contingency: project.contingencyAmount / durationMonths per month
 *   - overhead: totalMonthlyOverhead (company-wide) per month of the window
 */
export function computeCashflow(
  projects: Project[],
  positions: PositionRate[],
  overheads: OverheadItem[],
  window: TimelineWindow,
  options: CashflowOptions = {}
): CashflowMonth[] {
  const excludeStatuses = new Set(options.excludeStatuses ?? ["lost"]);
  const includeOverhead = options.includeOverhead ?? true;
  const openingBalance = options.openingBalance ?? 0;
  const laborSource: LaborCostSource = options.laborSource ?? "project-spread";
  const employees = options.employees ?? [];

  // Initialize months
  const months: CashflowMonth[] = window.months.map((m) => ({
    monthDate: m.date,
    monthLabel: m.label,
    inflow: 0,
    outflow: 0,
    net: 0,
    cumulative: 0,
    inflowDetails: [],
    outflowDetails: [],
  }));

  const monthKey = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth()).padStart(2, "0")}`;
  const monthIndex = new Map<string, number>();
  months.forEach((m, i) => monthIndex.set(monthKey(m.monthDate), i));

  // Active overheads — those effective at any point in the window
  // (for simplicity, we use overhead's effective on first day of window;
  // a more sophisticated approach could vary monthly)
  const windowStartISO = window.start.toISOString().split("T")[0];
  const totalMonthlyOverhead = overheads
    .filter((o) => {
      if (o.effectiveFrom && windowStartISO < o.effectiveFrom) {
        // overhead starts later — check if it starts within the window
        return o.effectiveFrom < window.end.toISOString().split("T")[0];
      }
      if (o.effectiveTo && windowStartISO > o.effectiveTo) return false;
      return true;
    })
    .reduce((s, o) => s + (o.period === "yearly" ? o.cost / 12 : o.cost), 0);

  // --- Overhead outflow: spread across all months in window ---
  if (includeOverhead && totalMonthlyOverhead > 0) {
    for (const m of months) {
      m.outflow += totalMonthlyOverhead;
      m.outflowDetails.push({
        category: "overhead",
        label: "ค่าใช้จ่ายส่วนกลาง (โสหุ้ย)",
        amount: totalMonthlyOverhead,
      });
    }
  }

  // --- Payroll outflow: fixed monthly salary for each active employee ---
  const usePayroll = laborSource === "payroll" || laborSource === "both";
  if (usePayroll && employees.length > 0) {
    for (const m of months) {
      let monthPayroll = 0;
      let monthBonus = 0;
      const activeNames: string[] = [];
      for (const emp of employees) {
        if (!isEmployeeActiveInMonth(emp, m.monthDate)) continue;
        const cost = employeeMonthlyCost(emp);
        monthPayroll += cost;
        activeNames.push(emp.name);
        // Annual bonus — paid in December
        if (emp.annualBonus && m.monthDate.getUTCMonth() === 11) {
          monthBonus += emp.annualBonus;
        }
      }
      if (monthPayroll > 0) {
        m.outflow += monthPayroll;
        m.outflowDetails.push({
          category: "payroll",
          label: `เงินเดือนพนักงาน (${activeNames.length} คน)`,
          amount: monthPayroll,
        });
      }
      if (monthBonus > 0) {
        m.outflow += monthBonus;
        m.outflowDetails.push({
          category: "bonus",
          label: "โบนัสประจำปี",
          amount: monthBonus,
        });
      }
    }
  }

  // --- Per project: inflow (installments) + outflow (linear cost spread) ---
  for (const project of projects) {
    if (excludeStatuses.has(project.status)) continue;
    const calc = calculateProjectCosts(project, positions, overheads);
    if (calc.priceBeforeTax <= 0 && calc.laborCost <= 0) continue;

    const range = getProjectDateRange(project);
    const projectStart = range.start;

    // ----- Inflow: installments -----
    const installments = project.paymentTerms?.installments ?? [];
    const paymentDueDays = project.paymentTerms?.paymentDueDays ?? 0;
    for (const inst of installments) {
      // amount actually received by company = netReceivable × pct
      const amount = calc.netReceivable * ((inst.percent || 0) / 100);
      if (amount <= 0) continue;

      // invoice issued
      const invoiceDate = new Date(projectStart);
      invoiceDate.setUTCDate(invoiceDate.getUTCDate() + (inst.dueAfterDays || 0));
      // actual receipt = invoice + payment terms
      const receivedDate = new Date(invoiceDate);
      receivedDate.setUTCDate(receivedDate.getUTCDate() + paymentDueDays);

      // bucket into month of received date
      const key = `${receivedDate.getUTCFullYear()}-${String(receivedDate.getUTCMonth()).padStart(2, "0")}`;
      const idx = monthIndex.get(key);
      if (idx === undefined) continue; // outside window
      months[idx].inflow += amount;
      months[idx].inflowDetails.push({
        projectId: project.id,
        projectName: project.name,
        installmentName: inst.name,
        amount,
        invoiceDate: invoiceDate.toISOString().split("T")[0],
        receivedDate: receivedDate.toISOString().split("T")[0],
      });
    }

    // ----- Outflow: linear cost spread over project duration -----
    const duration = Math.max(calc.durationMonths, 0.1);
    const projectEnd = range.end;
    const monthlyLabor = calc.laborCost / duration;
    const monthlyDirect = calc.directCost / duration;
    const monthlyContingency = calc.contingencyAmount / duration;

    // walk month by month within project span ∩ window
    for (let i = 0; i < months.length; i++) {
      const m = months[i];
      const monthStart = m.monthDate;
      const monthEnd = new Date(monthStart);
      monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

      // overlap in days
      const overlapStartMs = Math.max(projectStart.getTime(), monthStart.getTime());
      const overlapEndMs = Math.min(projectEnd.getTime(), monthEnd.getTime());
      const overlapDays = Math.max(0, (overlapEndMs - overlapStartMs) / 86_400_000);
      if (overlapDays <= 0) continue;

      const monthDays = (monthEnd.getTime() - monthStart.getTime()) / 86_400_000;
      const ratio = overlapDays / monthDays; // 0..1, fraction of this month covered by project

      // Skip project labor spread when using actual payroll
      const includeProjectLabor = laborSource === "project-spread" || laborSource === "both";
      if (includeProjectLabor && monthlyLabor > 0) {
        const v = monthlyLabor * ratio;
        m.outflow += v;
        m.outflowDetails.push({
          projectId: project.id,
          projectName: project.name,
          category: "labor",
          label: `${project.name} — ค่าแรง`,
          amount: v,
        });
      }
      if (monthlyDirect > 0) {
        const v = monthlyDirect * ratio;
        m.outflow += v;
        m.outflowDetails.push({
          projectId: project.id,
          projectName: project.name,
          category: "direct",
          label: `${project.name} — Direct Cost`,
          amount: v,
        });
      }
      if (monthlyContingency > 0) {
        const v = monthlyContingency * ratio;
        m.outflow += v;
        m.outflowDetails.push({
          projectId: project.id,
          projectName: project.name,
          category: "contingency",
          label: `${project.name} — Contingency`,
          amount: v,
        });
      }
    }
  }

  // Net + cumulative
  let running = openingBalance;
  for (const m of months) {
    m.net = m.inflow - m.outflow;
    running += m.net;
    m.cumulative = running;
  }

  return months;
}

export interface CashflowSummary {
  totalInflow: number;
  totalOutflow: number;
  netCashflow: number;
  endingBalance: number;
  peakBalance: number;
  peakBalanceMonth: string;
  minBalance: number;
  minBalanceMonth: string;
  negativeMonths: number;
  monthsWithInflow: number;
}

export function summarizeCashflow(
  months: CashflowMonth[],
  openingBalance = 0
): CashflowSummary {
  const totalInflow = months.reduce((s, m) => s + m.inflow, 0);
  const totalOutflow = months.reduce((s, m) => s + m.outflow, 0);
  const netCashflow = totalInflow - totalOutflow;
  const endingBalance = months.length ? months[months.length - 1].cumulative : openingBalance;

  let peak = -Infinity;
  let peakMonth = "-";
  let trough = Infinity;
  let troughMonth = "-";
  let negativeMonths = 0;
  let monthsWithInflow = 0;
  for (const m of months) {
    if (m.cumulative > peak) {
      peak = m.cumulative;
      peakMonth = m.monthLabel;
    }
    if (m.cumulative < trough) {
      trough = m.cumulative;
      troughMonth = m.monthLabel;
    }
    if (m.cumulative < 0) negativeMonths++;
    if (m.inflow > 0) monthsWithInflow++;
  }
  if (!months.length) {
    peak = openingBalance;
    trough = openingBalance;
  }

  return {
    totalInflow,
    totalOutflow,
    netCashflow,
    endingBalance,
    peakBalance: peak,
    peakBalanceMonth: peakMonth,
    minBalance: trough,
    minBalanceMonth: troughMonth,
    negativeMonths,
    monthsWithInflow,
  };
}

/**
 * Compute the opening balance for `targetYearCE` by chaining net cashflow
 * forward (or backward) from an anchor year where balance is known.
 *
 *   openingBalance[targetYear] = anchorAmount + Σ netCashflow[y] for y in [anchorYear, targetYear-1]
 *
 * Special cases:
 *   - target === anchor → returns anchorAmount as-is
 *   - target < anchor → walks backward, *subtracting* each prior year's net
 *     (i.e. running the chain in reverse). This lets the user view earlier
 *     years if they entered transactions retroactively.
 */
export function computeChainedOpeningBalance(
  targetYearCE: number,
  anchorYearCE: number,
  anchorAmount: number,
  projects: Project[],
  positions: PositionRate[],
  overheads: OverheadItem[],
  options: Omit<CashflowOptions, "openingBalance"> = {}
): number {
  if (targetYearCE === anchorYearCE) return anchorAmount;

  let balance = anchorAmount;
  if (targetYearCE > anchorYearCE) {
    // Chain forward: compute year by year and accumulate ending balance
    for (let y = anchorYearCE; y < targetYearCE; y++) {
      const window = computeYearWindow(y);
      const months = computeCashflow(projects, positions, overheads, window, {
        ...options,
        openingBalance: balance,
      });
      if (months.length) balance = months[months.length - 1].cumulative;
    }
  } else {
    // Chain backward: subtract net of prior years
    for (let y = anchorYearCE - 1; y >= targetYearCE; y--) {
      const window = computeYearWindow(y);
      const months = computeCashflow(projects, positions, overheads, window, {
        ...options,
        openingBalance: 0, // we only care about delta (net)
      });
      const netCashflow = months.reduce((s, m) => s + m.net, 0);
      balance -= netCashflow;
    }
  }
  return balance;
}
