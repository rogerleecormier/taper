import * as React from "react";
import { cn } from "~/lib/utils";

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Logo({ iconOnly = false, size = "md", className, ...props }: LogoProps) {
  const sizeClasses = {
    sm: {
      container: "gap-1.5",
      svg: "h-5 w-5",
      text: "text-sm",
    },
    md: {
      container: "gap-2.5",
      svg: "h-8 w-8",
      text: "text-xl",
    },
    lg: {
      container: "gap-3",
      svg: "h-12 w-12",
      text: "text-3xl",
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <div
      className={cn("flex items-center font-heading select-none font-bold text-foreground", currentSize.container, className)}
      {...props}
    >
      {/* Visual Tapering Funnel SVG */}
      <svg
        viewBox="0 0 100 100"
        className={cn("text-primary shrink-0 transition-transform duration-300 hover:scale-105", currentSize.svg)}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Raw Monthly Income - Wide Translucent Wedge */}
        <polygon
          points="8,16 92,16 76,42 24,42"
          fill="currentColor"
          className="opacity-25"
        />
        {/* Controlled Allocations - Middle Wedge */}
        <polygon
          points="24,42 76,42 63,68 37,68"
          fill="currentColor"
          className="opacity-55"
        />
        {/* Precision Target Bucket - Sharp Bottom Wedge/Point */}
        <polygon
          points="37,68 63,68 50,92"
          fill="currentColor"
          className="opacity-95 text-accent"
        />
      </svg>

      {!iconOnly && (
        <span className={cn("tracking-tight font-extrabold flex items-baseline gap-0.5", currentSize.text)}>
          Taper
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
        </span>
      )}
    </div>
  );
}

export function LogoIcon({ className, ...props }: Omit<LogoProps, "iconOnly">) {
  return <Logo iconOnly size="md" className={className} {...props} />;
}
