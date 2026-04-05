import { type HTMLAttributes } from "react";
type BadgeVariant = "success" | "warning" | "error" | "neutral";
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
}
export declare const Badge: import("react").ForwardRefExoticComponent<BadgeProps & import("react").RefAttributes<HTMLSpanElement>>;
export {};
