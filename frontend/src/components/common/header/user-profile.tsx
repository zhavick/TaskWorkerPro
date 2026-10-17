"use client";

import React, { useState, useEffect } from "react";
import {
  BillingIcon,
  GearIcon,
  LogoutIcon,
  UserCircleIcon,
} from "@/components/common/header/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/tailgrids/core/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuHeader,
  DropdownMenuItem,
  DropdownMenuSection,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/tailgrids/core/dropdown";
import { AltArrowDownIcon } from "@/utils/icon";
import Link from "next/link";

import { HelpCircle, Sparkles } from "lucide-react";

interface UserProfileMenuItem {
  href?: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
}

const user: UserProfile = {
  name: "Jhon Smith",
  email: "jhonsmith@example.com",
  avatarUrl: "/images/user/jhon-smith.png",
};

export function UserProfileButton() {
  const [currentUser, setCurrentUser] = React.useState<UserProfile>({
    name: "Pengguna",
    email: "user@trackerkerja.com",
    avatarUrl: "/images/user/jhon-smith.png",
  });

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("user_profile");
      if (stored) {
        const u = JSON.parse(stored);
        setCurrentUser({
          name: u.fullName || "Pengguna",
          email: u.email || "user@trackerkerja.com",
          avatarUrl: u.profilePictureUrl || "/images/user/jhon-smith.png",
        });
      }
    } catch {}
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_profile");
    window.location.href = "/login";
  };

  const handleOpenGuide = () => {
    window.dispatchEvent(new CustomEvent("wtp:open_user_guide"));
  };

  const handleStartTour = () => {
    window.dispatchEvent(new CustomEvent("wtp:start_onboarding_tour"));
  };

  const menuItems: UserProfileMenuItem[] = [
    {
      href: "/profile",
      icon: <UserCircleIcon />,
      label: "Profil Saya",
    },
    {
      href: "/configuration",
      icon: <GearIcon />,
      label: "Konfigurasi Sistem",
    },
    {
      icon: <Sparkles className="h-4 w-4 text-amber-500" />,
      label: "Tur Layar Interaktif",
      onClick: handleStartTour,
    },
    {
      icon: <HelpCircle className="h-4 w-4" />,
      label: "Panduan & Bantuan",
      onClick: handleOpenGuide,
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex items-center gap-2.5 rounded-lg border-0 p-0 transition-all outline-none focus-visible:ring-4 focus-visible:ring-input-primary-focus-border/20 focus-visible:ring-offset-1">
        <Avatar>
          <AvatarImage src={currentUser.avatarUrl!} alt={currentUser.name} className="size-10 rounded-lg" />
          <AvatarFallback className="rounded-lg border border-border-secondary-alt bg-background-gray-secondary_alt">
            {currentUser.name.charAt(0)}
          </AvatarFallback>
        </Avatar>

        <span className="text-sm leading-5 font-medium text-text-primary hidden md:inline">{currentUser.name}</span>

        <AltArrowDownIcon className="text-icon-tertiary transition-transform duration-200 group-aria-expanded:-rotate-180" />
      </DropdownMenuTrigger>

      <DropdownMenuContent placement="bottom end" className="w-70 overflow-hidden p-0 shadow-3xl">
        <DropdownMenuHeader className="flex w-full items-center justify-start gap-2 border-b border-border-secondary-alt px-4 py-3">
          <Avatar size="md">
            <AvatarImage src={currentUser.avatarUrl!} alt={currentUser.name} />
            <AvatarFallback className="border border-border-secondary-alt bg-background-gray-secondary_alt">
              {currentUser.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className="flex flex-col">
            <span className="text-sm font-medium text-text-primary">{currentUser.name}</span>
            <span className="truncate text-xs text-gray-500">{currentUser.email}</span>
          </span>
        </DropdownMenuHeader>

        <DropdownMenuSection className="p-1.5">
          {menuItems.map((item) =>
            item.href ? (
              <DropdownMenuItem
                key={item.label}
                href={item.href}
                className="cursor-pointer px-3 py-2.5"
                render={(domProps) => <Link {...(domProps as any)} />}
              >
                <span className="shrink-0 text-icon-secondary group-hover:text-text-primary">
                  {item.icon}
                </span>
                <span className="leading-5 font-medium">{item.label}</span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                key={item.label}
                onAction={item.onClick}
                className="cursor-pointer px-3 py-2.5"
              >
                <span className="shrink-0 text-icon-secondary group-hover:text-text-primary">
                  {item.icon}
                </span>
                <span className="leading-5 font-medium">{item.label}</span>
              </DropdownMenuItem>
            )
          )}
        </DropdownMenuSection>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onAction={handleLogout}
          className="m-1.5 w-auto cursor-pointer px-3 py-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
        >
          <span className="text-red-500">
            <LogoutIcon />
          </span>
          <span className="leading-5 font-semibold">Keluar (Logout)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
