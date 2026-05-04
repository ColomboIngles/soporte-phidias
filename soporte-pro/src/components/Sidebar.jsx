import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
    ChevronLeft,
    ChevronRight,
    KanbanSquare,
    LayoutDashboard,
    ShieldCheck,
    Sparkles,
    Ticket,
    Users,
    X,
} from "lucide-react";
import { getNavigationItems, isEndUserRole } from "../utils/permissions";
import { cn } from "../utils/cn";
import { MotionItem, MotionSection, MotionStagger } from "./AppMotion";

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
            <MotionSection className="app-surface rounded-[1.75rem] p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                    <div
                        className={cn(
                            "min-w-0 flex-1 pr-1",
                            collapsed && !mobile && "hidden"
                        )}
                    >
                        <div className="brand-badge max-w-full">
                            <Sparkles className="h-3.5 w-3.5" />
                            Soporte SaaS
                        </div>
                        <h1 className="app-break-anywhere mt-4 text-[1.45rem] font-semibold tracking-tight text-[color:var(--app-text-primary)]">
                            {isEndUser
                                ? "Portal de seguimiento"
                                : "Mesa de soporte"}
                        </h1>
                        <p className="app-break-anywhere mt-3 text-sm leading-6 text-[color:var(--app-text-secondary)]">
                            {isEndUser
                                ? "Consulta solicitudes, comparte evidencias y conversa con soporte desde una interfaz simple y profesional."
                                : "Operacion centralizada de tickets, analitica y seguimiento tecnico con una experiencia clara y empresarial."}
                        </p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                        {mobile ? (
                            <button
                                type="button"
                                onClick={onClose}
                                className="app-icon-button"
                                aria-label="Cerrar navegacion"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={onToggleCollapse}
                                className="app-icon-button hidden lg:inline-flex"
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

                {collapsed && !mobile ? (
                    <div className="mt-4 flex justify-center">
                        <div className="app-icon-badge">
                            <Sparkles className="h-5 w-5" />
                        </div>
                    </div>
                ) : (
                    <div className="mt-5 flex gap-2">
                        {[
                            "var(--brand-primary)",
                            "var(--brand-secondary)",
                            "var(--brand-accent)",
                        ].map((color) => (
                                <span
                                    key={color}
                                    className="h-2.5 w-8 rounded-full border border-[color:var(--app-border)] shadow-sm"
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                    </div>
                )}
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
                    "app-surface mt-6 min-w-0 rounded-[1.4rem] p-4 shadow-sm",
                    collapsed && !mobile && "p-3 text-center"
                )}
            >
                <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--app-text-tertiary)]">
                    Rol activo
                </p>
                <p className="mt-2 text-sm font-semibold capitalize text-[color:var(--app-text-primary)]">
                    {rol || "cargando"}
                </p>
                <p
                    className={cn(
                        "app-break-anywhere mt-2 text-xs leading-5 text-[color:var(--app-text-secondary)]",
                        collapsed && !mobile && "hidden"
                    )}
                >
                    Interfaz optimizada para un flujo claro, ordenado y listo para entorno empresarial.
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
    return (
        <>
            <aside
                className={cn(
                    "hidden h-screen shrink-0 border-r border-transparent lg:block",
                    collapsed ? "w-[6.75rem]" : "w-[19rem]"
                )}
            >
                <SidebarNav
                    rol={rol}
                    collapsed={collapsed}
                    onToggleCollapse={onToggleCollapse}
                />
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
