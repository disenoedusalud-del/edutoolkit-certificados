"use client";

import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";
import { useEffect, useState } from "react";

export function AdminLogo() {
    const { theme } = useTheme();
    // Estado local para evitar errores de hidratación inicial
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Isotipo para temas oscuros
    const whiteIcon = "/images/edusalud_icono_blanco.svg";
    // Isotipo para temas claros
    const colorIcon = "/images/edusalud_icono_color.svg";

    // Determinar si es un tema oscuro
    const isDark = theme === "dark" || theme === "tokyo-night" || theme === "neo-brutalism-dark";

    if (!mounted) {
        // Renderizar un placeholder invisible del mismo tamaño para evitar layout shift
        return <div className="w-8 h-8" />;
    }

    return (
        <div className="flex items-center gap-2 mr-3 flex-shrink-0">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-black text-sm italic">ET</span>
            </div>
            <span className="text-lg font-black tracking-tighter text-text-primary border-b-2 border-red-600/30">
                EduToolkit
            </span>
        </div>
    );
}
