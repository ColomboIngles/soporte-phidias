import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ role, allow, children }) {
    if (!allow.includes(role)) {
        return <Navigate to="/" />;
    }

    return children;
}