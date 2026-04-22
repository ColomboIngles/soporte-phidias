import {
    AlertCircle,
    CheckCircle2,
    Info,
    TriangleAlert,
} from "lucide-react";
import { cn } from "../../utils/cn";

const TONES = {
    neutral: {
        shell: "app-alert app-alert-neutral",
        icon: Info,
    },
    success: {
        shell: "app-alert app-alert-success",
        icon: CheckCircle2,
    },
    info: {
        shell: "app-alert app-alert-info",
        icon: Info,
    },
    warning: {
        shell: "app-alert app-alert-warning",
        icon: TriangleAlert,
    },
    danger: {
        shell: "app-alert app-alert-danger",
        icon: AlertCircle,
    },
};

export default function Alert({
    title,
    children,
    tone = "info",
    icon: IconProp,
    className,
    actions,
}) {
    const toneConfig = TONES[tone] || TONES.info;
    const Icon = IconProp || toneConfig.icon;

    return (
        <div className={cn(toneConfig.shell, className)} role="alert">
            <div className="app-alert-icon">
                <Icon className="h-[1.125rem] w-[1.125rem]" />
            </div>

            <div className="min-w-0 flex-1">
                {title ? <p className="app-alert-title">{title}</p> : null}
                {children ? (
                    <div className="app-alert-description">{children}</div>
                ) : null}
            </div>

            {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
    );
}
