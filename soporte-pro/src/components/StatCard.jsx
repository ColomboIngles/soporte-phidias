export default function StatCard({ title, value, icon, extra }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 flex justify-between items-center border">
            <div>
                <p className="text-gray-500 text-sm">{title}</p>
                <h2 className="text-2xl font-bold text-black dark:text-white">
                    {value}
                </h2>
                {extra && (
                    <p className="text-xs text-gray-400 mt-1">{extra}</p>
                )}
            </div>

            <div className="text-2xl">{icon}</div>
        </div>
    );
}