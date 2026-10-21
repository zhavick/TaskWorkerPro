"use client";

import { cn } from "@/utils/cn";
import {
  OverlayArrow as AriaOverlayArrow,
  OverlayArrowProps as AriaOverlayArrowProps,
  Popover as AriaPopover,
  type PopoverProps as AriaPopoverProps,
} from "react-aria-components";

export interface PopoverProps extends AriaPopoverProps {}

export function Popover({ className, ...props }: PopoverProps) {
  return (
    <AriaPopover
      className={cn(
        "rounded-xl border border-gray-200 bg-white p-4 text-gray-900 shadow-xl outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 z-50",
        className,
      )}
      {...props}
    />
  );
}

export interface PopoverArrowProps extends AriaOverlayArrowProps {}

export function PopoverArrow({ className, ...props }: PopoverArrowProps) {
  return (
    <AriaOverlayArrow className={cn("group", className)} {...props}>
      <svg
        width={12}
        height={12}
        viewBox="0 0 12 12"
        className="block fill-background-100 stroke-popover-border stroke-1 group-data-[placement=bottom]:rotate-180 group-data-[placement=left]:-rotate-90 group-data-[placement=right]:rotate-90"
      >
        <path d="M0 0 L6 6 L12 0" />
      </svg>
    </AriaOverlayArrow>
  );
}
