import Input from "./ui/Input";

export default function Filters({ onFilter }) {
    return (
        <div className="flex flex-col gap-3 md:flex-row">
            <Input
                placeholder="Buscar..."
                onChange={(e) => onFilter("search", e.target.value)}
                className="md:max-w-sm"
            />

            <select
                onChange={(e) => onFilter("estado", e.target.value)}
                className="app-input-shell md:max-w-[220px]"
            >
                <option value="">Todos</option>
                <option value="abierto">Abierto</option>
                <option value="en_proceso">En proceso</option>
                <option value="cerrado">Cerrado</option>
            </select>
        </div>
    );
}
