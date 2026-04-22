import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../../utils/cn";

const MotionDiv = motion.div;

function getAlignmentClass(align) {
    if (align === "left") return "left-0";
    if (align === "center") return "left-1/2 -translate-x-1/2";
    return "right-0";
}

export function DropdownItem({
    children,
    className,
    as = "button",
    ...props
}) {
    const Component = as;

    return (
        <Component className={cn("app-dropdown-item", className)} {...props}>
            {children}
        </Component>
    );
}

export default function Dropdown({
    trigger,
    children,
    align = "right",
    widthClassName = "w-64",
    panelClassName,
    initialOpen = false,
}) {
    const [open, setOpen] = useState(initialOpen);
    const containerRef = useRef(null);

    useEffect(() => {
        function handlePointerDown(event) {
            if (!containerRef.current?.contains(event.target)) {
                setOpen(false);
            }
        }

        function handleEscape(event) {
            if (event.key === "Escape") {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    const triggerNode =
        typeof trigger === "function"
            ? trigger({
                  open,
                  close: () => setOpen(false),
                  toggle: () => setOpen((prev) => !prev),
              })
            : trigger;

    return (
        <div ref={containerRef} className="relative">
            <div onClick={() => setOpen((prev) => !prev)}>{triggerNode}</div>

            <AnimatePresence>
                {open ? (
                    <MotionDiv
                        initial={{ opacity: 0, y: 8, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.992 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className={cn(
                            "app-dropdown-panel absolute z-popover mt-3 overflow-hidden rounded-[1.4rem] p-2",
                            getAlignmentClass(align),
                            widthClassName,
                            panelClassName
                        )}
                    >
                        {typeof children === "function"
                            ? children({ close: () => setOpen(false) })
                            : children}
                    </MotionDiv>
                ) : null}
            </AnimatePresence>
        </div>
    );
}
