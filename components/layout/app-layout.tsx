"use client";

import React, { useState } from "react";
import { useAppState } from "@/lib/context/app-state-context";
import { Sidebar, SidebarViewId } from "@/components/project-cost/sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { AuthGate } from "@/components/auth/auth-gate";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const {
    isLoaded,
    projects,
    activeProjectId,
    setActiveProjectId,
    addProject,
    updateProject,
    deleteProject,
    duplicateProject,
    exportData,
    importData,
  } = useAppState();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Determine activeView from pathname for Sidebar highlighting
  let activeView: SidebarViewId = "projects_list";
  if (pathname === "/projects" || pathname === "/") activeView = "projects_list";
  else if (pathname.startsWith("/resource-planning")) activeView = "resource_planning";
  else if (pathname.startsWith("/analytics")) activeView = "company_analytics";
  else if (pathname.startsWith("/cashflow")) activeView = "cashflow";
  else if (pathname.startsWith("/master-data/positions")) activeView = "master_positions";
  else if (pathname.startsWith("/master-data/overheads")) activeView = "master_overheads";
  else if (pathname.startsWith("/master-data/employees")) activeView = "master_employees";
  else if (pathname.startsWith("/projects/")) {
    // Project scope views
    if (pathname.endsWith("/labor")) activeView = "labor";
    else if (pathname.endsWith("/overheads")) activeView = "overhead_alloc";
    else if (pathname.endsWith("/settings")) activeView = "quote_settings";
    else if (pathname.endsWith("/quotation")) activeView = "quote";
    else activeView = "dashboard";
  }

  const handleSelectView = (view: SidebarViewId) => {
    switch (view) {
      case "projects_list": router.push("/projects"); break;
      case "resource_planning": router.push("/resource-planning"); break;
      case "company_analytics": router.push("/analytics"); break;
      case "cashflow": router.push("/cashflow"); break;
      case "master_positions": router.push("/master-data/positions"); break;
      case "master_overheads": router.push("/master-data/overheads"); break;
      case "master_employees": router.push("/master-data/employees"); break;
      default:
        // Project views need an ID, so we stay on current or go to projects list if no active
        if (activeProjectId) {
           const basePath = `/projects/${activeProjectId}`;
           if (view === "dashboard") router.push(`${basePath}`);
           else if (view === "labor") router.push(`${basePath}/labor`);
           else if (view === "overhead_alloc") router.push(`${basePath}/overheads`);
           else if (view === "quote_settings") router.push(`${basePath}/settings`);
           else if (view === "quote") router.push(`${basePath}/quotation`);
        } else {
           router.push("/projects");
        }
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground animate-bounce">
          <span className="text-xl font-bold">฿</span>
        </div>
        <div className="text-sm font-semibold tracking-wider animate-pulse">กำลังโหลดระบบ...</div>
      </div>
    );
  }

  return (
    <AuthGate>
      <div className="flex min-h-screen bg-background text-foreground">
        {/* 1. Desktop Sidebar */}
        <aside className="hidden lg:block w-[260px] shrink-0 h-screen sticky top-0 print:hidden">
          <Sidebar
            projects={projects}
            activeProjectId={activeProjectId}
            activeView={activeView}
            onSelectProject={setActiveProjectId}
            onSelectView={handleSelectView}
            onAddProject={addProject}
            onUpdateProject={updateProject}
            onDeleteProject={deleteProject}
            onDuplicateProject={duplicateProject}
            onExportData={exportData}
            onImportData={importData}
          />
        </aside>

        {/* 2. Mobile Sidebar Drawer */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-[260px] bg-sidebar border-r border-sidebar-border print:hidden">
            <Sidebar
              projects={projects}
              activeProjectId={activeProjectId}
              activeView={activeView}
              onSelectProject={(id) => {
                setActiveProjectId(id);
                setMobileMenuOpen(false);
              }}
              onSelectView={(view) => {
                handleSelectView(view);
                setMobileMenuOpen(false);
              }}
              onAddProject={addProject}
              onUpdateProject={updateProject}
              onDeleteProject={deleteProject}
              onDuplicateProject={duplicateProject}
              onExportData={exportData}
              onImportData={importData}
            />
          </SheetContent>
        </Sheet>

        {/* 3. Main Workspace Panel */}
        <main className="flex-1 flex flex-col min-w-0 bg-muted/20">
          {/* Mobile header */}
          <header className="lg:hidden h-14 border-b border-border/60 bg-card/40 backdrop-blur-xs flex items-center px-4 sticky top-0 z-30 print:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="ml-3 text-sm font-semibold">Software Cost Pro</span>
          </header>

          <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto w-full print:p-0 print:overflow-visible">
            <div className="max-w-7xl mx-auto space-y-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </AuthGate>
  );
}
