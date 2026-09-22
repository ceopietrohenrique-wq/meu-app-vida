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
  onNavigate,
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
  /** Chamado ao clicar — usado pelo MenuSheet para fechar o sheet ao navegar. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(className, isActive ? activeClassName : inactiveClassName)}
      aria-current={isActive ? "page" : undefined}
      onClick={onNavigate}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
