import useNotifications from "../hooks/useNotifications";

export default function Notifications({ user }) {
    const notificaciones = useNotifications(user);

    return (
        <div className="relative">
            <div className="cursor-pointer">
                🔔
                {notificaciones.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 rounded-full">
                        {notificaciones.length}
                    </span>
                )}
            </div>

            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 shadow-xl rounded-lg p-3">
                {notificaciones.length === 0 && <p>No hay notificaciones</p>}

                {notificaciones.map(n => (
                    <div key={n.id} className="text-sm border-b py-2">
                        {n.mensaje}
                    </div>
                ))}
            </div>
        </div>
    );
}