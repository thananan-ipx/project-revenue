export interface PositionRate {
  id: string;
  title: string;
  salary: number;
  dailyRate: number;
  isCustomRate: boolean;
  // จำนวนพนักงานจริงในตำแหน่งนี้ (ใช้คำนวณ capacity ของบริษัท)
  headcount: number;
  // % สวัสดิการ/ภาษีนายจ้าง (โบนัส, กองทุน, อื่นๆ) บวกเข้าต้นทุนแรงงานจริง
  benefitPercent: number;
  // ค่าประกันสังคม (บาท/เดือน/คน) — มาตรฐานไทยฝั่งนายจ้าง 5% ของฐาน max 750
  socialSecurityAmount: number;
}

export interface OverheadItem {
  id: string;
  name: string;
  cost: number;
  period: 'monthly' | 'yearly';
  // วันที่เริ่มมีผล (ISO yyyy-mm-dd) — โปรเจกต์ที่ quotationDate < effectiveFrom จะไม่ใช้รายการนี้
  effectiveFrom: string;
  // วันที่สิ้นสุด (ISO yyyy-mm-dd, optional) — null/undefined = ยังใช้อยู่ในปัจจุบัน
  effectiveTo?: string;
}

// ====================================================
// Employee — actual person on payroll
// (different from PositionRate which is a *rate template*)
// ====================================================
export interface Employee {
  id: string;
  name: string;
  // ผูกกับตำแหน่ง (optional) เพื่อ reporting/วิเคราะห์
  positionId?: string;
  // เงินเดือนพื้นฐาน (บาท/เดือน)
  monthlySalary: number;
  // % สวัสดิการ/ภาษีนายจ้าง บวกเข้าต้นทุนจริง
  benefitPercent: number;
  // ค่าประกันสังคม (บาท/เดือน) ที่นายจ้างจ่าย
  socialSecurityAmount: number;
  // วันที่เริ่มงาน (ISO yyyy-mm-dd)
  startDate: string;
  // วันที่ลาออก (optional) — null/undefined = ยังทำงานอยู่
  endDate?: string;
  // โบนัสประจำปี (บาท) — จ่ายเดือน 12 ของแต่ละปี
  annualBonus?: number;
  notes?: string;
}

export interface ProjectPositionAllocation {
  positionId: string;
  mandays: number;
  customDailyRate?: number;
}

export interface DirectCostItem {
  id: string;
  name: string;
  cost: number;
  category?: 'license' | 'hosting' | 'outsource' | 'travel' | 'other';
}

export type ProjectStatus = 'draft' | 'quoted' | 'won' | 'lost' | 'in_progress' | 'completed';

export type PricingMode = 'cost_plus' | 'fixed_price';

export interface ClientInfo {
  name: string;
  taxId?: string;          // เลขผู้เสียภาษี 13 หลัก
  address?: string;
  contactPerson?: string;  // ชื่อผู้ติดต่อ
  contactEmail?: string;
  contactPhone?: string;
}

export interface CompanyInfo {
  name: string;
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  // ผู้ลงนามฝั่งบริษัทออกใบเสนอราคา
  signerName?: string;
  signerTitle?: string;
}

export interface PaymentInstallment {
  id: string;
  name: string;              // เช่น "Deposit", "Milestone 1", "On Delivery"
  percent: number;           // % ของยอดราคารวม
  dueAfterDays: number;      // ครบกำหนดหลังเซ็นสัญญา X วัน (0 = ทันที)
  description?: string;
  // ผูกกับ phase id ถ้าต้องการ (เฟส 2B)
  phaseId?: string;
}

export interface PaymentTerms {
  installments: PaymentInstallment[];
  // จำนวนวันที่ลูกค้าต้องชำระหลังออกใบแจ้งหนี้
  paymentDueDays: number;
  // ค่าปรับล่าช้า % ต่อเดือน
  lateFeePercent: number;
  notes?: string;
}

export interface ProjectPhase {
  id: string;
  name: string;              // เช่น "Design Phase", "Development Sprint 1"
  description?: string;
  // % ของ mandays ทั้งหมดของโปรเจกต์ที่ใช้ใน phase นี้
  // (วิธีนี้ง่ายและ flexible กว่า assign mandays ต่อตำแหน่งต่อ phase)
  mandayPercent: number;
  // กำหนดส่งมอบ (optional)
  milestoneDate?: string;    // ISO yyyy-mm-dd
  // ผลลัพธ์ที่ส่งมอบใน phase นี้
  deliverables: string[];
}

export type ScenarioId = 'best' | 'realistic' | 'worst';

export interface Scenario {
  id: ScenarioId;
  // ตัวคูณกับ mandays ทั้งหมดในสถานการณ์นี้
  mandayMultiplier: number;
  // override markup % (ถ้าเว้นว่าง = ใช้ markup หลักของโปรเจกต์)
  markupOverride?: number;
  // override contingency % (ถ้าเว้นว่าง = ใช้ contingency หลัก)
  contingencyOverride?: number;
  notes?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  // วันที่ออกใบเสนอราคา — ใช้กรอง overheads ที่ active ในช่วงนั้น
  quotationDate: string;
  // วันที่เริ่มงานจริง (ใช้ใน Resource Planning) — ถ้าเว้นว่างจะใช้ quotationDate
  startDate?: string;
  // เลขที่ใบเสนอราคา
  quotationNumber?: string;
  // วันหมดอายุของราคา
  validUntil?: string;
  workingDaysPerMonth: number;
  durationMonths: number;
  allocations: ProjectPositionAllocation[];
  directCosts: DirectCostItem[];
  overheadAllocationMethod: 'proportional' | 'percentage' | 'fixed';
  overheadAllocationValue: number;
  contingencyPercent: number;
  // โหมดการกำหนดราคา:
  // - cost_plus: priceBeforeTax = ต้นทุน × (1 + markupPercentage%)
  // - fixed_price: priceBeforeTax = fixedPrice (ขายเหมา)
  pricingMode: PricingMode;
  // ราคาขายโครงการ (ก่อน VAT) — ใช้เมื่อ pricingMode = fixed_price
  fixedPrice: number;
  // % markup — ใช้เมื่อ pricingMode = cost_plus
  markupPercentage: number;
  taxRate: number;
  withholdingTaxPercent: number;
  status: ProjectStatus;
  // ข้อมูลลูกค้า (เปลี่ยนจาก clientName เป็น object เต็ม)
  client: ClientInfo;
  // เงื่อนไขการชำระเงิน
  paymentTerms: PaymentTerms;
  // เฟสและ milestones
  phases: ProjectPhase[];
  // สถานการณ์เปรียบเทียบ
  scenarios?: Scenario[];
}
