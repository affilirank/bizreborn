import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { Slot } from "@/components/ui/slot";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900 disabled:pointer-events-none disabled:opacity-60 active:scale-[0.98] cursor-pointer select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-500 text-white shadow-[0_8px_30px_-8px_rgba(99,102,241,0.7)] hover:bg-brand-400 hover:shadow-[0_12px_40px_-8px_rgba(99,102,241,0.9)]",
        emerald:
          "bg-glow-500 text-ink-950 shadow-[0_8px_30px_-8px_rgba(16,185,129,0.7)] hover:bg-glow-400",
        ghost:
          "glass text-mist hover:bg-white/10 hover:border-white/20",
        outline:
          "border border-white/15 text-mist hover:border-brand-400/60 hover:text-white hover:bg-brand-500/10",
        subtle: "bg-white/5 text-fog hover:bg-white/10 hover:text-mist",
        danger: "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25",
        link: "text-brand-300 hover:text-white underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-6 text-sm",
        lg: "h-13 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, leftIcon, rightIcon, children, disabled, asChild, ...props }, ref) => {
    const content = (
      <>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {rightIcon}
      </>
    );

    const classes = cn(buttonVariants({ variant, size }), className);

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement;
      const childContent = (child.props as { children?: React.ReactNode })?.children;
      return (
        <Slot
          className={classes}
          aria-disabled={disabled || loading}
          {...(props as React.HTMLAttributes<HTMLElement>)}
        >
          {React.cloneElement(
            child,
            {},
            <>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon}
              {childContent}
              {rightIcon}
            </>,
          )}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {content}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
