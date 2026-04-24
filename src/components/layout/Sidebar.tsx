"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CreditCard,
  Bell,
  LogOut,
  Music,
  ChevronRight,
  GraduationCap,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export const adminNavItems: NavItem[] = [
  { href: "/admin/dashboard", label: "대시보드", icon: <LayoutDashboard size={18} /> },
  { href: "/admin/students", label: "원생 관리", icon: <Users size={18} /> },
  { href: "/admin/teachers", label: "선생님 관리", icon: <GraduationCap size={18} /> },
  { href: "/admin/schedule", label: "레슨 일정", icon: <CalendarDays size={18} /> },
  { href: "/admin/payments", label: "수강료 관리", icon: <CreditCard size={18} /> },
  { href: "/admin/notifications", label: "알림 발송", icon: <Bell size={18} /> },
];

export const teacherNavItems: NavItem[] = [
  { href: "/teacher/dashboard", label: "대시보드", icon: <LayoutDashboard size={18} /> },
  { href: "/teacher/students", label: "원생 연습 관리", icon: <Users size={18} /> },
];

export const studentNavItems: NavItem[] = [
  { href: "/student/dashboard", label: "내 현황", icon: <LayoutDashboard size={18} /> },
  { href: "/student/schedule", label: "내 일정", icon: <CalendarDays size={18} /> },
  { href: "/student/practice", label: "피아노 연습", icon: <Music size={18} /> },
  { href: "/student/payments", label: "납부 내역", icon: <CreditCard size={18} /> },
];

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: string;
  };
}

function getRoleMeta(role: string) {
  if (role === "ADMIN") {
    return {
      label: "관리자",
      navItems: adminNavItems,
      badge: "Academy OS",
      description: "운영 · 원생 · 결제 통합관리",
    };
  }
  if (role === "TEACHER") {
    return {
      label: "선생님",
      navItems: teacherNavItems,
      badge: "Practice Coach",
      description: "연습 피드백과 원생 관리",
    };
  }
  return {
    label: "원생",
    navItems: studentNavItems,
    badge: "Student Studio",
    description: "일정 · 연습 · 납부 현황",
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const { navItems, label, badge, description } = getRoleMeta(user.role);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col overflow-hidden border-r border-slate-200/70 bg-slate-950 text-white shadow-2xl shadow-slate-950/20 lg:flex">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.35),_transparent_34%),linear-gradient(180deg,_rgba(255,255,255,0.08),_transparent_40%)]" />
      <div className="relative flex h-full flex-col">
        <div className="px-6 pb-5 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-lg shadow-indigo-500/20">
              🎹
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-[0.24em] text-indigo-200">PIANO</p>
              <h1 className="truncate text-lg font-bold text-white">Academy Manager</h1>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.07] p-4 shadow-inner shadow-white/5 backdrop-blur">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">
              <Sparkles size={14} />
              {badge}
            </div>
            <p className="mt-2 text-sm font-semibold text-white">{label} 워크스페이스</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">{description}</p>
          </div>
        </div>

        <nav className="relative flex-1 space-y-1 px-4 py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-white text-slate-950 shadow-xl shadow-indigo-950/30"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                    isActive
                      ? "bg-indigo-600 text-white"
                      : "bg-white/10 text-slate-300 group-hover:bg-white/15 group-hover:text-white"
                  )}
                >
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight size={16} className="text-indigo-500" />}
              </Link>
            );
          })}
        </nav>

        <div className="relative p-4">
          <div className="mb-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-xs text-emerald-100">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck size={14} />
              보안 세션 활성화
            </div>
            <p className="mt-1 text-emerald-100/80">권한별 접근 제어가 적용됩니다.</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-left transition hover:bg-white/[0.12]">
                <Avatar className="h-10 w-10 border border-white/20">
                  <AvatarImage src={user.image ?? ""} />
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-bold">
                    {user.name?.charAt(0) ?? user.email?.charAt(0) ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{user.name ?? "사용자"}</p>
                  <p className="truncate text-xs text-slate-400">{user.email}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-red-600"
              >
                <LogOut size={14} className="mr-2" />
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  );
}
