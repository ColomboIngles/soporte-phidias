export function calcularSLA(tickets) {
    let totalTiempo = 0;
    let cerrados = 0;

    tickets.forEach((t) => {
        if (t.estado === "cerrado") {
            const inicio = new Date(t.created_at);
            const fin = new Date(t.updated_at);

            const horas = (fin - inicio) / (1000 * 60 * 60);

            totalTiempo += horas;
            cerrados++;
        }
    });

    const promedio = cerrados ? totalTiempo / cerrados : 0;

    return {
        promedioHoras: promedio.toFixed(1),
        totalCerrados: cerrados,
    };
}