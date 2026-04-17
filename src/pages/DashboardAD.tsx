import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { motion } from 'motion/react';
import { useAuth } from '../authContext';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Shield, Map as MapIcon, Settings, BarChart3, AlertOctagon, Radio, MapPin, Save, Sliders } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

export default function DashboardAD() {
  const { profile } = useAuth();
  const [pricing, setPricing] = useState({ basePrice: 0.5, pricePerKm: 0.2 });
  const [stats, setStats] = useState({ totalBuses: 42, activeBuses: 28, totalRevenue: 15420.50, activeTrips: 184 });

  // In real app, we would fetch these from a 'config' collection
  useEffect(() => {
    const fetchConfig = async () => {
      const configDoc = await getDoc(doc(db, 'config', 'pricing'));
      if (configDoc.exists()) {
        setPricing(configDoc.data() as any);
      }
    };
    fetchConfig();
  }, []);

  const handleUpdatePricing = async () => {
    // In real app, write to Firestore
    alert("Tarification mise à jour pour tout le réseau de Bukavu !");
  };

  return (
    <Layout title="Contrôle Mairie">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Radar View - Big Center Map */}
        <div className="lg:col-span-8 space-y-6">
          <div className="aspect-[4/3] lg:h-[700px] rounded-[3rem] frosted-glass overflow-hidden relative border-brand-primary/10">
             <div className="absolute inset-0 bg-[#0A0B0E] flex items-center justify-center">
                {/* Radar Grid */}
                <div className="absolute w-[900px] h-[900px] border border-white/5 rounded-full" />
                <div className="absolute w-[600px] h-[600px] border border-white/5 rounded-full" />
                <div className="absolute w-[300px] h-[300px] border border-brand-primary/20 rounded-full" />
                
                {/* Radar Sweep */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="absolute w-[900px] h-2 bg-gradient-to-r from-brand-primary/30 to-transparent origin-center"
                />

                {/* Simulated Bus Blips */}
                <BusBlip x={100} y={-50} id="BUK-01" speed={2} />
                <BusBlip x={-150} y={100} id="BUK-04" speed={1.5} />
                <BusBlip x={200} y={150} id="BUK-09" speed={3} />
                <BusBlip x={-50} y={-200} id="BUK-12" speed={1} />

                <div className="absolute top-10 left-10 p-6 frosted-glass rounded-3xl border-brand-primary/20">
                   <div className="flex items-center gap-3 mb-2">
                      <Radio className="w-4 h-4 text-brand-primary animate-pulse" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-primary">Live Radar Bukavu</p>
                   </div>
                   <h4 className="text-xl font-bold tracking-tighter">Flux en direct</h4>
                </div>

                <div className="absolute bottom-10 right-10 flex gap-4">
                   <div className="px-6 py-4 frosted-glass rounded-2xl flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center">
                         <Bus className="w-5 h-5 text-brand-primary" />
                      </div>
                      <div>
                         <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Bus Actifs</p>
                         <p className="text-xl font-bold">{stats.activeBuses}</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Control Panel - Right Column */}
        <div className="lg:col-span-4 space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-8 rounded-[2.5rem] frosted-glass border-brand-accent/20"
          >
             <div className="flex items-center gap-3 mb-8">
                <Sliders className="w-5 h-5 text-brand-accent" />
                <h4 className="text-lg font-bold tracking-tight">Régulation des Prix</h4>
             </div>

             <div className="space-y-6 mb-10">
                <div>
                   <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3 block">Prix de base (Démarrage)</label>
                   <div className="flex items-center gap-4">
                      <input 
                        type="range" min="0.1" max="2" step="0.1"
                        value={pricing.basePrice}
                        onChange={(e) => setPricing({...pricing, basePrice: parseFloat(e.target.value)})}
                        className="flex-1 accent-brand-accent"
                      />
                      <span className="w-16 text-right font-mono font-bold text-brand-accent">${pricing.basePrice.toFixed(2)}</span>
                   </div>
                </div>
                <div>
                   <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3 block">Coût par Kilomètre (Route)</label>
                   <div className="flex items-center gap-4">
                      <input 
                        type="range" min="0.05" max="1" step="0.01"
                        value={pricing.pricePerKm}
                        onChange={(e) => setPricing({...pricing, pricePerKm: parseFloat(e.target.value)})}
                        className="flex-1 accent-brand-accent"
                      />
                      <span className="w-16 text-right font-mono font-bold text-brand-accent">${pricing.pricePerKm.toFixed(2)}</span>
                   </div>
                </div>
             </div>

             <button 
              onClick={handleUpdatePricing}
              className="w-full py-4 bg-brand-accent text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-brand-accent/80 transition-all"
             >
               <Save className="w-4 h-4" /> Appliquer les Tarifs
             </button>
          </motion.div>

          {/* Quick Alerts List */}
          <div className="p-8 rounded-[2.5rem] frosted-glass">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                   <AlertOctagon className="w-5 h-5 text-brand-warning" />
                   <h4 className="text-lg font-bold tracking-tight">Alertes Récentes</h4>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-brand-warning/10 text-brand-warning text-[10px] font-bold">2 NOUVELLES</span>
             </div>

             <div className="space-y-4">
                <AlertItem type="Panne" bus="BUK-012" time="Il y a 2 min" loc="Place Mulamba" />
                <AlertItem type="Litige" bus="BUK-045" time="Il y a 15 min" loc="Cimpunda" />
                <AlertItem type="Retard" bus="BUK-007" time="Il y a 32 min" loc="Kadutu" />
             </div>
          </div>

          <div className="p-8 rounded-[2.5rem] bg-brand-accent/5 border border-brand-accent/10 flex items-center gap-6">
             <div className="w-12 h-12 bg-brand-accent/20 rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-brand-accent" />
             </div>
             <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Revenu Total Réseau</p>
                <p className="text-2xl font-bold tracking-tight">{formatCurrency(stats.totalRevenue)}</p>
             </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function BusBlip({ x, y, id, speed }: { x: number, y: number, id: string, speed: number }) {
  return (
    <motion.div 
      animate={{ 
        x: [x, x + 20, x], 
        y: [y, y - 10, y],
        opacity: [0.3, 1, 0.3]
      }}
      transition={{ duration: speed, repeat: Infinity, ease: "easeInOut" }}
      className="absolute group cursor-pointer"
      style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
    >
       <div className="relative">
          <div className="w-3 h-3 bg-brand-primary rounded-full shadow-[0_0_15px_rgba(255,215,0,0.5)]" />
          <div className="absolute top-4 left-1/2 -translate-x-1/2 frosted-glass px-3 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
             <p className="text-[10px] font-bold">{id}</p>
          </div>
       </div>
    </motion.div>
  );
}

function AlertItem({ type, bus, time, loc }: { type: string, bus: string, time: string, loc: string }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer">
       <div className="w-1.5 h-1.5 rounded-full bg-brand-warning shadow-[0_0_8px_rgba(206,17,38,0.5)]" />
       <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
             <h5 className="text-xs font-bold">{type} - {bus}</h5>
             <span className="text-[10px] text-white/20">{time}</span>
          </div>
          <p className="text-[10px] text-white/40 flex items-center gap-1">
             <MapPin className="w-3 h-3" /> {loc}
          </p>
       </div>
    </div>
  );
}

function Bus(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    >
      <path d="M8 6v6"></path><path d="M15 6v6"></path><path d="M2 12h20"></path><path d="M2 18h20"></path><path d="M3 12v6"></path><path d="M21 12v6"></path><path d="M10 18v4"></path><path d="M14 18v4"></path><path d="M13 6h-2"></path><path d="M6 6h12a2 2 0 0 1 2 2v4H4V8a2 2 0 0 1 2-2Z"></path>
    </svg>
  );
}
