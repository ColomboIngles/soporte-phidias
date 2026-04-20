export default function ChartCard({ title, children }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 border">
            <h3 className="mb-4 font-semibold text-black dark:text-white">
                {title}
            </h3>
            {children}
        </div>
    );
}