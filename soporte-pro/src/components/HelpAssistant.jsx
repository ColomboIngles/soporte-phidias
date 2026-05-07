import { useMemo, useState } from "react";
import {
    ArrowLeft,
    ArrowRight,
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

function buildTutorial(role) {
    if (isEndUserRole(role)) {
        return {
            eyebrow: "Tutorial para usuarios",
            title: "Aprende a reportar y seguir tus casos",
            description:
                "Un recorrido corto para crear tickets, revisar su avance y comunicarte con soporte sin perder el hilo del caso.",
            steps: [
                {
                    title: "Ubica tu centro de trabajo",
                    icon: Ticket,
                    body: "El modulo Tickets es tu punto principal. Desde ahi podras ver tus solicitudes abiertas, en proceso y cerradas.",
                    bullets: [
                        "Usa el listado para identificar rapidamente el estado de cada caso.",
                        "Entra al detalle del ticket para revisar fechas, prioridad y conversaciones.",
                    ],
                    action: {
                        label: "Ir a Tickets",
                        to: "/tickets",
                    },
                },
                {
                    title: "Crea un ticket bien redactado",
                    icon: ClipboardPlus,
                    body: "Un buen ticket reduce el ida y vuelta con soporte y acelera la asignacion.",
                    bullets: [
                        "Escribe un titulo concreto y una descripcion clara del problema.",
                        "Selecciona categoria y prioridad segun el impacto real del caso.",
                        "Si necesitas, agrega tu numero para futuras notificaciones.",
                    ],
                    action: {
                        label: "Crear ticket",
                        to: "/tickets/nuevo",
                    },
                },
                {
                    title: "Haz seguimiento del avance",
                    icon: ShieldCheck,
                    body: "Cuando soporte actualice el caso, el cambio se reflejara dentro del mismo ticket.",
                    bullets: [
                        "Revisa el estado actual y la ultima actualizacion.",
                        "Abre el detalle cuando quieras mas contexto del seguimiento.",
                    ],
                },
                {
                    title: "Usa chat y adjuntos dentro del caso",
                    icon: MessageSquareText,
                    body: "Todo debe quedar dentro del ticket para conservar la trazabilidad completa.",
                    bullets: [
                        "Escribe al tecnico directamente desde la conversacion del ticket.",
                        "Adjunta capturas o documentos desde Archivos adjuntos.",
                        "Evita abrir varios tickets para el mismo problema.",
                    ],
                },
            ],
            tips: [
                "Un ticket por problema hace mas facil la trazabilidad.",
                "Describe sintomas, impacto y fecha aproximada del fallo.",
                "Adjunta evidencias desde el detalle del ticket, no solo en el texto.",
            ],
        };
    }

    const steps = isAdminRole(role)
        ? [
              {
                  title: "Comienza por el Dashboard",
                  icon: LayoutDashboard,
                  body: "El dashboard resume carga, estados y actividad reciente para que tomes decisiones rapidas.",
                  bullets: [
                      "Usa filtros de fecha para comparar volumen y rendimiento.",
                      "Detecta estados dominantes y tecnicos mas cargados.",
                  ],
                  action: {
                      label: "Abrir Dashboard",
                      to: "/",
                  },
              },
              {
                  title: "Gestiona tickets desde el listado",
                  icon: Ticket,
                  body: "El modulo Tickets te deja revisar, asignar y cerrar casos con mas detalle.",
                  bullets: [
                      "Filtra por estado y usa el buscador del modulo.",
                      "Autoasigna o cambia responsable segun disponibilidad.",
                      "Abre el detalle para revisar contexto completo.",
                  ],
                  action: {
                      label: "Abrir Tickets",
                      to: "/tickets",
                  },
              },
              {
                  title: "Usa el Kanban para el flujo operativo",
                  icon: Workflow,
                  body: "Kanban facilita mover tickets entre columnas y ver carga por etapa.",
                  bullets: [
                      "Mueve el ticket cuando cambie realmente de estado.",
                      "Si hay busqueda activa, limpiala para volver a arrastrar.",
                  ],
                  action: {
                      label: "Abrir Kanban",
                      to: "/kanban",
                  },
              },
              {
                  title: "Administra usuarios y roles",
                  icon: Users,
                  body: "El modulo Usuarios ya tiene CRUD completo y carga masiva para administracion del sistema.",
                  bullets: [
                      "Crea o edita usuarios desde el modal.",
                      "Define roles de admin, tecnico o usuario.",
                      "Usa Excel para importaciones masivas.",
                  ],
                  action: {
                      label: "Abrir Usuarios",
                      to: "/usuarios",
                  },
              },
              {
                  title: "Mantén la trazabilidad",
                  icon: ShieldCheck,
                  body: "Auditoria te muestra quien creo, edito, cerro o elimino movimientos clave.",
                  bullets: [
                      "Consulta este modulo para seguimiento institucional.",
                      "Usa el detalle del ticket y el chat para mantener el contexto del caso.",
                  ],
                  action: {
                      label: "Abrir Auditoria",
                      to: "/auditoria",
                  },
              },
          ]
        : [
              {
                  title: "Lee primero el Dashboard",
                  icon: LayoutDashboard,
                  body: "El dashboard te ayuda a entender la carga del soporte antes de empezar a operar tickets.",
                  bullets: [
                      "Revisa actividad reciente y tickets en riesgo.",
                      "Usa el rango de fechas para centrarte en el periodo correcto.",
                  ],
                  action: {
                      label: "Abrir Dashboard",
                      to: "/",
                  },
              },
              {
                  title: "Trabaja el caso desde Tickets",
                  icon: Ticket,
                  body: "El listado te deja priorizar, abrir detalle y responder sin perder contexto.",
                  bullets: [
                      "Filtra por estado segun tu flujo actual.",
                      "Abre el detalle para leer la descripcion, ver adjuntos y responder.",
                  ],
                  action: {
                      label: "Abrir Tickets",
                      to: "/tickets",
                  },
              },
              {
                  title: "Usa el detalle como centro del caso",
                  icon: MessageSquareText,
                  body: "El detalle concentra la conversacion y los archivos del ticket.",
                  bullets: [
                      "Responde por chat para mantener la trazabilidad.",
                      "Actualiza el estado cuando el avance cambie.",
                  ],
                },
              {
                  title: "Refleja el avance en Kanban",
                  icon: Workflow,
                  body: "Kanban te ayuda a mantener una vista rapida del estado operativo de tus tickets.",
                  bullets: [
                      "Mueve el ticket entre columnas segun el progreso real.",
                      "Usa la vista para no dejar casos estancados.",
                  ],
                  action: {
                      label: "Abrir Kanban",
                      to: "/kanban",
                  },
              },
          ];

    return {
        eyebrow: isAdminRole(role)
            ? "Tutorial para administradores"
            : "Tutorial para tecnicos",
        title: "Recorrido guiado del sistema de soporte",
        description:
            "Este tutorial te lleva modulo por modulo con pasos cortos y accionables para que aprendas el flujo real de trabajo.",
        steps,
        tips: [
            "Usa el buscador superior dentro del modulo actual.",
            "Mantén la conversacion del caso dentro del mismo ticket.",
            "Actualiza el estado solo cuando el avance real haya cambiado.",
        ],
    };
}

function TutorialProgress({ steps, activeIndex, onSelect }) {
    return (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {steps.map((step, index) => {
                const Icon = step.icon;
                const active = index === activeIndex;

                return (
                    <button
                        key={step.title}
                        type="button"
                        onClick={() => onSelect(index)}
                        className={`w-full rounded-[1.35rem] border px-4 py-3 text-left transition-all duration-200 ${
                            active
                                ? "border-[color:var(--app-border-strong)] bg-[color:var(--app-accent-soft)] shadow-sm"
                                : "border-[color:var(--app-border)] bg-[color:var(--app-surface-muted)] hover:border-[color:var(--app-border-strong)]"
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            <div className="app-icon-badge h-10 w-10 shrink-0">
                                <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--app-text-tertiary)]">
                                    Paso {index + 1}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-[color:var(--app-text-primary)]">
                                    {step.title}
                                </p>
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

export default function HelpAssistant({ role }) {
    const [open, setOpen] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const location = useLocation();
    const navigate = useNavigate();
    const moduleLabel = getModuleLabel(location.pathname);
    const tutorial = useMemo(() => buildTutorial(role), [role]);
    const currentStep = tutorial.steps[activeStep];
    const StepIcon = currentStep.icon;
    const isFirstStep = activeStep === 0;
    const isLastStep = activeStep === tutorial.steps.length - 1;

    function goTo(path) {
        navigate(path);
        setActiveStep(0);
        setOpen(false);
    }

    function nextStep() {
        setActiveStep((current) =>
            Math.min(current + 1, tutorial.steps.length - 1)
        );
    }

    function previousStep() {
        setActiveStep((current) => Math.max(current - 1, 0));
    }

    return (
        <>
            <Button
                variant="ghost"
                className="h-11 px-4"
                iconLeft={LifeBuoy}
                onClick={() => {
                    setActiveStep(0);
                    setOpen(true);
                }}
                aria-label="Abrir tutorial del sistema"
                title="Tutorial del sistema"
            >
                Ayuda
            </Button>

            <Modal
                open={open}
                onClose={() => {
                    setActiveStep(0);
                    setOpen(false);
                }}
                title="Tutorial in-app del sistema"
                description={`Estas en ${moduleLabel}. Sigue este recorrido guiado para aprender el flujo del sistema segun tu rol.`}
                icon={BookOpenCheck}
                size="xl"
                bodyClassName="p-0"
                actions={
                    <>
                        <Button
                            variant="ghost"
                            onClick={previousStep}
                            disabled={isFirstStep}
                            iconLeft={ArrowLeft}
                        >
                            Anterior
                        </Button>
                        {isLastStep ? (
                            <Button onClick={() => setOpen(false)}>
                                Finalizar
                            </Button>
                        ) : (
                            <Button onClick={nextStep} iconRight={ArrowRight}>
                                Siguiente
                            </Button>
                        )}
                    </>
                }
            >
                <div className="grid min-h-0 gap-0 xl:grid-cols-[22rem_minmax(0,1fr)]">
                    <div className="border-b border-[color:var(--app-border)] p-5 xl:min-h-0 xl:overflow-y-auto xl:border-b-0 xl:border-r">
                        <Surface variant="default" className="rounded-[1.5rem] p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--app-text-tertiary)]">
                                {tutorial.eyebrow}
                            </p>
                            <h2 className="mt-2 text-lg font-semibold text-[color:var(--app-text-primary)]">
                                {tutorial.title}
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-[color:var(--app-text-secondary)]">
                                {tutorial.description}
                            </p>
                        </Surface>

                        <div className="mt-4">
                            <TutorialProgress
                                steps={tutorial.steps}
                                activeIndex={activeStep}
                                onSelect={setActiveStep}
                            />
                        </div>
                    </div>

                    <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
                        <Surface variant="default" className="rounded-[1.7rem] p-5 sm:p-6">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--app-text-tertiary)]">
                                        Paso {activeStep + 1} de {tutorial.steps.length}
                                    </p>
                                    <h3 className="mt-2 text-2xl font-semibold text-[color:var(--app-text-primary)]">
                                        {currentStep.title}
                                    </h3>
                                    <p className="mt-3 text-sm leading-7 text-[color:var(--app-text-secondary)]">
                                        {currentStep.body}
                                    </p>
                                </div>

                                <div className="app-icon-badge h-12 w-12 shrink-0">
                                    <StepIcon className="h-5 w-5" />
                                </div>
                            </div>

                            <div className="mt-6 rounded-[1.5rem] border border-[color:var(--app-border)] bg-[color:var(--app-surface-muted)] p-4 sm:p-5">
                                <ol className="space-y-3 text-sm leading-6 text-[color:var(--app-text-secondary)]">
                                    {currentStep.bullets.map((step) => (
                                        <li key={step} className="flex gap-3">
                                            <span className="mt-[0.45rem] h-2 w-2 shrink-0 rounded-full bg-[color:var(--app-accent)]" />
                                            <span>{step}</span>
                                        </li>
                                    ))}
                                </ol>
                            </div>

                            {currentStep.action ? (
                                <div className="mt-6">
                                    <Button
                                        variant="secondary"
                                        onClick={() => goTo(currentStep.action.to)}
                                    >
                                        {currentStep.action.label}
                                    </Button>
                                </div>
                            ) : null}
                        </Surface>

                        <Surface variant="muted" className="mt-5 rounded-[1.5rem] p-4 sm:p-5">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--app-text-tertiary)]">
                                Buenas practicas
                            </p>
                            <ul className="mt-3 space-y-2 text-sm leading-6 text-[color:var(--app-text-secondary)]">
                                {tutorial.tips.map((tip) => (
                                    <li key={tip} className="flex gap-2">
                                        <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--app-accent)]" />
                                        <span>{tip}</span>
                                    </li>
                                ))}
                            </ul>
                        </Surface>
                    </div>
                </div>
            </Modal>
        </>
    );
}
