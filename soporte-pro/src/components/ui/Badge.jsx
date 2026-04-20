export default function Badge({ children, type }) {
    const styles = {
        abierto: "bg-yellow-100 text-yellow-700",
        proceso: "bg-blue-100 text-blue-700",
        cerrado: "bg-green-100 text-green-700",
    };

    return (
        <span className={`px-2 py-1 text-xs rounded-full ${styles[type]}`}>
            {children}
        </span>
    );
}