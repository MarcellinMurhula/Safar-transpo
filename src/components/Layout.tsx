import React from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../authContext';
import { auth } from '../firebase';
import { LogOut, User, Bell, Bus, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function Layout({ children, title }: LayoutProps) {
  const { profile } = useAuth();

  const handleLogout = () => auth.signOut();

  return (
    <div className="min-h-screen bg-app-bg text-white relative overflow-hidden">
      {/* Background Blobs */}
      <div className="background-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <div className="relative z-10 p-6 h-screen flex gap-6 overflow-hidden">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:flex w-80 flex-col frosted-glass rounded-[24px] p-6 shrink-0 h-full overflow-y-auto">
          <div className="pb-8 border-b border-glass-border flex items-center gap-3">
            <div className="w-12 h-12 bg-brand-primary rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,107,0,0.3)]">
              <Bus className="text-white w-7 h-7" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tighter leading-none">Safar'Transpo</span>
              <span className="text-[10px] uppercase tracking-widest text-white/40 mt-1">Bukavu, RDC</span>
            </div>
          </div>

          <div className="mt-8 mb-4">
             <div className="flex items-center gap-4 mb-1">
                <div className="w-12 h-12 rounded-xl bg-brand-primary flex items-center justify-center font-bold text-lg">
                   {profile?.fullName?.substring(0, 2).toUpperCase() || 'ST'}
                </div>
                <div className="flex-1 truncate">
                   <p className="text-sm font-bold truncate leading-none">{profile?.fullName}</p>
                   <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Passager Premium</p>
                </div>
             </div>
          </div>

          <nav className="flex-1 space-y-2 mt-4">
            <NavItem icon={Bus} label="Trajet en direct" active />
            <NavItem icon={Bell} label="Notifications" />
            <NavItem icon={Settings} label="Paramètres" />
          </nav>

          <div className="mt-auto pt-6 border-t border-glass-border">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
            >
              <LogOut className="w-4 h-4" /> Se déconnecter
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden h-full">
          {/* Top Header */}
          <header className="frosted-glass rounded-[24px] px-8 py-4 flex items-center justify-between shrink-0">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">{title}</h2>
            <div className="flex items-center gap-4">
              <div className="px-4 py-1.5 rounded-full bg-white/5 border border-glass-border text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff66] shadow-[0_0_8px_#00ff66]" /> GPS Actif
              </div>
              <button className="p-2 rounded-xl bg-white/5 border border-glass-border text-white/40 hover:text-white transition-colors relative">
                 <Bell className="w-5 h-5" />
                 <span className="absolute top-2 right-2 w-2 h-2 bg-brand-primary rounded-full border-2 border-app-bg" />
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon: Icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <button className={cn(
      "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group",
      active ? "bg-brand-primary text-white" : "text-white/40 hover:text-white hover:bg-white/5"
    )}>
      <Icon className={cn("w-5 h-5", active ? "text-white" : "text-white/20 group-hover:text-white/60")} />
      <span className="text-sm font-medium">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />}
    </button>
  );
}
