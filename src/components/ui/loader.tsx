"use client";

export function GradientSpinner({ size = 48 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-primary/30 border-t-primary"
      style={{ width: size, height: size }}
    />
  );
}
