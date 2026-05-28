"use client";

import React, { useRef } from "react";
import { Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Briefcase, Landmark, Users,
  Download, Upload, Moon, Sun, Laptop, DollarSign,
  FolderKanban, CalendarRange, LogOut, User as UserIcon, Banknote,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export type SidebarViewId =
  | "projects_list"
  | "dashboard"
  | "labor"
  | "overhead_alloc"
  | "quote_settings"
  | "quote"
  | "resource_planning"
  | "company_analytics"
  | "cashflow"
  | "master_positions"
  | "master_overheads"
  | "master_employees";

const PROJECT_SCOPE_VIEWS: SidebarViewId[] = [
  "projects_list",
  "dashboard",
  "labor",
  "overhead_alloc",
  "quote_settings",
  "quote",
];

interface SidebarProps {
  projects: Project[];
  activeProjectId: string;
  activeView: SidebarViewId;
  onSelectProject: (id: string) => void;
  onSelectView: (view: SidebarViewId) => void;
  onAddProject: (name: string, description?: string) => void;
  onUpdateProject: (updated: Project) => void;
  onDeleteProject: (id: string) => void;
  onDuplicateProject: (id: string) => void;
  onExportData: () => void;
  onImportData: (dataStr: string) => boolean;
}

export function Sidebar({
  activeView,
  onSelectView,
  onExportData,
  onImportData,
}: SidebarProps) {
  const { setTheme, theme } = useTheme();
  const { user, mode, signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isProjectFlow = PROJECT_SCOPE_VIEWS.includes(activeView);

  const handleSignOut = async () => {
    await signOut();
    toast.success("ออกจากระบบเรียบร้อย");
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const success = onImportData(result);
      if (success) toast.success("นำเข้าข้อมูลสำรองเรียบร้อยแล้ว!");
      else toast.error("รูปแบบไฟล์ไม่ถูกต้อง");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Brand */}
      <div className="flex h-16 items-center px-6 gap-2.5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <DollarSign className="h-5 w-5 font-black" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm leading-none tracking-tight">Software Cost Pro</span>
          <span className="text-[10px] text-muted-foreground mt-0.5">ระบบวิเคราะห์และคำนวณต้นทุน</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <Button
          variant={isProjectFlow ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onSelectView("projects_list")}
          className="w-full justify-start text-sm font-semibold h-11 gap-2.5 px-3"
        >
          <FolderKanban className="h-4 w-4 shrink-0 text-muted-foreground" />
          จัดการโครงการ
        </Button>

        <Button
          variant={activeView === "resource_planning" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onSelectView("resource_planning")}
          className="w-full justify-start text-sm font-semibold h-11 gap-2.5 px-3"
        >
          <CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground" />
          Resource Planning
        </Button>

        <Button
          variant={activeView === "company_analytics" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onSelectView("company_analytics")}
          className="w-full justify-start text-sm font-semibold h-11 gap-2.5 px-3"
        >
          <Landmark className="h-4 w-4 shrink-0 text-muted-foreground" />
          Company Analytics
        </Button>

        <Button
          variant={activeView === "cashflow" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onSelectView("cashflow")}
          className="w-full justify-start text-sm font-semibold h-11 gap-2.5 px-3"
        >
          <Banknote className="h-4 w-4 shrink-0 text-muted-foreground" />
          Cashflow
        </Button>

        <Button
          variant={activeView === "master_positions" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onSelectView("master_positions")}
          className="w-full justify-start text-sm font-semibold h-11 gap-2.5 px-3"
        >
          <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
          ข้อมูลเรตตำแหน่งงาน
        </Button>

        <Button
          variant={activeView === "master_employees" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onSelectView("master_employees")}
          className="w-full justify-start text-sm font-semibold h-11 gap-2.5 px-3"
        >
          <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
          รายชื่อพนักงาน
        </Button>

        <Button
          variant={activeView === "master_overheads" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onSelectView("master_overheads")}
          className="w-full justify-start text-sm font-semibold h-11 gap-2.5 px-3"
        >
          <Landmark className="h-4 w-4 shrink-0 text-muted-foreground" />
          ค่าใช้จ่ายส่วนกลาง
        </Button>
      </nav>

      {/* Footer: User + Backup + Theme */}
      <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/10 space-y-3">
        {/* User block — แสดงเฉพาะเมื่อ login ผ่าน Supabase */}
        {mode === "supabase" && user && (
          <div className="flex items-center gap-2 pb-3 border-b border-sidebar-border/40">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <UserIcon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold truncate" title={user.email ?? ""}>
                {user.email}
              </div>
              <div className="text-[9px] text-muted-foreground">Cloud sync</div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="h-6 w-6 shrink-0"
              title="ออกจากระบบ"
            >
              <LogOut className="h-3 w-3" />
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="xs"
            onClick={onExportData}
            className="text-[10px] h-8 gap-1 w-full border-sidebar-border/80 bg-sidebar"
          >
            <Download className="h-3 w-3 text-muted-foreground" /> Export
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={handleImportClick}
            className="text-[10px] h-8 gap-1 w-full border-sidebar-border/80 bg-sidebar"
          >
            <Upload className="h-3 w-3 text-muted-foreground" /> Import
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
        </div>

        <div className="flex items-center justify-between pt-1 text-xs border-t border-sidebar-border/40">
          <span className="text-muted-foreground">ธีม:</span>
          <div className="flex items-center gap-0.5 rounded-lg border border-sidebar-border p-0.5 bg-sidebar">
            <Button
              size="icon"
              variant={theme === "light" ? "secondary" : "ghost"}
              onClick={() => setTheme("light")}
              className="h-6 w-6"
            >
              <Sun className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant={theme === "dark" ? "secondary" : "ghost"}
              onClick={() => setTheme("dark")}
              className="h-6 w-6"
            >
              <Moon className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant={theme === "system" ? "secondary" : "ghost"}
              onClick={() => setTheme("system")}
              className="h-6 w-6"
            >
              <Laptop className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
