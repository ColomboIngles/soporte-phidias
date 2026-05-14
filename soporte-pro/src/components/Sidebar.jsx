import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
    ChevronLeft,
    ChevronRight,
    KanbanSquare,
    LayoutDashboard,
    ShieldCheck,
    Ticket,
    Users,
    X,
} from "lucide-react";
import { getNavigationItems, isEndUserRole } from "../utils/permissions";
import { cn } from "../utils/cn";
import { MotionItem, MotionSection, MotionStagger } from "./AppMotion";
import BrandMark from "./BrandMark";

const MotionAside = motion.aside;
const MotionDiv = motion.div;

const ICONS = {
    dashboard: LayoutDashboard,
    tickets: Ticket,
    kanban: KanbanSquare,
    usuarios: Users,
    auditoria: ShieldCheck,
};

function SidebarNav({
    rol,
    collapsed = false,
    onClose,
    onToggleCollapse,
    mobile = false,
}) {
    const location = useLocation();
    const navigationItems = getNavigationItems(rol);
    const isEndUser = isEndUserRole(rol);

    return (
        <div className="app-sidebar-shell flex h-full min-h-0 flex-col overflow-hidden p-3">
            <MotionSection className="sidebar-panel rounded-[1.75rem] p-4 shadow-sm">
                {collapsed && !mobile ? (
                    <div className="flex items-center justify-center">
                        <BrandMark
                            compact
                            className="justify-center"
                            markClassName="h-[3.25rem] w-[3.25rem] rounded-[1.1rem] border-white/10 bg-white/10 p-2.5 shadow-none"
                            titleClassName="hidden"
                            subtitleClassName="hidden"
                        />
                    </div>
                ) : (
                    <div className="sidebar-header-shell">
                        <div className="min-w-0 flex-1">
                            <BrandMark
                                compact
                                className="min-w-0"
                                markClassName="h-[3.2rem] w-[3.2rem] rounded-[1.1rem] border-white/10 bg-white/10 p-2.5 shadow-none"
                                titleClassName="sidebar-brand-title text-[color:#f8faf5]"
                                subtitleClassName="hidden"
                            />
                        </div>

                        <div className="flex shrink-0 gap-2">
                            {mobile ? (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="app-icon-button sidebar-header-action"
                                    aria-label="Cerrar navegacion"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={onToggleCollapse}
                                    className="app-icon-button sidebar-header-action hidden lg:inline-flex"
                                    aria-label={
                                        collapsed
                                            ? "Expandir sidebar"
                                            : "Colapsar sidebar"
                                    }
                                >
                                    {collapsed ? (
                                        <ChevronRight className="h-4 w-4" />
                                    ) : (
                                        <ChevronLeft className="h-4 w-4" />
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="mt-5 sidebar-divider" />
            </MotionSection>

            <div className="hide-scrollbar mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
                <MotionStagger
                    className="space-y-2"
                    delayChildren={0.06}
                    staggerChildren={0.05}
                >
                    {navigationItems.map((navItem) => {
                        const IconComponent = ICONS[navItem.key];
                        const active =
                            navItem.path === "/"
                                ? location.pathname === "/"
                                : location.pathname.startsWith(navItem.path);

                        return (
                            <MotionItem key={navItem.path}>
                                <Link
                                    to={navItem.path}
                                    onClick={mobile ? onClose : undefined}
                                    data-active={active}
                                    title={collapsed && !mobile ? navItem.label : undefined}
                                    className="app-sidebar-link"
                                >
                                    <span className="app-sidebar-icon">
                                        <IconComponent className="h-4 w-4" />
                                    </span>
                                    <span
                                        className={cn(
                                            "min-w-0 flex-1 truncate",
                                            collapsed && !mobile && "hidden"
                                        )}
                                    >
                                        {navItem.label}
                                    </span>
                                </Link>
                            </MotionItem>
                        );
                    })}
                </MotionStagger>
            </div>

            <MotionSection
                delay={0.14}
                className={cn(
                    "sidebar-panel mt-6 min-w-0 rounded-[1.4rem] p-4 shadow-sm",
                    collapsed && !mobile && "p-3 text-center"
                )}
            >
                <p className="sidebar-panel-eyebrow text-[11px] uppercase tracking-[0.18em]">
                    Rol activo
                </p>
                <p className="sidebar-panel-title mt-2 text-sm font-semibold capitalize">
                    {rol || "cargando"}
                </p>
                <p
                    className={cn(
                        "app-break-anywhere sidebar-panel-copy mt-2 text-xs leading-5",
                        collapsed && !mobile && "hidden"
                    )}
                >
                    {isEndUser
                        ? "Seguimiento claro y rapido."
                        : "Control centralizado del soporte."}
                </p>
            </MotionSection>
        </div>
    );
}

export default function Sidebar({
    rol,
    isOpen = false,
    onClose,
    collapsed = false,
    onToggleCollapse,
}) {
    const desktopWidthClass = collapsed ? "w-[6.25rem]" : "w-[21rem]";

    return (
        <>
            <aside
                className={cn(
                    "hidden h-screen shrink-0 lg:block",
                    desktopWidthClass
                )}
                aria-hidden="true"
            >
                <div
                    className={cn(
                        "fixed inset-y-0 left-0 z-30 h-screen border-r border-transparent",
                        desktopWidthClass
                    )}
                >
                    <SidebarNav
                        rol={rol}
                        collapsed={collapsed}
                        onToggleCollapse={onToggleCollapse}
                    />
                </div>
            </aside>

            <AnimatePresence>
                {isOpen ? (
                    <MotionDiv
                        className="fixed inset-0 z-50 bg-[color:var(--app-overlay)] backdrop-blur-sm lg:hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    >
                        <MotionAside
                            className="absolute inset-y-0 left-0 w-[min(22rem,88vw)]"
                            initial={{ x: -32, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -32, opacity: 0 }}
                            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                            onClick={(event) => event.stopPropagation()}
                        >
                            <SidebarNav rol={rol} mobile onClose={onClose} />
                        </MotionAside>
                    </MotionDiv>
                ) : null}
            </AnimatePresence>
        </>
    );
}
