import { cn } from "@/utils/cn";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import {
  Button as AriaButton,
  Dialog as AriaDialog,
  Modal as AriaModal,
  Heading,
  type DialogProps as AriaDialogProps,
  type HeadingProps,
} from "react-aria-components";
import { Button, ButtonProps } from "./button";
import { Description, DescriptionProps } from "./description";

export interface DialogProps extends AriaDialogProps {
  isOpen?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  showCloseButton?: boolean;
}

export function Dialog({
  isOpen,
  open,
  defaultOpen,
  onOpenChange,
  className,
  showCloseButton = true,
  children,
  ...props
}: DialogProps) {
  const isModalOpen = isOpen ?? open;
  return (
    <AriaModal
      isOpen={isModalOpen}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-hidden"
    >
      <AriaDialog
        className={cn(
          "relative flex flex-col w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-2xl outline-none transition-all",
          // MOBILE: Full 1 Halaman Penuh tanpa modal popup yang terpotong per permintaan pengguna!
          "max-sm:!fixed max-sm:!inset-0 max-sm:!w-full max-sm:!h-[100dvh] max-sm:!max-w-none max-sm:!max-h-none max-sm:!rounded-none max-sm:!border-0 max-sm:!p-4 max-sm:!m-0 max-sm:!overflow-hidden max-sm:!top-0 max-sm:!left-0 max-sm:!translate-x-0 max-sm:!translate-y-0",
          // DESKTOP: Centered, rounded-2xl, max-h 92vh, flex flex-col
          "sm:max-h-[92vh] sm:max-w-xl sm:rounded-2xl sm:border sm:border-gray-200 sm:dark:border-gray-800 sm:p-6",
          className,
        )}
        {...props}
      >
        {({ close }) => (
          <>
            {showCloseButton && (
              <AriaButton
                onPress={close}
                aria-label="Tutup Dialog"
                className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100/90 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-800/90 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white shadow-xs ring-1 ring-black/5 dark:ring-white/10 transition-transform active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 cursor-pointer"
              >
                <X className="h-4.5 w-4.5 stroke-[2.5]" />
                <span className="sr-only">Tutup</span>
              </AriaButton>
            )}
            {typeof children === "function" ? children({ close }) : children}
          </>
        )}
      </AriaDialog>
    </AriaModal>
  );
}

export interface DialogContentProps extends ComponentProps<"div"> {}

export function DialogContent({ className, children, ...props }: DialogContentProps) {
  return (
    <div
      data-slot="dialog-content"
      className={cn(
        "flex flex-col flex-1 h-full min-h-0 w-full overflow-y-auto space-y-4 pr-1",
        "max-sm:!max-w-none max-sm:!max-h-none max-sm:!w-full max-sm:!h-full",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface DialogHeaderProps extends ComponentProps<"div"> {}

export function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex flex-col gap-1.5 text-left shrink-0 pr-10 sm:pr-12",
        className,
      )}
      {...props}
    />
  );
}

export interface DialogTitleProps extends HeadingProps {
  className?: string;
}

export function DialogTitle({ className, ...props }: DialogTitleProps) {
  return (
    <Heading
      slot="title"
      className={cn("text-lg leading-snug font-bold text-gray-900 dark:text-white", className)}
      {...props}
    />
  );
}

export interface DialogDescriptionProps extends DescriptionProps {}

export function DialogDescription({ ...props }: DialogDescriptionProps) {
  return <Description {...props} />;
}

export interface DialogBodyProps extends ComponentProps<"div"> {}

export function DialogBody({ className, ...props }: DialogBodyProps) {
  return (
    <div
      data-slot="dialog-body"
      className={cn("flex-1 min-h-0 overflow-y-auto py-2 text-sm text-gray-600 dark:text-gray-300", className)}
      {...props}
    />
  );
}

export interface DialogFooterProps extends ComponentProps<"div"> {
  showCloseButton?: boolean;
}

export function DialogFooter({ className, children, ...props }: DialogFooterProps) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end shrink-0 border-t border-gray-100 dark:border-gray-800 mt-auto",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface DialogCloseProps extends Omit<ButtonProps, "slot"> {}

export function DialogClose({ ...props }: DialogCloseProps) {
  return <Button slot="close" {...props} />;
}
