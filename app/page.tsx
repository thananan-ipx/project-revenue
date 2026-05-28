"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/projects");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground animate-bounce">
        <span className="text-xl font-bold">฿</span>
      </div>
    </div>
  );
}
