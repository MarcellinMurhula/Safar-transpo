import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { motion } from 'motion/react';
import { useAuth } from '../authContext';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Bus, Settings, Plus, QrCode, TrendingUp, Users, DollarSign, ExternalLink } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import QRCode from 'qrcode';

export default function DashboardOW() {
  const { profile, user } = useAuth();
  const [buses, setBuses] = useState<any[]>([]);
  const [showAddBus, setShowAddBus] = useState(false);
  const [newBus, setNewBus] = useState({ plate: '', nickname: '' });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'buses'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      setBuses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const handleAddBus = async () => {
    if (!newBus.plate) return;
    try {
      const busId = `bus_${Math.random().toString(36).substr(2, 9)}`;
      const qrData = await QRCode.toDataURL(busId);
      
      await setDoc(doc(db, 'buses', busId), {
        ownerId: user?.uid,
        plateNumber: newBus.plate,
        nickname: newBus.nickname || newBus.plate,
        qrCodeData: qrData,
        id: busId
      });
      setShowAddBus(false);
      setNewBus({ plate: '', nickname: '' });
    } catch (err) {
      console.error("Add bus error:", err);
    }
  };

  return (
    <Layout title="Portail Propriétaire">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Header Stats */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-4 gap-6">
           <StatusMetric icon={Bus} label="Véhicules" value={buses.length.toString()} iconColor="text-brand-primary" bgColor="bg-brand-primary/10" />
           <StatusMetric icon={TrendingUp} label="Recettes" value={formatCurrency(1245.50)} iconColor="text-green-400" bgColor="bg-green-400/10" />
           <StatusMetric icon={Users} label="Passagers" value="482" iconColor="text-brand-accent" bgColor="bg-brand-accent/10" />
           <StatusMetric icon={DollarSign} label="Dépenses" value={formatCurrency(450.00)} iconColor="text-brand-warning" bgColor="bg-brand-warning/10" />
        </div>

        {/* Bus Management */}
        <div className="lg:col-span-12 space-y-6">
          <div className="flex items-center justify-between px-2">
             <h3 className="text-2xl font-bold tracking-tighter">Mes Bus</h3>
             <button 
               onClick={() => setShowAddBus(true)}
               className="px-6 py-2 bg-brand-primary text-black rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-transform"
             >
               <Plus className="w-4 h-4" /> Ajouter un Bus
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {buses.map((bus) => (
               <motion.div 
                 key={bus.id}
                 layoutId={bus.id}
                 className="frosted-glass rounded-[2.5rem] p-8 relative overflow-hidden group"
               >
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-8">
                       <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                          <Bus className="w-6 h-6 text-white/40" />
                       </div>
                       <button className="p-2 text-white/20 hover:text-white transition-colors">
                          <Settings className="w-4 h-4" />
                       </button>
                    </div>
                    
                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary mb-1">{bus.plateNumber}</p>
                    <h4 className="text-xl font-bold mb-6">{bus.nickname}</h4>

                    <div className="flex items-center gap-4">
                       <img src={bus.qrCodeData} alt="QR Code" className="w-20 h-20 rounded-xl border border-white/10" referrerPolicy="no-referrer" />
                       <div className="flex-1 space-y-2">
                          <button className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                             <TrendingUp className="w-3 h-3" /> Dashboard Live
                          </button>
                          <button className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 text-brand-primary">
                             <QrCode className="w-3 h-3" /> Imprimer QR
                          </button>
                       </div>
                    </div>
                  </div>
                  <Bus className="absolute -right-10 -bottom-10 w-48 h-48 text-white/5 rotate-[-15deg] group-hover:rotate-0 transition-transform duration-700 pointer-events-none" />
               </motion.div>
             ))}

             {buses.length === 0 && (
               <div className="col-span-full py-20 frosted-glass rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-white/20">
                  <Bus className="w-12 h-12" />
                  <p className="text-sm font-medium italic">Aucun bus enregistré</p>
               </div>
             )}
          </div>
        </div>
      </div>

      {/* Add Bus Modal */}
      {showAddBus && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
           <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="w-full max-w-md frosted-glass rounded-[2.5rem] p-10"
           >
              <h4 className="text-2xl font-bold mb-8 tracking-tighter">Nouveau Véhicule</h4>
              
              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 block">Plaque d'immatriculation</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 1234AB/22"
                      value={newBus.plate}
                      onChange={(e) => setNewBus({...newBus, plate: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-brand-primary outline-none transition-colors"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 block">Surnom du Bus</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Le Brave"
                      value={newBus.nickname}
                      onChange={(e) => setNewBus({...newBus, nickname: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-brand-primary outline-none transition-colors"
                    />
                 </div>
              </div>

              <div className="flex gap-4 mt-10">
                 <button 
                  onClick={() => setShowAddBus(false)}
                  className="flex-1 py-4 glass-morphism rounded-2xl font-bold"
                 >
                   Annuler
                 </button>
                 <button 
                  onClick={handleAddBus}
                  className="flex-1 py-4 bg-brand-primary text-black rounded-2xl font-bold"
                 >
                   Enregistrer
                 </button>
              </div>
           </motion.div>
        </div>
      )}
    </Layout>
  );
}

function StatusMetric({ icon: Icon, label, value, iconColor, bgColor }: { icon: any, label: string, value: string, iconColor: string, bgColor: string }) {
  return (
    <div className="frosted-glass rounded-[2rem] p-6 flex flex-col gap-1">
      <div className="flex items-center justify-between mb-4">
         <div className={cn("p-2 rounded-xl flex items-center justify-center", bgColor, iconColor)}>
            <Icon className="w-5 h-5" />
         </div>
         <ExternalLink className="w-4 h-4 text-white/10" />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</p>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
