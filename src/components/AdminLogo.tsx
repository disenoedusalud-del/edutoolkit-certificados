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

    if (isDark) {
        return (
            <div
                className="w-8 h-8 mr-3 flex-shrink-0"
                style={{
                    backgroundColor: 'var(--text-primary)',
                    maskImage: `url(${whiteIcon})`,
                    maskRepeat: 'no-repeat',
                    maskPosition: 'center',
                    maskSize: 'contain',
                    WebkitMaskImage: `url(${whiteIcon})`,
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    WebkitMaskSize: 'contain'
                }}
                aria-label="Isotipo EduSalud"
            />
        );
    }

    return (
        <div className="relative w-8 h-8 mr-3 flex-shrink-0">
            <Image
                src={colorIcon}
                alt="Isotipo EduSalud"
                fill
                className="object-contain"
                priority
            />
        </div>
    );
}
