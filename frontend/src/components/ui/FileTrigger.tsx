import { forwardRef, type ChangeEvent, type InputHTMLAttributes } from "react";

import { Button } from "./Button";
import { cn } from "./cn";

export interface FileTriggerProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  buttonLabel: string;
  onFileChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  buttonClassName?: string;
}

export const FileTrigger = forwardRef<HTMLInputElement, FileTriggerProps>(function FileTrigger(
  { buttonLabel, onFileChange, className, buttonClassName, disabled, ...props },
  ref,
) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <input
        ref={ref}
        type="file"
        onChange={onFileChange}
        disabled={disabled}
        className="hidden"
        {...props}
      />
      <Button
        type="button"
        onClick={() => {
          if (disabled) {
            return;
          }

          if (typeof ref === "function") {
            return;
          }

          ref?.current?.click();
        }}
        disabled={disabled}
        variant="secondary"
        className={cn(
          "h-auto flex-1 justify-start border-2 border-dashed bg-gray-50 px-4 py-3 text-left text-sm font-semibold normal-case tracking-normal",
          buttonClassName,
        )}
      >
        {buttonLabel}
      </Button>
    </div>
  );
});