import { cn } from "../../utils/cn";

export function Table({ children, className, wrapperClassName, ...props }) {
    return (
        <div className={cn("data-table-wrap", wrapperClassName)}>
            <table className={cn("data-table", className)} {...props}>
                {children}
            </table>
        </div>
    );
}

export function TableHead({ children, className, ...props }) {
    return (
        <thead className={className} {...props}>
            {children}
        </thead>
    );
}

export function TableBody({ children, className, ...props }) {
    return (
        <tbody className={className} {...props}>
            {children}
        </tbody>
    );
}

export function TableRow({ children, className, ...props }) {
    return (
        <tr className={className} {...props}>
            {children}
        </tr>
    );
}

export function TableHeaderCell({ children, className, ...props }) {
    return (
        <th className={className} {...props}>
            {children}
        </th>
    );
}

export function TableCell({ children, className, ...props }) {
    return (
        <td className={className} {...props}>
            {children}
        </td>
    );
}

export function TableEmpty({ children, className, colSpan = 1, ...props }) {
    return (
        <TableRow>
            <TableCell
                colSpan={colSpan}
                className={cn("py-10 text-center text-sm text-[color:var(--app-text-secondary)]", className)}
                {...props}
            >
                {children}
            </TableCell>
        </TableRow>
    );
}
