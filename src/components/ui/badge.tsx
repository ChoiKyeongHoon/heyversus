import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-[#ff8c00] to-[#ff6b00] text-white hover:from-[#ff6b00] hover:to-[#ff5500] shadow-sm",
        secondary:
          "border-transparent bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground hover:from-secondary/90 hover:to-secondary/70",
        destructive:
          "border-transparent bg-gradient-to-r from-[#e53e3e] to-[#c53030] text-white hover:from-[#c53030] hover:to-[#9b2c2c] shadow-sm",
        outline: "text-foreground border-2",
        success:
          "border-transparent bg-gradient-to-r from-[#38a169] to-[#2f855a] text-white hover:from-[#2f855a] hover:to-[#276749] shadow-sm",
        warning:
          "border-transparent bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white hover:from-[#d97706] hover:to-[#b45309] shadow-sm",
        info: "border-transparent bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white hover:from-[#2563eb] hover:to-[#1d4ed8] shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
