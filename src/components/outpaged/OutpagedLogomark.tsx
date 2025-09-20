import { cn } from "@/lib/utils";

interface OutpagedLogomarkProps {
  className?: string;
  "aria-hidden"?: boolean;
}

export function OutpagedLogomark({ className, "aria-hidden": ariaHidden = true }: OutpagedLogomarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-hidden={ariaHidden}
      className={cn("h-9 w-9", className)}
    >
      <defs>
        <linearGradient id="outpaged-logomark-gradient" x1="9" x2="42" y1="42" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff7a00" />
          <stop offset="1" stopColor="#ff9f4d" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="24" fill="url(#outpaged-logomark-gradient)" />
      <path
        fill="#fff"
        d="M28.58 8.33c-5.86-1.73-12.28.91-15.1 6.04-3.47 6.34-.75 13.9 6.03 17.86 2.24 1.31 1.37 4.68-1.19 4.96-3.69.4-6.47-1.5-8.23-3.53 2.18 6.89 8.66 11.54 16.05 11.1 8.77-.53 15.63-8.15 15.11-17.06-.36-6.24-3.94-11.37-9.13-13.96-2.58-1.28-1.73-5.13 1.19-5.72 2.67-.54 4.95.26 6.68 1.36-2.24-3.58-5.55-6.16-9.41-7.05Z"
      />
      <path
        fill="#ff7a00"
        d="M30.18 14.32c-3.68-2.13-8.42-1.2-10.78 2.05-2.64 3.63-1.3 8.42 2.99 10.99 1.24.75.55 2.64-.86 2.65-2.56.02-4.32-1.22-5.43-2.55 1.4 4.14 5.09 6.99 9.36 6.9 5.14-.11 9.27-4.23 9.08-9.28-.13-3.46-2.03-6.4-4.96-7.93-1.58-.84-1.09-3.4.87-3.79 1.76-.34 3.16.24 4.31 1.03-1.45-2.46-3.66-4.19-6.58-5.07Z"
      />
    </svg>
  );
}
