import ThemeToggle from "../../components/ThemeToggle";
import BrandMark from "../../components/BrandMark";
import Surface from "../../components/ui/Surface";
import { MotionPage, MotionSection } from "../../components/AppMotion";

export default function AuthShell({
    eyebrow = "Acceso desde Phidias",
    title,
    description,
    children,
}) {
    return (
        <MotionPage className="app-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6">
            <div className="fixed right-4 top-4 z-20 sm:right-6 sm:top-6">
                <ThemeToggle />
            </div>

            <MotionSection delay={0.08} className="w-full max-w-md">
                <Surface className="login-card rounded-[2rem] p-6 shadow-sm sm:p-8">
                    <BrandMark markClassName="h-16 w-16 rounded-[1.4rem] p-3" />

                    <div className="mt-8 text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--app-text-muted)]">
                            {eyebrow}
                        </p>
                        <h2 className="mt-3 text-2xl font-semibold text-[color:var(--app-text-primary)]">
                            {title}
                        </h2>
                        {description ? (
                            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[color:var(--app-text-secondary)]">
                                {description}
                            </p>
                        ) : null}
                    </div>

                    <div className="mt-7">{children}</div>
                </Surface>
            </MotionSection>
        </MotionPage>
    );
}
