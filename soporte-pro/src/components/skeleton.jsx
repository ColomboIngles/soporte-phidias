export default function Skeleton() {
    return (
        <div className="space-y-6 animate-pulse">

            <div className="h-8 w-48 bg-gray-700 rounded" />

            <div className="grid md:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 bg-gray-800 rounded-2xl" />
                ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="h-64 bg-gray-800 rounded-2xl" />
                <div className="h-64 bg-gray-800 rounded-2xl" />
            </div>

        </div>
    );
}