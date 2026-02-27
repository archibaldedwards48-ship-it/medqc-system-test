import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { getLoginUrl } from "@/const";
import {
  Activity,
  BookOpen,
  Bot,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  FileBarChart,
  FileText,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Pill,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { CSSProperties, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const coreMenuItems = [
  { icon: LayoutDashboard, label: "总览看板", path: "/" },
  { icon: FileText, label: "病历管理", path: "/records" },
  { icon: ShieldCheck, label: "质控执行", path: "/qc" },
  { icon: ClipboardList, label: "规则库", path: "/rules" },
  { icon: Activity, label: "统计分析", path: "/statistics" },
];

const knowledgeMenuItems = [
  { icon: Pill, label: "药品知识库", path: "/drugs" },
  { icon: BookOpen, label: "医学术语库", path: "/terminology" },
  { icon: FlaskConical, label: "检验参考范围", path: "/lab-references" },
  { icon: Stethoscope, label: "临床指南", path: "/guidelines" },
];

const systemMenuItems = [
  { icon: Bot, label: "AI 质控顾问", path: "/ai-advisor", adminOnly: false },
  { icon: Search, label: "NLP 分析", path: "/nlp", adminOnly: false },
  { icon: ClipboardCheck, label: "抽查管理", path: "/spot-check", adminOnly: false },
  { icon: FileBarChart, label: "质控报告", path: "/reports", adminOnly: false },
  { icon: Settings, label: "系统配置", path: "/config", adminOnly: true },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 240;

function InnerLayout({ children }: { children: React.ReactNode }) {
  const { open } = useSidebar();
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  const roleLabel: Record<string, string> = {
    admin: "管理员",
    doctor: "医生",
    qc_staff: "质控员",
    user: "普通用户",
  };

  const roleBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    admin: "destructive",
    doctor: "default",
    qc_staff: "secondary",
    user: "outline",
  };

  const allItems = [...coreMenuItems, ...knowledgeMenuItems, ...systemMenuItems];
  const currentLabel = allItems.find((item) => isActive(item.path))?.label ?? "总览看板";

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-4 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-primary-foreground" />
            </div>
            {open && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-sidebar-foreground truncate">
                  病例质控系统
                </span>
                <span className="text-xs text-sidebar-foreground/50 truncate">
                  MedQC Platform
                </span>
              </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2 py-3 gap-0">
          <SidebarGroup>
            {open && (
              <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs font-medium px-2 mb-1">
                核心功能
              </SidebarGroupLabel>
            )}
            <SidebarMenu>
              {coreMenuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={isActive(item.path)}
                    onClick={() => navigate(item.path)}
                    tooltip={item.label}
                    className="cursor-pointer"
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup className="mt-2">
            {open && (
              <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs font-medium px-2 mb-1">
                知识库
              </SidebarGroupLabel>
            )}
            <SidebarMenu>
              {knowledgeMenuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={isActive(item.path)}
                    onClick={() => navigate(item.path)}
                    tooltip={item.label}
                    className="cursor-pointer"
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup className="mt-2">
            {open && (
              <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs font-medium px-2 mb-1">
                工具
              </SidebarGroupLabel>
            )}
            <SidebarMenu>
              {systemMenuItems
                .filter((item) => !item.adminOnly || user?.role === "admin")
                .map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive(item.path)}
                      onClick={() => navigate(item.path)}
                      tooltip={item.label}
                      className="cursor-pointer"
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="px-2 py-3 border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="cursor-pointer data-[state=open]:bg-sidebar-accent"
                    tooltip={user?.name ?? "用户"}
                  >
                    <Avatar className="w-7 h-7 shrink-0">
                      <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                        {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    {open && (
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-medium text-sidebar-foreground truncate">
                          {user?.name ?? "用户"}
                        </span>
                        <span className="text-xs text-sidebar-foreground/50 truncate">
                          {roleLabel[user?.role ?? "user"] ?? user?.role}
                        </span>
                      </div>
                    )}
                    {open && <ChevronDown className="w-4 h-4 text-sidebar-foreground/50 shrink-0" />}
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-52">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    <Badge
                      variant={roleBadgeVariant[user?.role ?? "user"]}
                      className="mt-1.5 text-xs"
                    >
                      {roleLabel[user?.role ?? "user"]}
                    </Badge>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => logout()}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-12 items-center gap-3 px-4 border-b border-border bg-card sticky top-0 z-10">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm font-medium text-foreground">{currentLabel}</span>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-sm w-full">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-primary-foreground" />
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-xl font-semibold">病例质控系统</h1>
            <p className="text-sm text-muted-foreground">请登录后继续使用系统</p>
          </div>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
            className="w-full"
          >
            登录
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <InnerLayout>{children}</InnerLayout>
    </SidebarProvider>
  );
}
