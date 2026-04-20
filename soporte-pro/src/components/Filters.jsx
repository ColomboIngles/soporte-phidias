import Input from "./ui/Input";

export default function Filters({ onFilter }) {
    return (
        <div className="flex flex-col md:flex-row gap-3">

            <Input
                placeholder="Buscar..."
                onChange={(e) => onFilter("search", e.target.value)}
            />

            <select
                onChange={(e) => onFilter("estado", e.target.value)}
                className="px-3 py-2 rounded-xl border dark:bg-gray-800"
            >
                <option value="">Todos</option>
                <option value="abierto">Abierto</option>
                <option value="en_proceso">En proceso</option>
                <option value="cerrado">Cerrado</option>
            </select>

        </div>
    );
}
