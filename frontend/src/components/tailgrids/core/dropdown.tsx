import { cn } from "@/utils/cn";
import type { ComponentProps } from "react";
import {
  Button,
  type ButtonProps,
  Header,
  Menu,
  MenuItem,
  type MenuItemProps,
  MenuSection,
  MenuSectionProps,
  MenuTrigger,
  type MenuTriggerProps,
  Popover,
  type PopoverProps,
  Separator,
} from "react-aria-components";

export function DropdownMenu(props: MenuTriggerProps) {
  return <MenuTrigger {...props} />;
}

export function DropdownMenuTrigger({ className, ...props }: ButtonProps) {
  return <Button className={cn("outline-none", className)} {...props} />;
}

type DropdownContentProps = PopoverProps;

export function DropdownMenuContent({ children, className, ...props }: DropdownContentProps) {
  return (
    <Popover {...props}>
      <Menu
        className={cn(
          "min-w-44 overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 text-gray-900 shadow-xl outline-hidden dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 z-50",
          className,
        )}
      >
        {children}
      </Menu>
    </Popover>
  );
}

type DropdownMenuItemProps = MenuItemProps;

export function DropdownMenuItem({ className, ...props }: DropdownMenuItemProps) {
  return (
    <MenuItem
      {...props}
      className={cn(
        "group flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 outline-hidden transition hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white dark:focus:bg-gray-800 dark:focus:text-white",
        className,
      )}
    />
  );
}

export function DropdownMenuSection<T extends object>({
  className,
  ...props
}: MenuSectionProps<T>) {
  return <MenuSection {...props} className={cn("", className)} />;
}

export function DropdownMenuHeader({ className, ...props }: ComponentProps<typeof Header>) {
  return <Header {...props} className={cn("px-2.5 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500", className)} />;
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<"hr">) {
  return (
    <Separator className={cn("my-1 h-px border-none bg-gray-100 dark:bg-gray-800", className)} {...props} />
  );
}
