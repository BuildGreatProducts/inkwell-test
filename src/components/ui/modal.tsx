"use client";

import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({ isOpen, onClose, children, className, size = "md" }: ModalProps) {
  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <Fragment>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={cn(
            "w-full bg-white rounded-2xl shadow-xl",
            "transform transition-all duration-200",
            "animate-in fade-in-0 zoom-in-95",
            sizes[size],
            className
          )}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {children}
        </div>
      </div>
    </Fragment>
  );
}

export function ModalHeader({
  children,
  className,
  onClose,
}: {
  children: ReactNode;
  className?: string;
  onClose?: () => void;
}) {
  return (
    <div className={cn("px-6 py-4 border-b border-neutral-100", className)}>
      <div className="flex items-center justify-between">
        <div>{children}</div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
            aria-label="Close modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export function ModalTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn("text-lg font-semibold font-heading text-neutral-900", className)}>
      {children}
    </h2>
  );
}

export function ModalDescription({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={cn("text-sm text-neutral-500 mt-1", className)}>{children}</p>;
}

export function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-6 py-4", className)}>{children}</div>;
}

export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "px-6 py-4 border-t border-neutral-100 flex items-center justify-end gap-3",
        className
      )}
    >
      {children}
    </div>
  );
}
