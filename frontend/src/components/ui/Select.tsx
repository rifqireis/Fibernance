import { forwardRef, type SelectHTMLAttributes } from "react";

import { cn } from "./cn";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "h-10 w-full appearance-none border border-gray-300 bg-white px-3 pr-10 text-sm text-black font-sans rounded-none transition-colors duration-200 cursor-pointer",
          "focus:border-black focus:outline-none focus:ring-1 focus:ring-black",
          "disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
});