import { forwardRef, type TextareaHTMLAttributes } from "react";

import { cn } from "./cn";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[96px] w-full border border-gray-300 bg-white px-3 py-2 text-sm text-black font-sans placeholder:text-gray-500 rounded-none transition-colors duration-200",
        "focus:border-black focus:outline-none focus:ring-1 focus:ring-black",
        "disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500",
        className,
      )}
      {...props}
    />
  );
});