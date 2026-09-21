"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

export function NavLink({
  href,
  label,
  icon,
  className,
  activeClassName,
  inactiveClassName,
}: {
  href: string;
  label: string;
  /**
   * Já renderizado pelo Server Component pai (ex.: <Home className="..." />)
   * — nunca passar o componente do ícone em si como prop: uma referência de
   * função não pode atravessar a fronteira Server → Client Component.
   */
  icon: ReactNode;
  className?: string;
  activeClassName: string;
  inactiveClassName: string;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(className, isActive ? activeClassName : inactiveClassName)}
      aria-current={isActive ? "page" : undefined}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
