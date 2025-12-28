'use client';

import Link from 'next/link';
import {
    GraduationCap,
    Files,
    Users,
    Gear,
    Bug
} from 'phosphor-react';
import type { AuthUser, UserRole } from '@/lib/auth';

interface AdminDashboardProps {
    user: AuthUser | null;
}

export function AdminDashboard({ user }: AdminDashboardProps) {

    const menuItems = [
        {
            title: 'Certificados',
            description: 'Administrar certificados emitidos y generar nuevos.',
            icon: Files,
            href: '/admin/certificados',
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
            requiredRole: 'VIEWER' as UserRole,
        },
        {
            title: 'Cursos',
            description: 'Gestionar catálogo de cursos y secuencias.',
            icon: GraduationCap,
            href: '/admin/cursos',
            color: 'text-green-500',
            bgColor: 'bg-green-500/10',
            requiredRole: 'VIEWER' as UserRole,
        },
        {
            title: 'Roles y Permisos',
            description: 'Control de acceso y roles de usuarios.',
            icon: Users,
            href: '/admin/roles',
            color: 'text-purple-500',
            bgColor: 'bg-purple-500/10',
            requiredRole: 'MASTER_ADMIN' as UserRole,
        },
        {
            title: 'Ajustes',
            description: 'Configuración general del sistema.',
            icon: Gear,
            href: '/admin/ajustes',
            color: 'text-gray-500',
            bgColor: 'bg-gray-500/10',
            requiredRole: 'ADMIN' as UserRole,
        },
        {
            title: 'Debug & Sistema',
            description: 'Herramientas de diagnóstico y estado.',
            icon: Bug,
            href: '/admin/debug',
            color: 'text-orange-500',
            bgColor: 'bg-orange-500/10',
            requiredRole: 'MASTER_ADMIN' as UserRole,
        }
    ];

    const roleHierarchy: Record<UserRole, number> = {
        VIEWER: 1,
        EDITOR: 2,
        ADMIN: 3,
        MASTER_ADMIN: 4,
    };

    const userRoleValue = roleHierarchy[user?.role || 'VIEWER'];

    const filteredMenuItems = menuItems.filter(item => {
        return userRoleValue >= roleHierarchy[item.requiredRole];
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-text-primary">
                    Bienvenido, {user?.email?.split('@')[0] || 'Usuario'}
                </h1>
                <p className="text-text-secondary">
                    Selecciona una opción para comenzar a gestionar la plataforma.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMenuItems.map((item) => {
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="group relative flex flex-col gap-4 p-6 rounded-xl border border-theme bg-theme-secondary hover:border-accent hover:shadow-lg transition-all duration-300"
                        >
                            <div className={`p-3 w-fit rounded-lg ${item.bgColor} ${item.color}`}>
                                <Icon size={32} weight="duotone" />
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-xl font-semibold text-text-primary group-hover:text-accent transition-colors">
                                    {item.title}
                                </h3>
                                <p className="text-sm text-text-secondary leading-relaxed">
                                    {item.description}
                                </p>
                            </div>

                            {/* Decorative arrow that appears on hover */}
                            <div className="absolute top-6 right-6 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                <svg
                                    className="w-5 h-5 text-accent"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 5l7 7-7 7"
                                    />
                                </svg>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
