"use client";

import { PanelLeftIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

export function StudioHeader({
  title,
  icon,
}: {
  title: string;
  icon: ReactNode;
}) {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-border/50 border-b bg-sidebar px-3">
      <Button
        className="md:hidden"
        onClick={toggleSidebar}
        size="icon-sm"
        variant="ghost"
      >
        <PanelLeftIcon className="size-4" />
      </Button>
      <div className="flex items-center gap-2 font-medium text-sm">
        {icon}
        {title}
      </div>
    </header>
  );
}
