import { useMemo, useState } from "react";
import {
    BookOpenCheck,
    ClipboardPlus,
    LayoutDashboard,
    LifeBuoy,
    MessageSquareText,
    ShieldCheck,
    Ticket,
    Users,
    Workflow,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import Surface from "./ui/Surface";
import { isAdminRole, isEndUserRole } from "../utils/permissions";

function getModuleLabel(pathname) {
    if (pathname === "/") return "Dashboard";
    if (pathname.startsWith("/tickets/nuevo")) return "Nuevo ticket";
    if (pathname.startsWith("/tickets/") && pathname !== "/tickets") {
        return "Detalle del ticket";
    }
    if (pathname === "/tickets") return "Tickets";
    if (pathname === "/kanban") return "Kanban";
    if (pathname === "/usuarios") return "Usuarios";
    if (pathname === "/auditoria") return "Auditoria";
    return "Sistema";
}

function getGuideContent({ role }) {
    if (isEndUserRole(role)) {
        return {
            eyebrow: "Guia para usuarios",
            title: "Aprende a crear tickets y darles seguimiento",
            description:
                "Este asistente te muestra el flujo ideal para reportar un caso, seguir su avance y conversar con soporte sin perder el contexto.",
            modules: [
                {
                    title: "1. Crear un ticket claro",
                    icon: ClipboardPlus,
                    steps: [
                        "Entra a Tickets y pulsa Nuevo ticket.",
                        "Escribe un titulo concreto y una descripcion con el problema, desde cuando ocurre y que intentaste.",
                        "Elige categoria y prioridad para que soporte lo reciba mejor clasificado.",
                    ],
                    action: {
                        label: "Ir a crear ticket",
                        to: "/tickets/nuevo",
                    },
                },
                {
                    title: "2. Seguir el estado del caso",
                    icon: Ticket,
                    steps: [
                        "Vuelve al listado de Tickets para ver abiertos, en proceso y cerrados.",
                        "Abre el detalle del ticket para revisar su estado, prioridad y fecha.",
                        "Cuando soporte avance el caso, veras los cambios reflejados ahi mismo.",
                    ],
                    action: {
                        label: "Ir a mis tickets",
                        to: "/tickets",
                    },
                },
                {
                    title: "3. Chatear y adjuntar evidencias",
                    icon: MessageSquareText,
                    steps: [
                        "Dentro del detalle del ticket puedes escribir mensajes al tecnico o al equipo de soporte.",
                        "Adjunta capturas, documentos o evidencias desde la seccion Archivos adjuntos.",
                        "Usa el chat para responder sobre el mismo caso y mantener toda la trazabilidad unificada.",
                    ],
                },
            ],
            tips: [
                "Usa titulos concretos para acelerar la clasificacion.",
                "Adjunta evidencias desde el detalle, no en la descripcion.",
                "Si tienes varios casos distintos, crea un ticket por cada problema.",
            ],
        };
    }

    const commonStaffModules = [
        {
            title: "Tickets",
            icon: Ticket,
            steps: [
                "Usa los filtros del listado para separar abiertos, en proceso y cerrados.",
                "Abre el detalle para revisar contexto, evidencias y chat del usuario.",
                "Desde admin puedes asignar, cerrar o eliminar tickets segun el caso.",
            ],
            action: {
                label: "Abrir tickets",
                to: "/tickets",
            },
        },
        {
            title: "Detalle y conversacion",
            icon: MessageSquareText,
            steps: [
                "El detalle del ticket concentra estado, prioridad, adjuntos y conversacion.",
                "Responde por chat para mantener el historial dentro del mismo caso.",
                "Usa los botones de estado para mover el ticket cuando corresponda.",
            ],
        },
    ];

    const modules = isAdminRole(role)
        ? [
              {
                  title: "Dashboard ejecutivo",
                  icon: LayoutDashboard,
                  steps: [
                      "Usa el dashboard para leer carga operativa, distribucion por estado y actividad reciente.",
                      "Aplica rango de fechas para ver tendencias y comparar volumen del soporte.",
                      "Desde aqui puedes detectar rapidamente cuellos de botella o tecnicos sobrecargados.",
                  ],
                  action: {
                      label: "Ir al dashboard",
                      to: "/",
                  },
              },
              ...commonStaffModules,
              {
                  title: "Kanban operativo",
                  icon: Workflow,
                  steps: [
                      "Mueve tickets entre columnas para reflejar el avance del flujo.",
                      "Usa autoasignacion o cambia responsable desde la tarjeta.",
                      "Si estas filtrando por busqueda, limpia el termino para volver a arrastrar.",
                  ],
                  action: {
                      label: "Abrir kanban",
                      to: "/kanban",
                  },
              },
              {
                  title: "Usuarios y roles",
                  icon: Users,
                  steps: [
                      "Crea, edita y elimina usuarios desde el modulo Usuarios.",
                      "Asigna roles de admin, tecnico o usuario segun el acceso que necesiten.",
                      "Tambien puedes importar o exportar usuarios de forma masiva por Excel.",
                  ],
                  action: {
                      label: "Administrar usuarios",
                      to: "/usuarios",
                  },
              },
              {
                  title: "Auditoria",
                  icon: ShieldCheck,
                  steps: [
                      "Revisa el historial de acciones para saber quien creo, edito, cerro o elimino tickets.",
                      "Usa este modulo cuando necesites trazabilidad operativa o control interno.",
                  ],
                  action: {
                      label: "Ver auditoria",
                      to: "/auditoria",
                  },
              },
          ]
        : [
              {
                  title: "Dashboard operativo",
                  icon: LayoutDashboard,
                  steps: [
                      "Consulta indicadores y carga actual para priorizar tu trabajo.",
                      "Identifica tickets en riesgo y actividad reciente del soporte.",
                  ],
                  action: {
                      label: "Ir al dashboard",
                      to: "/",
                  },
              },
              ...commonStaffModules,
              {
                  title: "Kanban operativo",
                  icon: Workflow,
                  steps: [
                      "Usa el kanban para ver visualmente el estado de cada ticket asignado.",
                      "Mueve el ticket entre columnas cuando el avance cambie.",
                  ],
                  action: {
                      label: "Abrir kanban",
                      to: "/kanban",
                  },
              },
          ];

    return {
        eyebrow: isAdminRole(role) ? "Guia para administradores" : "Guia para tecnicos",
        title: "Recorrido operativo del sistema de soporte",
        description:
            "Este asistente resume el uso recomendado del sistema segun tu rol y te ayuda a moverte mas rapido por los modulos principales.",
        modules,
        tips: [
            "Usa el buscador superior dentro del modulo en el que estes trabajando.",
            "Mantén la conversacion del caso dentro del ticket para no perder trazabilidad.",
            "Actualiza el estado solo cuando el avance real del caso haya cambiado.",
        ],
    };
}

function GuideCard({ item, onNavigate }) {
    const Icon = item.icon;

    return (
        <Surface variant="muted" className="rounded-[1.5rem] p-4 sm:p-5">
            <div className="flex items-start gap-3">
                <div className="app-icon-badge shrink-0">
                    <Icon className="h-4.5 w-4.5" />
                </div>

                <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-[color:var(--app-text-primary)]">
                        {item.title}
                    </h3>

                    <ol className="mt-3 space-y-2 text-sm leading-6 text-[color:var(--app-text-secondary)]">
                        {item.steps.map((step) => (
                            <li key={step} className="flex gap-2">
                                <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--app-accent)]" />
                                <span>{step}</span>
                            </li>
                        ))}
                    </ol>

                    {item.action ? (
                        <div className="mt-4">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => onNavigate(item.action.to)}
                            >
                                {item.action.label}
                            </Button>
                        </div>
                    ) : null}
                </div>
            </div>
        </Surface>
    );
}

export default function HelpAssistant({ role }) {
    const [open, setOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const moduleLabel = getModuleLabel(location.pathname);
    const guide = useMemo(
        () => getGuideContent({ role }),
        [role]
    );

    function goTo(path) {
        navigate(path);
        setOpen(false);
    }

    return (
        <>
            <Button
                variant="ghost"
                className="h-11 px-4"
                iconLeft={LifeBuoy}
                onClick={() => setOpen(true)}
                aria-label="Abrir guia del sistema"
                title="Guia del sistema"
            >
                Ayuda
            </Button>

            <Modal
                open={open}
                onClose={() => setOpen(false)}
                title="Asistente de uso del sistema"
                description={`Estas en ${moduleLabel}. Aqui tienes una guia paso a paso para usar mejor el sistema segun tu rol.`}
                icon={BookOpenCheck}
                size="lg"
                actions={
                    <Button variant="ghost" onClick={() => setOpen(false)}>
                        Cerrar
                    </Button>
                }
            >
                <div className="space-y-5">
                    <Surface variant="default" className="rounded-[1.5rem] p-4 sm:p-5">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--app-text-tertiary)]">
                            {guide.eyebrow}
                        </p>
                        <h2 className="mt-2 text-xl font-semibold text-[color:var(--app-text-primary)]">
                            {guide.title}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-[color:var(--app-text-secondary)]">
                            {guide.description}
                        </p>
                    </Surface>

                    <div className="grid gap-4">
                        {guide.modules.map((item) => (
                            <GuideCard
                                key={item.title}
                                item={item}
                                onNavigate={goTo}
                            />
                        ))}
                    </div>

                    <Surface variant="muted" className="rounded-[1.5rem] p-4 sm:p-5">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--app-text-tertiary)]">
                            Recomendaciones
                        </p>
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-[color:var(--app-text-secondary)]">
                            {guide.tips.map((tip) => (
                                <li key={tip} className="flex gap-2">
                                    <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--app-accent)]" />
                                    <span>{tip}</span>
                                </li>
                            ))}
                        </ul>
                    </Surface>
                </div>
            </Modal>
        </>
    );
}
