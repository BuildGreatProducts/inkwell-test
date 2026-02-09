import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full h-10 px-3 rounded-lg border bg-white text-neutral-900 placeholder:text-neutral-400",
            "transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-50",
            error
              ? "border-error-500 focus:border-error-500 focus:ring-error-500/20"
              : "border-neutral-300 focus:border-primary-500 focus:ring-primary-500/20",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-error-600">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-sm text-neutral-500">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const textareaId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "w-full min-h-[100px] px-3 py-2.5 rounded-lg border bg-white text-neutral-900 placeholder:text-neutral-400",
            "transition-all duration-200 resize-y",
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-50",
            error
              ? "border-error-500 focus:border-error-500 focus:ring-error-500/20"
              : "border-neutral-300 focus:border-primary-500 focus:ring-primary-500/20",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-error-600">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-sm text-neutral-500">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { Input, Textarea };
