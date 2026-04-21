import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../authContext';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Shield, Map as MapIcon, Settings, BarChart3, AlertOctagon, Radio, MapPin, Save, Sliders, Fuel, LineChart, AlertTriangle, Users, ShieldCheck } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';

export default function DashboardAD() {
  const { profile } = useAuth();
  const [pricing, setPricing] = useState({ 
    basePrice: 500, 
    pricePerKm: 100,
    fuelBasePrice: 2800,
    roadStateFactor: 1.0 
  });
  const [stats, setStats] = useState({ totalBuses: 42, activeBuses: 0, totalRevenue: 15420.50, activeTrips: 184 });
  const [liveBuses, setLiveBuses] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [updating, setUpdating] = useState(false);
  const [pendingOwners, setPendingOwners] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'radar' | 'owners' | 'alerts'>('radar');

  // Listen for Pending Owners
  useEffect(() => {
    const q = query(collection(db, 'profiles'), where('role', '==', 'owner'), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setPendingOwners(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleApproveOwner = async (uid: string, accept: boolean) => {
    try {
      await updateDoc(doc(db, 'profiles', uid), { status: accept ? 'accepted' : 'rejected' });
    } catch (err) {
      console.error("Owner approval error:", err);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'live_buses'), where('isOnline', '==', true));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLiveBuses(data);
      setStats(prev => ({ ...prev, activeBuses: data.length }));
    });
    return () => unsubscribe();
  }, []);

  // Listen for Alerts
  useEffect(() => {
    const q = query(collection(db, 'alerts'), where('status', '==', 'new'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setAlerts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Listen for Pricing Config
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'config', 'pricing'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as any;
        setPricing({
          basePrice: data.basePrice || 500,
          pricePerKm: data.pricePerKm || 100,
          fuelBasePrice: data.fuelBasePrice || 2800,
          roadStateFactor: data.roadStateFactor || 1.0
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleUpdatePricing = async () => {
    setUpdating(true);
    try {
      await setDoc(doc(db, 'config', 'pricing'), {
        ...pricing,
        lastUpdated: serverTimestamp()
      });
    } catch (err) {
      console.error("Pricing update error:", err);
    } finally {
      setTimeout(() => setUpdating(false), 800);
    }
  };

  return (
    <Layout title="Tour de Contrôle - Bukavu Mairie">
      <div className="flex flex-col gap-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-4 px-2">
           <TabButton 
             active={activeTab === 'radar'} 
             onClick={() => setActiveTab('radar')} 
             icon={Radio} 
             label="Radar Live" 
             count={liveBuses.length} 
           />
           <TabButton 
             active={activeTab === 'owners'} 
             onClick={() => setActiveTab('owners')} 
             icon={Users} 
             label="Propriétaires" 
             count={pendingOwners.length} 
             urgent={pendingOwners.length > 0}
           />
           <TabButton 
             active={activeTab === 'alerts'} 
             onClick={() => setActiveTab('alerts')} 
             icon={AlertOctagon} 
             label="Gestion Conflits" 
             count={alerts.length} 
             urgent={alerts.length > 0}
           />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Display Area */}
          <div className="lg:col-span-8 space-y-6 flex flex-col">
            <AnimatePresence mode="wait">
              {activeTab === 'radar' && (
                <motion.div 
                  key="radar"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex-1 min-h-[600px] rounded-[3rem] frosted-glass overflow-hidden relative border-brand-primary/10"
                >
                  <div className="absolute inset-0 bg-black/40 dark:bg-[#0A0B0E] flex items-center justify-center">
                    {/* Radar Grid */}
                    <div className="absolute w-[900px] h-[900px] border border-[var(--glass-border)] rounded-full" />
                    <div className="absolute w-[600px] h-[600px] border border-[var(--glass-border)] rounded-full" />
                    <div className="absolute w-[300px] h-[300px] border border-brand-primary/20 rounded-full" />
                    
                    {/* Radar Sweep */}
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      className="absolute w-[900px] h-2 bg-gradient-to-r from-brand-primary/30 to-transparent origin-center"
                    />

                    {/* Actual Live Bus Blips */}
                    {liveBuses.map((bus, idx) => {
                      const dx = (bus.lng - 28.852) * 5000;
                      const dy = (bus.lat + 2.492) * 5000;
                      return (
                        <BusBlip key={bus.id} x={dx} y={dy} id={bus.busId} speed={2 + (idx % 3)} />
                      );
                    })}

                    {liveBuses.length === 0 && (
                      <div className="text-[var(--app-text)]/10 flex flex-col items-center gap-4 animate-pulse">
                        <Radio className="w-16 h-16" />
                        <p className="text-sm font-medium">Recherche de signaux GPS en cours...</p>
                      </div>
                    )}

                    <div className="absolute top-10 left-10 p-6 frosted-glass rounded-3xl border-brand-primary/20">
                      <div className="flex items-center gap-3 mb-2">
                        <Radio className="w-4 h-4 text-brand-primary animate-pulse" />
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-primary">Radar Temps-Réel (Bukavu)</p>
                      </div>
                      <h4 className="text-xl font-bold tracking-tighter">Fiche de Contrôle</h4>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'owners' && (
                <motion.div 
                  key="owners"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="flex-1 min-h-[600px] rounded-[3rem] frosted-glass p-8 overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-10">
                    <div>
                      <h3 className="text-3xl font-bold tracking-tighter">Approbation des Propriétaires</h3>
                      <p className="text-xs text-black/40 dark:text-white/40 uppercase tracking-widest font-bold mt-1">Gérer les accès au réseau Safar'Transpo</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {pendingOwners.map((owner) => (
                      <div key={owner.id} className="p-6 rounded-3xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-between group hover:border-brand-primary/20 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center font-bold text-brand-primary text-xl">
                            {owner.fullName?.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h5 className="font-bold text-lg">{owner.fullName}</h5>
                            <p className="text-xs text-black/40 dark:text-white/40">{owner.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => handleApproveOwner(owner.id, false)}
                            className="px-6 py-3 rounded-xl bg-red-500/10 text-red-500 font-bold text-xs uppercase tracking-widest hover:bg-red-500 transition-all hover:text-white"
                          >
                            Refuser
                          </button>
                          <button 
                            onClick={() => handleApproveOwner(owner.id, true)}
                            className="px-6 py-3 rounded-xl bg-brand-primary text-white font-bold text-xs uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-105 transition-all"
                          >
                            Accepter
                          </button>
                        </div>
                      </div>
                    ))}
                    {pendingOwners.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-[400px] text-black/20 dark:text-white/20">
                         <ShieldCheck className="w-16 h-16 mb-4 opacity-50" />
                         <p className="text-sm font-medium italic">Aucune demande en attente</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'alerts' && (
                <motion.div 
                  key="alerts"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="flex-1 min-h-[600px] rounded-[3rem] frosted-glass p-8 overflow-y-auto"
                >
                   <div className="flex items-center justify-between mb-8">
                     <h3 className="text-3xl font-bold tracking-tighter">Gestion des Conflits Live</h3>
                     <span className="px-3 py-1 rounded-full bg-brand-warning/10 text-brand-warning text-[10px] font-bold uppercase tracking-widest">
                       {alerts.length} incidents non résolus
                     </span>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {alerts.map((alert) => (
                        <AlertItem 
                          key={alert.id}
                          id={alert.id}
                          type={alert.category || alert.type} 
                          bus={alert.busId} 
                          time={alert.timestamp ? new Date(alert.timestamp.toDate()).toLocaleTimeString() : '...'} 
                          loc={alert.description || 'Position Bukavu'}
                          level={alert.type === 'kidnapping' || alert.type === 'accident' ? 'critical' : 'warning'} 
                        />
                      ))}
                   </div>
                   {alerts.length === 0 && (
                     <div className="flex flex-col items-center justify-center h-[400px] text-black/20 dark:text-white/20">
                        <AlertTriangle className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-sm font-medium italic">Le réseau est calme. Aucun incident.</p>
                     </div>
                   )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Side Control Panel */}
          <div className="lg:col-span-4 space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-8 rounded-[2.5rem] frosted-glass border-brand-accent/20"
            >
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                     <Sliders className="w-5 h-5 text-brand-accent" />
                     <h4 className="text-lg font-bold tracking-tight">Régulation Financière</h4>
                  </div>
                  {updating && <div className="text-brand-accent animate-pulse font-bold text-[10px]">SAVING...</div>}
               </div>

               <div className="space-y-8 mb-10">
                  <PricingSlider 
                    label="Prix de Base (FC)"
                    value={pricing.basePrice} 
                    min={200} max={2000} step={100}
                    onChange={(v) => setPricing(p => ({ ...p, basePrice: v }))} 
                  />
                  <PricingSlider 
                    label="Prix par Km (FC)"
                    value={pricing.pricePerKm} 
                    min={50} max={500} step={10}
                    onChange={(v) => setPricing(p => ({ ...p, pricePerKm: v }))} 
                  />
                  <PricingSlider 
                    label="Carburant Base (FC/L)"
                    icon={Fuel}
                    value={pricing.fuelBasePrice} 
                    min={2000} max={4500} step={50}
                    onChange={(v) => setPricing(p => ({ ...p, fuelBasePrice: v }))} 
                  />
                  <PricingSlider 
                    label="État du Réseau (Facteur)"
                    icon={LineChart}
                    value={pricing.roadStateFactor} 
                    min={0.8} max={2.0} step={0.1}
                    onChange={(v) => setPricing(p => ({ ...p, roadStateFactor: v }))} 
                  />
               </div>

               <button 
                onClick={handleUpdatePricing}
                className="w-full py-5 bg-brand-accent text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-brand-accent/80 transition-all shadow-[0_0_30px_rgba(0,194,255,0.3)]"
               >
                 <Save className="w-4 h-4" /> Sauvegarder Config
               </button>
            </motion.div>

            <div className="p-8 rounded-[2.5rem] frosted-glass">
               <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                     <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40">Statistiques Réseau</p>
                     <BarChart3 className="w-4 h-4 text-brand-primary" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <QuickStat label="Total Revenu" value={formatCurrency(stats.totalRevenue)} />
                     <QuickStat label="Courses Actives" value={stats.activeTrips.toString()} />
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function TabButton({ active, onClick, icon: Icon, label, count, urgent }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all relative overflow-hidden",
        active 
          ? "bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20" 
          : "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-black/40 dark:text-white/40 hover:bg-black/10 dark:hover:bg-white/10"
      )}
    >
      <Icon className={cn("w-5 h-5", active ? "text-white" : "text-black/40 dark:text-white/40")} />
      <span className="text-sm font-bold uppercase tracking-widest">{label}</span>
      {count > 0 && (
        <span className={cn(
          "ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold",
          active ? "bg-white text-brand-primary" : urgent ? "bg-red-500 text-white" : "bg-white/10"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

function QuickStat({ label, value }: any) {
  return (
    <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5">
       <p className="text-[8px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40 mb-1">{label}</p>
       <p className="font-bold text-sm truncate">{value}</p>
    </div>
  );
}


function PricingSlider({ label, value, min, max, step, onChange, icon: Icon = Settings }: any) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40 mb-3 flex items-center gap-2">
         <Icon className="w-3 h-3" /> {label}
      </label>
      <div className="flex items-center gap-4">
          <input 
            type="range" min={min} max={max} step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="flex-1 accent-brand-accent cursor-pointer"
          />
          <span className="w-20 text-right font-mono font-bold text-brand-accent text-sm">
            {label.includes('Facteur') ? value.toFixed(1) : value.toLocaleString()}
          </span>
      </div>
    </div>
  )
}

function BusBlip({ x, y, id, speed }: any) {
  return (
    <motion.div 
      initial={{ scale: 0 }}
      animate={{ 
        x: [x - 2, x + 2, x - 2], 
        y: [y + 2, y - 2, y + 2],
        scale: 1,
        opacity: [0.6, 1, 0.6]
      }}
      transition={{ duration: speed, repeat: Infinity, ease: "easeInOut" }}
      className="absolute group cursor-pointer"
      style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
    >
       <div className="relative">
          <div className="w-4 h-4 bg-brand-primary rounded-full shadow-[0_0_20px_rgba(255,107,0,0.6)] flex items-center justify-center">
             <div className="w-1.5 h-1.5 bg-white rounded-full" />
          </div>
          <div className="absolute top-6 left-1/2 -translate-x-1/2 frosted-glass px-3 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 whitespace-nowrap pointer-events-none z-50">
             <p className="text-[10px] font-bold text-brand-primary">{id}</p>
             <p className="text-[8px] text-black/40 dark:text-white/40">Tracking Actif</p>
          </div>
       </div>
    </motion.div>
  );
}

function AlertItem({ id, type, bus, time, loc, level }: { id: string, type: string, bus: string, time: string, loc: string, level: string }) {
  const handleResolve = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'alerts', id), { status: 'resolved' });
    } catch (err) {
      console.error("Error resolving alert:", err);
    }
  };

  const dotColor = level === 'critical' ? 'bg-red-500 shadow-red-500/50' : level === 'warning' ? 'bg-orange-500 shadow-orange-500/50' : 'bg-blue-500 shadow-blue-500/50';
  
  return (
    <div className="flex flex-col gap-3 p-4 rounded-2xl bg-black/5 dark:bg-white/3 hover:bg-black/10 dark:hover:bg-white/5 border border-[var(--glass-border)] transition-colors group relative">
       <div className="flex items-center gap-4">
          <div className={cn("w-2 h-2 rounded-full shadow-[0_0_10px]", dotColor)} />
          <div className="flex-1 overflow-hidden">
             <div className="flex items-center justify-between mb-1">
                <h5 className="text-xs font-bold group-hover:text-brand-warning transition-colors">{type} - {bus}</h5>
                <span className="text-[10px] text-black/20 dark:text-white/20">{time}</span>
             </div>
             <p className="text-[10px] text-black/40 dark:text-white/40 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {loc}
             </p>
          </div>
       </div>
       <button 
         onClick={handleResolve}
         className="w-full py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 rounded-xl text-[8px] font-bold uppercase tracking-widest transition-all"
       >
         Marquer Résolu
       </button>
    </div>
  );
}

