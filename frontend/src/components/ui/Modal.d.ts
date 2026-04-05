import { type ReactNode } from "react";
export interface ModalProps {
    open: boolean;
    title?: string;
    description?: string;
    children: ReactNode;
    footer?: ReactNode;
    onClose?: () => void;
    className?: string;
    contentClassName?: string;
    overlayClassName?: string;
    closeOnOverlayClick?: boolean;
    showCloseButton?: boolean;
}
export declare function Modal({ open, title, description, children, footer, onClose, className, contentClassName, overlayClassName, closeOnOverlayClick, showCloseButton, }: ModalProps): import("react").ReactPortal | null;
