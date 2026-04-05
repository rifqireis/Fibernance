import { type ChangeEvent, type InputHTMLAttributes } from "react";
export interface FileTriggerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
    buttonLabel: string;
    onFileChange?: (event: ChangeEvent<HTMLInputElement>) => void;
    buttonClassName?: string;
}
export declare const FileTrigger: import("react").ForwardRefExoticComponent<FileTriggerProps & import("react").RefAttributes<HTMLInputElement>>;
