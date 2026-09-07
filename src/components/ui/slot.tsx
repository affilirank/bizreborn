import * as React from "react";
import { cn } from "@/lib/utils";

export interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
}

export const Slot = React.forwardRef<HTMLElement, SlotProps>(
  ({ children, ...props }, ref) => {
    if (!React.isValidElement(children)) return null;
    const child = children as React.ReactElement<
      React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> }
    >;
    return React.cloneElement(child, {
      ...props,
      ...child.props,
      className: cn(child.props.className, props.className),
      ref,
    });
  },
);
Slot.displayName = "Slot";
