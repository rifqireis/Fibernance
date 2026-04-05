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
export declare function RadioCardGroup({ name, value, onValueChange, options, className, optionClassName, disabled, }: RadioCardGroupProps): import("react/jsx-runtime").JSX.Element;
