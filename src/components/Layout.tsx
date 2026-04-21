import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../authContext';
import { auth, db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { LogOut, User, Bell, Bus, Settings, X, ShieldCheck, CreditCard, Clock, Menu, Sun, Moon, Home, ChevronLeft, DollarSign } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function Layout({ children, title }: LayoutProps) {
  const { profile, selectedRole, setSelectedRole, toggleTheme } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => auth.signOut();

  const getRoleLabel = () => {
    switch(selectedRole) {
      case 'admin': return 'Administrateur';
      case 'owner': return 'Propriétaire';
      default: return 'Passager Premium';
    }
  };

  const navItems = [
    { icon: Bus, label: "Tableau de Bord", path: "/dashboard", roles: ['user', 'owner', 'admin'] },
    { icon: Bell, label: "Notifications", onClick: () => setShowNotifications(true), roles: ['user', 'owner', 'admin'] },
    { icon: Settings, label: "Paramètres", onClick: () => setShowSettings(true), roles: ['user', 'owner', 'admin'] },
  ];

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] relative overflow-hidden transition-colors duration-300">
      {/* Background Blobs - Visible only in Dark mode for aesthetic */}
      <div className="background-blobs opacity-50 dark:opacity-100">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <div className="relative z-10 p-4 md:p-6 h-screen flex gap-6 overflow-hidden">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex w-80 flex-col frosted-glass rounded-[24px] p-6 shrink-0 h-full overflow-y-auto">
          <div className="pb-8 border-b border-glass-border flex items-center gap-3">
            <div className="w-12 h-12 bg-brand-primary rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,107,0,0.3)]">
              <Bus className="text-white w-7 h-7" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tighter leading-none">Safar'Transpo</span>
              <span className="text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40 mt-1">Bukavu, RDC</span>
            </div>
          </div>

          <div className="mt-8 mb-4">
             <div className="flex items-center gap-4 mb-1">
                <div className="w-12 h-12 rounded-xl bg-brand-primary flex items-center justify-center font-bold text-lg text-white">
                   {profile?.fullName?.substring(0, 2).toUpperCase() || 'ST'}
                </div>
                <div className="flex-1 truncate">
                   <p className="text-sm font-bold truncate leading-none">{profile?.fullName}</p>
                   <p className="text-[10px] text-black/40 dark:text-white/40 uppercase tracking-widest mt-1">{getRoleLabel()}</p>
                </div>
             </div>
          </div>

          {/* Removed Role Switcher as per user request (Only accessible via footer link) */}

          <nav className="flex-1 space-y-2 mt-4">
            {navItems.map((item, idx) => (
              <NavItem 
                key={idx}
                icon={item.icon} 
                label={item.label} 
                active={location.pathname === item.path} 
                onClick={item.onClick || (() => navigate(item.path!))} 
              />
            ))}
            <NavItem 
              icon={Home} 
              label="Quitter vers l'accueil" 
              onClick={() => navigate('/')} 
            />
          </nav>

          <div className="mt-auto pt-6 border-t border-glass-border space-y-2">
            <button 
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-black/60 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-sm font-medium"
            >
              <div className="flex items-center gap-3">
                {profile?.theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                {profile?.theme === 'light' ? 'Mode Sombre' : 'Mode Clair'}
              </div>
            </button>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/5 transition-all text-sm font-medium"
            >
              <LogOut className="w-4 h-4" /> Se déconnecter
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-4 md:gap-6 overflow-hidden h-full">
          {/* Top Header */}
          <header className="frosted-glass rounded-[24px] px-4 md:px-8 py-3 md:py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
               <button 
                 onClick={() => setIsMobileMenuOpen(true)}
                 className="lg:hidden p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-glass-border text-black dark:text-white"
               >
                  <Menu className="w-6 h-6" />
               </button>
               <h2 className="hidden md:block text-xs font-bold uppercase tracking-[0.2em] text-black/40 dark:text-white/40">{title}</h2>
               {location.pathname !== '/dashboard' && (
                 <button 
                   onClick={() => navigate(-1)}
                   className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-black dark:text-white flex items-center gap-1 text-[10px] font-bold uppercase"
                 >
                   <ChevronLeft className="w-3 h-3" /> Retour
                 </button>
               )}
            </div>
            
            <div className="flex items-center gap-2 md:gap-4">
              <div className="hidden sm:flex px-4 py-1.5 rounded-full bg-black/5 dark:bg-white/5 border border-glass-border text-[10px] font-bold uppercase tracking-wider items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff66] shadow-[0_0_8px_#00ff66]" /> GPS Actif
              </div>
              <button 
                onClick={() => setShowNotifications(true)}
                className="p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-glass-border text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors relative"
              >
                 <Bell className="w-5 h-5" />
                 <span className="absolute top-2 right-2 w-2 h-2 bg-brand-primary rounded-full border-2 border-white dark:border-app-bg" />
              </button>
              <button 
                onClick={toggleTheme}
                className="lg:hidden p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-glass-border text-black/40 dark:text-white/40 shadow-sm"
              >
                {profile?.theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto custom-scrollbar">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[150] flex justify-start">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsMobileMenuOpen(false)}
               className="fixed inset-0 bg-black/80 backdrop-blur-sm"
             />
             <motion.aside 
               initial={{ x: '-100%' }}
               animate={{ x: 0 }}
               exit={{ x: '-100%' }}
               transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               className="relative w-80 bg-[var(--app-bg)] h-full p-8 flex flex-col shadow-2xl"
             >
                <div className="flex items-center justify-between mb-10">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-primary rounded-lg flex items-center justify-center">
                         <Bus className="text-white w-6 h-6" />
                      </div>
                      <span className="text-lg font-bold tracking-tighter">Safar'Transpo</span>
                   </div>
                   <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-xl bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40">
                      <X className="w-6 h-6" />
                   </button>
                </div>

                <div className="mb-10 p-6 rounded-3xl bg-black/5 dark:bg-white/5 text-center">
                   <div className="w-16 h-16 rounded-2xl bg-brand-primary flex items-center justify-center font-bold text-2xl mx-auto mb-4 text-white">
                      {profile?.fullName?.substring(0, 2).toUpperCase() || 'ST'}
                   </div>
                   <h4 className="font-bold">{profile?.fullName}</h4>
                   <p className="text-[10px] text-black/40 dark:text-white/40 uppercase tracking-widest mt-1">{getRoleLabel()}</p>
                </div>

                <nav className="flex-1 space-y-2">
                   {navItems.map((item, idx) => (
                     <NavItem 
                        key={idx}
                        icon={item.icon} 
                        label={item.label} 
                        active={location.pathname === item.path} 
                        onClick={() => { 
                          if (item.onClick) {
                            item.onClick();
                          } else if (item.path) {
                            navigate(item.path);
                          }
                          setIsMobileMenuOpen(false); 
                        }} 
                     />
                   ))}
                   <NavItem icon={Home} label="Accueil" onClick={() => navigate('/')} />
                </nav>

                <div className="pt-8 border-t dark:border-white/5 space-y-4">
                   <button 
                     onClick={() => { toggleTheme(); setIsMobileMenuOpen(false); }}
                     className="w-full flex items-center justify-between py-2 text-sm font-medium opacity-60"
                   >
                     <span>Thème {profile?.theme === 'light' ? 'Sombre' : 'Clair'}</span>
                     {profile?.theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                   </button>
                   <button onClick={handleLogout} className="w-full py-4 bg-red-500/10 text-red-500 rounded-2xl font-bold flex items-center justify-center gap-2">
                      <LogOut className="w-4 h-4" /> Déconnexion
                   </button>
                </div>
             </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Notifications Modal & Settings Modal remain... */}
      {/* (Adding them here for completeness if you decide to keep their logic) */}
      <AnimatePresence>
        {showNotifications && (
           <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-md frosted-glass rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden"
              >
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">Alertes & Notifications</h3>
                    <button onClick={() => setShowNotifications(false)} className="p-2 text-white/40 hover:text-white">
                       <X className="w-6 h-6" />
                    </button>
                 </div>
                 
                 <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                    {/* Role based notification examples */}
                    {selectedRole === 'user' && (
                      <NotificationItem 
                        icon={Clock} 
                        title="Bus Proche" 
                        desc="Le bus BUK-045 est à 2 min de votre position." 
                        time="Maintenant"
                        color="text-brand-primary"
                      />
                    )}
                    {selectedRole === 'owner' && (
                      <NotificationItem 
                        icon={DollarSign} 
                        title="Paiement Reçu" 
                        desc="Un passager a payé 500 FC via QR Code." 
                        time="Il y a 1 min"
                        color="text-green-400"
                      />
                    )}
                    {selectedRole === 'admin' && (
                      <NotificationItem 
                        icon={ShieldCheck} 
                        title="Nouvelle Alerte" 
                        desc="Un incident de type 'Vol' a été signalé." 
                        time="Il y a 30 sec"
                        color="text-brand-warning"
                      />
                    )}
                    <NotificationItem 
                      icon={CreditCard} 
                      title="Solde Mis à jour" 
                      desc="Votre recharge de 5000 FC est effective." 
                      time="Il y a 1h"
                      color="text-brand-accent"
                    />
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
             <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-2xl frosted-glass rounded-[2.5rem] p-10 relative"
             >
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-2xl font-bold tracking-tighter">Préférences Système</h3>
                   <button onClick={() => setShowSettings(false)} className="p-2 text-white/40 hover:text-white">
                      <X className="w-6 h-6" />
                   </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-6">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">Interface</p>
                      <button 
                        onClick={toggleTheme}
                        className="w-full p-6 rounded-3xl bg-black/10 dark:bg-white/5 border border-white/5 flex items-center justify-between hover:border-brand-primary/40 transition-all"
                      >
                         <span className="font-bold">Mode d'affichage</span>
                         <div className="flex items-center gap-2">
                            {profile?.theme === 'light' ? <Sun className="w-5 h-5 text-brand-primary" /> : <Moon className="w-5 h-5 text-brand-accent" />}
                         </div>
                      </button>
                   </div>
                   <div className="space-y-6">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">Langue & Région</p>
                      <div className="w-full p-6 rounded-3xl bg-black/10 dark:bg-white/5 border border-white/5 flex items-center justify-between">
                         <span className="font-bold">Langue Locale</span>
                         <span className="text-xs opacity-40">Français (Congo)</span>
                      </div>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon: Icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group",
        active ? "bg-brand-primary text-white" : "text-black/40 dark:text-white/40 hover:text-[var(--app-text)] hover:bg-[var(--app-text)]/5"
      )}
    >
      <Icon className={cn("w-5 h-5", active ? "text-white" : "text-black/20 dark:text-white/20 group-hover:text-black/60 dark:group-hover:text-white/60")} />
      <span className="text-sm font-medium">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />}
    </button>
  );
}

function NotificationItem({ icon: Icon, title, desc, time, color }: any) {
  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-4 hover:bg-white/10 transition-colors">
       <div className={cn("w-10 h-10 rounded-xl bg-current/10 flex items-center justify-center shrink-0", color)}>
          <Icon className="w-5 h-5" />
       </div>
       <div className="flex-1 overflow-hidden">
          <p className="text-sm font-bold truncate leading-none">{title}</p>
          <p className="text-[10px] text-white/40 leading-relaxed mt-2 line-clamp-2">{desc}</p>
          <div className="flex items-center gap-3 mt-3">
             <span className="text-[8px] font-bold uppercase tracking-widest text-white/20">{time}</span>
             <div className="w-1 h-1 rounded-full bg-brand-primary shadow-[0_0_5px_var(--color-brand-primary)]" />
          </div>
       </div>
    </div>
  );
}

