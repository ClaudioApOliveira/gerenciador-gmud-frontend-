import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Gmud from "./pages/Gmud";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

export function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                    element={(
                        <ProtectedRoute>
                            <Layout />
                        </ProtectedRoute>
                    )}
                >
                    <Route path="/" element={<Home />} />
                    <Route path="/gmud" element={<Gmud />} />
                </Route>
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    )
}