import { motion } from "framer-motion";
import { ITEM_TRANSITION, MOTION_EASE } from "./motion-presets";
import { cn } from "../utils/cn";

const MotionDiv = motion.div;

const pageVariants = {
    hidden: {
        opacity: 0,
        y: 18,
        filter: "blur(6px)",
    },
    visible: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: {
            duration: 0.42,
            ease: MOTION_EASE,
        },
    },
};

const sectionVariants = {
    hidden: {
        opacity: 0,
        y: 14,
    },
    visible: (delay = 0) => ({
        opacity: 1,
        y: 0,
        transition: {
            delay,
            duration: 0.38,
            ease: MOTION_EASE,
        },
    }),
};

const staggerVariants = {
    hidden: {},
    visible: (config = {}) => ({
        transition: {
            delayChildren: config.delayChildren ?? 0.03,
            staggerChildren: config.staggerChildren ?? 0.055,
        },
    }),
};

const itemVariants = {
    hidden: {
        opacity: 0,
        y: 10,
        scale: 0.992,
    },
    visible: (delay = 0) => ({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            delay,
            duration: ITEM_TRANSITION.duration,
            ease: ITEM_TRANSITION.ease,
        },
    }),
};

export function MotionPage({ children, className = "" }) {
    return (
        <MotionDiv
            initial="hidden"
            animate="visible"
            variants={pageVariants}
            className={className}
        >
            {children}
        </MotionDiv>
    );
}

export function MotionSection({ children, className = "", delay = 0 }) {
    return (
        <MotionDiv
            custom={delay}
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
            className={cn("min-w-0", className)}
        >
            {children}
        </MotionDiv>
    );
}

export function MotionStagger({
    children,
    className = "",
    delayChildren = 0.04,
    staggerChildren = 0.07,
}) {
    return (
        <MotionDiv
            custom={{ delayChildren, staggerChildren }}
            initial="hidden"
            animate="visible"
            variants={staggerVariants}
            className={cn("min-w-0", className)}
        >
            {children}
        </MotionDiv>
    );
}

export function MotionItem({ children, className = "", delay = 0 }) {
    return (
        <MotionDiv
            custom={delay}
            variants={itemVariants}
            className={cn("min-w-0", className)}
        >
            {children}
        </MotionDiv>
    );
}
