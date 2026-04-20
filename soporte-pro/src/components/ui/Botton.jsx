export default function Button({ children, variant = "primary", ...props }) {
    const base =
        "px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95";

    const variants = {
        primary:
            "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20",
        secondary:
            "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:opacity-80",
        danger:
            "bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/20",
    };

    return (
        <button className={`${base} ${variants[variant]}`} {...props}>
            {children}
        </button>
    );
}