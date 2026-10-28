"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  accent?: "primary" | "accent" | "success" | "warning" | "destructive";
  className?: string;
}

const ACCENT_STYLES: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/15 text-accent-foreground",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  destructive: "bg-red-50 text-red-700",
};

export function StatCard({ label, value, hint, icon: Icon, accent = "primary", className }: StatCardProps) {
  return (
    <Card className={cn("border-border/60 shadow-sm", className)}>
      <CardContent className="p-4 lg:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{label}</p>
            <p className="text-2xl lg:text-3xl font-bold mt-1 text-foreground tabular-nums">{value}</p>
            {hint && <p className="text-xs text-muted-foreground mt-1 truncate">{hint}</p>}
          </div>
          {Icon && (
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", ACCENT_STYLES[accent])}>
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
