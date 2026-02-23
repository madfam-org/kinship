import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "inner" | "polycule" | "outer" | "fof"
}

const badgeVariants = ({ variant = "default", className = "" }: any) => {
  const base = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
  
  const variants: Record<string, string> = {
    default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground",
    inner: "border-transparent bg-trust-inner text-white shadow-sm",
    polycule: "border-transparent bg-trust-polycule text-white shadow-sm",
    outer: "border-transparent bg-trust-outer text-white shadow-sm",
    fof: "border-transparent bg-trust-fof text-white shadow-sm",
  }

  return cn(base, variants[variant], className)
}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
