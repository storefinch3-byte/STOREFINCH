import type { Metadata } from 'next';
import './style.css';
export const metadata: Metadata = { title: 'Controle Financeiro', description: 'Painel financeiro da empresa' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body>{children}</body></html>; }
