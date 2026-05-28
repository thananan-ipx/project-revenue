"use client";

import React, { createContext, useContext, useCallback, useMemo } from "react";
import { useProjects } from "@/hooks/use-projects";
import { usePositions } from "@/hooks/use-positions";
import { useOverheads } from "@/hooks/use-overheads";
import { useEmployees } from "@/hooks/use-employees";
import { useCashflowSettings, CashflowSettings } from "@/hooks/use-cashflow-settings";
import { useCompanyInfo, DEFAULT_COMPANY_INFO } from "@/hooks/use-company-info";
import { useActiveProject } from "@/hooks/use-active-project";
import {
  ProjectSchema, PositionRateSchema, OverheadItemSchema, EmployeeSchema, CompanyInfoSchema,
  safeParse, safeParseArray,
} from "@/lib/schemas";
import {
  migrateProjectChain, migratePositionChain, migrateOverheadChain,
} from "@/lib/migrations";
import { Project, PositionRate, OverheadItem, Employee, CompanyInfo } from "@/lib/types";

interface AppStateContextType {
  isLoaded: boolean;
  projects: Project[];
  positions: PositionRate[];
  overheads: OverheadItem[];
  companyInfo: CompanyInfo;
  setCompanyInfo: (info: CompanyInfo) => void;
  activeProjectId: string;
  activeProject: Project | undefined;
  setActiveProjectId: (id: string) => void;
  // Project CRUD
  addProject: (name: string, description?: string) => void;
  updateProject: (updated: Project) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  // Position CRUD
  addPosition: (pos: Omit<PositionRate, "id">) => void;
  updatePosition: (updated: PositionRate) => void;
  deletePosition: (id: string) => void;
  // Overhead CRUD
  addOverhead: (item: Omit<OverheadItem, "id">) => void;
  updateOverhead: (updated: OverheadItem) => void;
  deleteOverhead: (id: string) => void;
  // Employee CRUD
  employees: Employee[];
  addEmployee: (item: Omit<Employee, "id">) => void;
  updateEmployee: (updated: Employee) => void;
  deleteEmployee: (id: string) => void;
  // Cashflow settings (anchor for balance carryover)
  cashflowSettings: CashflowSettings;
  setCashflowSettings: (s: CashflowSettings) => void;
  // Export/Import
  exportData: () => void;
  importData: (jsonDataStr: string) => boolean;
}

const AppStateContext = createContext<AppStateContextType | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const {
    projects,
    hydrated: projectsHydrated,
    addProject: addProjectRaw,
    updateProject,
    deleteProject: deleteProjectRaw,
    duplicateProject: duplicateProjectRaw,
    replaceAllProjects,
    cleanupPositionReferences,
  } = useProjects();

  const positionsApi = usePositions();
  const { positions, deletePosition: deletePositionRaw, replaceAllPositions } = positionsApi;

  const overheadsApi = useOverheads();
  const { overheads, replaceAllOverheads } = overheadsApi;

  const employeesApi = useEmployees();
  const { employees, replaceAllEmployees } = employeesApi;

  const { cashflowSettings, setCashflowSettings, hydrated: cashflowHydrated } = useCashflowSettings();

  const { companyInfo, setCompanyInfo, hydrated: companyHydrated } = useCompanyInfo();

  const { activeProjectId, activeProject, setActiveProjectId } = useActiveProject(
    projects,
    projectsHydrated
  );

  // Cross-cutting actions
  const addProject = useCallback(
    (name: string, description?: string) => {
      const newProject = addProjectRaw(name, description);
      setActiveProjectId(newProject.id);
    },
    [addProjectRaw, setActiveProjectId]
  );

  const deleteProject = useCallback(
    (id: string) => {
      deleteProjectRaw(id);
      if (activeProjectId === id) {
        const remaining = projects.filter((p) => p.id !== id);
        setActiveProjectId(remaining.length > 0 ? remaining[0].id : "");
      }
    },
    [deleteProjectRaw, activeProjectId, projects, setActiveProjectId]
  );

  const duplicateProject = useCallback(
    (id: string) => {
      const duplicated = duplicateProjectRaw(id);
      if (duplicated) setActiveProjectId(duplicated.id);
    },
    [duplicateProjectRaw, setActiveProjectId]
  );

  const deletePosition = useCallback(
    (id: string) => {
      deletePositionRaw(id);
      cleanupPositionReferences(id);
    },
    [deletePositionRaw, cleanupPositionReferences]
  );

  const exportData = useCallback(() => {
    const dataStr = JSON.stringify({ projects, positions, overheads, employees, companyInfo, cashflowSettings });
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const filename = `software_cost_estimation_backup_${new Date().toISOString().split("T")[0]}.json`;
    const link = document.createElement("a");
    link.setAttribute("href", dataUri);
    link.setAttribute("download", filename);
    link.click();
  }, [projects, positions, overheads, employees, companyInfo, cashflowSettings]);

  const importData = useCallback(
    (jsonDataStr: string): boolean => {
      try {
        const parsed = JSON.parse(jsonDataStr);
        if (!parsed?.projects || !parsed?.positions || !parsed?.overheads) {
          return false;
        }
        const rawProjects = Array.isArray(parsed.projects) ? parsed.projects : [];
        const rawPositions = Array.isArray(parsed.positions) ? parsed.positions : [];
        const rawOverheads = Array.isArray(parsed.overheads) ? parsed.overheads : [];

        const migratedProjects = rawProjects.map((p: Record<string, unknown>) =>
          migrateProjectChain(p, 1)
        );
        const migratedPositions = rawPositions.map((p: Record<string, unknown>) =>
          migratePositionChain(p, 1)
        );
        const migratedOverheads = rawOverheads.map((o: Record<string, unknown>) =>
          migrateOverheadChain(o, 1)
        );

        replaceAllProjects(safeParseArray(ProjectSchema, migratedProjects, "import.projects"));
        replaceAllPositions(safeParseArray(PositionRateSchema, migratedPositions, "import.positions"));
        replaceAllOverheads(safeParseArray(OverheadItemSchema, migratedOverheads, "import.overheads"));
        if (Array.isArray(parsed.employees)) {
          replaceAllEmployees(safeParseArray(EmployeeSchema, parsed.employees, "import.employees"));
        }
        if (parsed.companyInfo) {
          setCompanyInfo(
            safeParse(CompanyInfoSchema, parsed.companyInfo, DEFAULT_COMPANY_INFO, "import.companyInfo")
          );
        }
        if (Array.isArray(parsed.projects) && parsed.projects.length > 0) {
          setActiveProjectId(parsed.projects[0].id);
        }
        return true;
      } catch (e) {
        console.error("[AppStateProvider] importData failed:", e);
        return false;
      }
    },
    [replaceAllProjects, replaceAllPositions, replaceAllOverheads, replaceAllEmployees, setCompanyInfo, setActiveProjectId]
  );

  const isLoaded = projectsHydrated && companyHydrated && positionsApi.hydrated && overheadsApi.hydrated && employeesApi.hydrated && cashflowHydrated;

  const value = useMemo(() => ({
    isLoaded,
    projects,
    positions,
    overheads,
    employees,
    companyInfo,
    setCompanyInfo,
    activeProjectId,
    activeProject,
    setActiveProjectId,
    addProject,
    updateProject,
    deleteProject,
    duplicateProject,
    addPosition: positionsApi.addPosition,
    updatePosition: positionsApi.updatePosition,
    deletePosition,
    addOverhead: overheadsApi.addOverhead,
    updateOverhead: overheadsApi.updateOverhead,
    deleteOverhead: overheadsApi.deleteOverhead,
    addEmployee: employeesApi.addEmployee,
    updateEmployee: employeesApi.updateEmployee,
    deleteEmployee: employeesApi.deleteEmployee,
    cashflowSettings,
    setCashflowSettings,
    exportData,
    importData,
  }), [
    isLoaded, projects, positions, overheads, employees, companyInfo, setCompanyInfo,
    activeProjectId, activeProject, setActiveProjectId, addProject, updateProject,
    deleteProject, duplicateProject, positionsApi.addPosition, positionsApi.updatePosition,
    deletePosition, overheadsApi.addOverhead, overheadsApi.updateOverhead,
    overheadsApi.deleteOverhead, employeesApi.addEmployee, employeesApi.updateEmployee,
    employeesApi.deleteEmployee, cashflowSettings, setCashflowSettings, exportData, importData
  ]);

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return context;
}
