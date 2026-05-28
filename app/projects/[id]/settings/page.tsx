"use client";

import React, { useMemo } from "react";
import { useParams } from "next/navigation";
import { useAppState } from "@/lib/context/app-state-context";
import { QuotationSettings } from "@/components/project-cost/quotation-settings";

export default function ProjectSettingsPage() {
  const { id } = useParams();
  const { projects, companyInfo, setCompanyInfo, updateProject } = useAppState();

  const project = useMemo(() => projects.find((p) => p.id === id), [projects, id]);

  if (!project) return null;

  return (
    <QuotationSettings
      key={project.id}
      project={project}
      companyInfo={companyInfo}
      onUpdateProject={updateProject}
      onUpdateCompanyInfo={setCompanyInfo}
    />
  );
}
