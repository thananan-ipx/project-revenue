"use client";

import React from "react";
import { Project, PositionRate, ProjectPositionAllocation } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Users, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LaborPlannerProps {
  project: Project;
  positions: PositionRate[];
  onUpdateProject: (updated: Project) => void;
  onUpdatePosition: (pos: PositionRate) => void;
}

export function LaborPlanner({
  project,
  positions,
  onUpdateProject,
  onUpdatePosition,
}: LaborPlannerProps) {

  // Format currency
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
  };

  const handleWorkingDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 20;
    
    // Update project
    const updatedProject = {
      ...project,
      workingDaysPerMonth: val,
    };

    // Recalculate daily rates for standard positions that are NOT custom rate
    const updatedPositions = positions.map((pos) => {
      if (!pos.isCustomRate) {
        return {
          ...pos,
          dailyRate: Math.round(pos.salary / val),
        };
      }
      return pos;
    });

    onUpdateProject(updatedProject);
    // Update all non-custom positions rates in parent state
    updatedPositions.forEach((pos) => onUpdatePosition(pos));
  };

  // Allocation Updates
  const handleMandayChange = (positionId: string, value: string) => {
    const raw = parseFloat(value) || 0;
    const mandays = Math.max(0, raw); // ป้องกันค่าติดลบ
    const existingIndex = project.allocations.findIndex((a) => a.positionId === positionId);

    const updatedAllocations = [...project.allocations];

    if (existingIndex > -1) {
      updatedAllocations[existingIndex] = {
        ...updatedAllocations[existingIndex],
        mandays,
      };
    } else {
      updatedAllocations.push({
        positionId,
        mandays,
      });
    }

    onUpdateProject({
      ...project,
      allocations: updatedAllocations,
    });
  };

  const handleCustomRateChange = (positionId: string, value: string) => {
    const customRate = value === "" ? undefined : parseFloat(value);
    const existingIndex = project.allocations.findIndex((a) => a.positionId === positionId);

    const updatedAllocations = [...project.allocations];

    if (existingIndex > -1) {
      updatedAllocations[existingIndex] = {
        ...updatedAllocations[existingIndex],
        customDailyRate: customRate,
      };
    } else {
      updatedAllocations.push({
        positionId,
        mandays: 0,
        customDailyRate: customRate,
      });
    }

    onUpdateProject({
      ...project,
      allocations: updatedAllocations,
    });
  };

  // Get current allocation for a position
  const getAlloc = (posId: string): ProjectPositionAllocation => {
    return (
      project.allocations.find((a) => a.positionId === posId) || {
        positionId: posId,
        mandays: 0,
      }
    );
  };

  // คำนวณ fully-loaded daily rate (ตรงกับสูตรใน calculations.ts)
  // = baseDailyRate × (1 + benefit%) + (socialSecurity / workingDays)
  const computeFullyLoadedRate = (pos: PositionRate, baseOverride?: number) => {
    const base = baseOverride !== undefined ? baseOverride : pos.dailyRate;
    const benefitMul = 1 + ((pos.benefitPercent ?? 0) / 100);
    const ssoDaily = (pos.socialSecurityAmount ?? 0) / (project.workingDaysPerMonth || 20);
    return base * benefitMul + ssoDaily;
  };

  // Calculate totals (ใช้ fully-loaded rate ให้ตรงกับ Dashboard)
  const totalMandays = project.allocations.reduce((sum, a) => sum + a.mandays, 0);
  const totalLaborCost = project.allocations.reduce((sum, a) => {
    const pos = positions.find((p) => p.id === a.positionId);
    if (!pos) return sum;
    const fullyLoaded = computeFullyLoadedRate(pos, a.customDailyRate);
    return sum + a.mandays * fullyLoaded;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">วางแผนจัดสรรทีมพัฒนา (Labor & Mandays Planner)</h2>
          <p className="text-sm text-muted-foreground">
            ระบุวันทำงาน (Mandays) ของแต่ละตำแหน่งงาน และปรับแต่งราคาแรงงานรายวันสำหรับโปรเจกต์นี้
          </p>
        </div>
      </div>

      {/* Configuration Header */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> จำนวนวันทำงานต่อเดือนสำหรับโครงการนี้
              </h3>
              <p className="text-sm text-muted-foreground">
                จำนวนวันสำหรับปันส่วนหารเงินเดือนเป็นรายวัน (ค่าเริ่มต้นคือ 20 วันทำงานต่อเดือน)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="working-days" className="font-medium whitespace-nowrap">
                วันทำงานต่อเดือน:
              </Label>
              <Input
                id="working-days"
                type="number"
                min={1}
                max={31}
                value={project.workingDaysPerMonth}
                onChange={handleWorkingDaysChange}
                className="w-24 text-center font-bold text-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Allocation Grid */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg">ประมาณการจำนวนวันทำงาน (Mandays)</CardTitle>
            <CardDescription>
              ใส่จำนวน Mandays เพื่อคำนวณราคาค่าแรงงานสะสม (รายการอ้างอิงจากฐานข้อมูลหลัก Master Data)
            </CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                  <HelpCircle className="h-4.5 w-4.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  หากไม่มีบทบาทที่ต้องการแสดงในตาราง กรุณาไปที่เมนู <strong>&ldquo;ข้อมูลตำแหน่งงาน&rdquo;</strong> ในหมวด <strong>Master Data</strong> เพื่อบันทึกข้อมูลตำแหน่งงานใหม่เข้าระบบหลัก
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[26%]">ตำแหน่งงาน</TableHead>
                  <TableHead className="text-right w-[22%]">เรตจริง/วัน<br /><span className="text-[10px] font-normal text-muted-foreground">รวม benefit + SSO</span></TableHead>
                  <TableHead className="text-right w-[20%]">ระบุเรตเฉพาะ<br /><span className="text-[10px] font-normal text-muted-foreground">(ใส่ base — ระบบบวก benefit ให้)</span></TableHead>
                  <TableHead className="text-center w-[14%]">Mandays</TableHead>
                  <TableHead className="text-right w-[18%]">รวมยอดค่าแรง</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                      ไม่พบข้อมูลตำแหน่งงานหลักในระบบ กรุณาไปตั้งค่าที่เมนูข้อมูลตำแหน่งงาน
                    </TableCell>
                  </TableRow>
                ) : (
                  positions.map((pos) => {
                    const alloc = getAlloc(pos.id);
                    const baseRate = alloc.customDailyRate !== undefined ? alloc.customDailyRate : pos.dailyRate;
                    const fullyLoadedRate = computeFullyLoadedRate(pos, alloc.customDailyRate);
                    const lineCost = alloc.mandays * fullyLoadedRate;
                    const benefitPct = pos.benefitPercent ?? 0;
                    const sso = pos.socialSecurityAmount ?? 0;
                    const customPreview = alloc.customDailyRate !== undefined
                      ? computeFullyLoadedRate(pos, alloc.customDailyRate)
                      : null;

                    return (
                      <TableRow key={pos.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-semibold text-slate-800 dark:text-slate-200">
                          {pos.title}
                          <div className="text-[10px] font-normal text-muted-foreground mt-0.5">
                            base ฿{formatNumber(pos.dailyRate)} • benefit {benefitPct}% • SSO ฿{formatNumber(sso)}/ด.
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <div className="font-bold text-primary">฿{formatNumber(Math.round(fullyLoadedRate))}</div>
                          <div className="text-[10px] text-muted-foreground font-normal">
                            จาก ฿{formatNumber(baseRate)} + benefit + SSO
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            placeholder={`base ฿${pos.dailyRate}`}
                            value={alloc.customDailyRate ?? ""}
                            onChange={(e) => handleCustomRateChange(pos.id, e.target.value)}
                            className="text-right text-xs h-8 font-mono border-dashed"
                          />
                          {customPreview !== null && (
                            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                              → ฿{formatNumber(Math.round(customPreview))} fully-loaded
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            placeholder="0"
                            value={alloc.mandays || ""}
                            onChange={(e) => handleMandayChange(pos.id, e.target.value)}
                            className="text-center font-bold h-8 w-24 mx-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right font-black font-mono text-slate-800 dark:text-slate-200">
                          ฿{formatNumber(lineCost)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}

                {/* Summary Row */}
                <TableRow className="bg-muted/50 hover:bg-muted/50 font-bold border-t-2 border-border/80 text-sm">
                  <TableCell colSpan={3}>สรุปประมาณการค่าแรงสะสมโครงการ</TableCell>
                  <TableCell className="text-center text-primary font-black text-base">{totalMandays} วัน</TableCell>
                  <TableCell className="text-right text-primary font-black text-lg font-mono">
                    ฿{formatNumber(totalLaborCost)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
