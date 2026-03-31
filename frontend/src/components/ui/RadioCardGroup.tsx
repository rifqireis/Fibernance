import { Fragment } from "react";

import { cn } from "./cn";

export interface RadioCardOption {
  value: string;
  label: string;
  description?: string;
}

export interface RadioCardGroupProps {
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  options: RadioCardOption[];
  className?: string;
  optionClassName?: string;
  disabled?: boolean;
}

export function RadioCardGroup({
  name,
  value,
  onValueChange,
  options,
  className,
  optionClassName,
  disabled = false,
}: RadioCardGroupProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {options.map((option) => {
        const isChecked = option.value === value;

        return (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 border border-gray-200 px-4 py-4 rounded-none transition-colors",
              isChecked ? "border-black bg-gray-50" : "bg-white hover:bg-gray-50",
              disabled && "cursor-not-allowed opacity-60",
              optionClassName,
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={isChecked}
              onChange={() => onValueChange(option.value)}
              disabled={disabled}
              className="mt-0.5 h-4 w-4"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-black">{option.label}</span>
              {option.description ? (
                <Fragment>
                  <span className="mt-1 block text-xs text-gray-600">{option.description}</span>
                </Fragment>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}