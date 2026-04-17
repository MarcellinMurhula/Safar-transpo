import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { motion } from 'motion/react';
import { useAuth } from '../authContext';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { QrCode, Map as MapIcon, CreditCard, Clock, MapPin, AlertTriangle, X, Loader2 } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import QrScanner from 'react-qr-scanner';

export default function DashboardUS() {
  const { profile, user } = useAuth();
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [activeRegistration, setActiveRegistration] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'registrations'), 
      where('userId', '==', user.uid),
      where('status', '==', 'ongoing')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setActiveRegistration({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setActiveRegistration(null);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const handleScan = async (data: any) => {
    if (data && !scanning) {
      setScanning(true);
      try {
        // En un vrai cas, data.text contient l'ID du Trip ou du Bus
        const tripId = data.text; 
        
        await addDoc(collection(db, 'registrations'), {
          userId: user?.uid,
          tripId: tripId,
          busId: tripId.split('_')[0] || 'bus-123', // Dummy logic for demo
          startTime: serverTimestamp(),
          status: 'ongoing',
          startLat: -2.4833, // Default Bukavu
          startLng: 28.8333,
        });
        
        setShowScanner(false);
      } catch (err) {
        console.error("Scan error:", err);
      } finally {
        setScanning(false);
      }
    }
  };

  return (
    <Layout title="Espace Passager">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Stats & Action */}
        <div className="lg:col-span-4 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 rounded-[2.5rem] bg-gradient-to-br from-brand-primary to-brand-primary/80 text-black overflow-hidden relative group"
          >
            <div className="relative z-10">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">Solde disponible</p>
              <h3 className="text-4xl font-bold tracking-tighter mb-8">{formatCurrency(profile?.balance || 0)}</h3>
              <button className="w-full py-4 bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black/80 transition-colors">
                <CreditCard className="w-4 h-4" /> Recharger
              </button>
            </div>
            <CreditCard className="absolute -right-8 -bottom-8 w-40 h-40 text-black/5 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
             <StatCard icon={Clock} label="Trajets" value="24" />
             <StatCard icon={MapIcon} label="Km" value="128" />
          </div>

          <button 
            onClick={() => setShowScanner(true)}
            className="w-full py-10 rounded-[2.5rem] frosted-glass flex flex-col items-center justify-center gap-4 hover:border-brand-primary/40 group transition-all"
          >
            <div className="w-16 h-16 bg-brand-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-[0_0_30px_rgba(255,107,0,0.3)]">
              <QrCode className="w-8 h-8 text-white" />
            </div>
            <span className="text-sm font-bold uppercase tracking-widest">Scanner QR Code</span>
          </button>

          <button className="w-full py-4 rounded-2xl bg-brand-warning/10 border border-brand-warning/20 text-brand-warning flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider hover:bg-brand-warning/20 transition-colors">
            <AlertTriangle className="w-4 h-4" /> Alerte Sécurité
          </button>
        </div>

        {/* Right Column: Active Trip / Map */}
        <div className="lg:col-span-8 space-y-6">
          <div className="aspect-[16/9] lg:aspect-auto lg:h-[600px] rounded-[2.5rem] frosted-glass overflow-hidden relative">
            {/* Visual Placeholder for Google Maps with Radar Effect */}
            <div className="absolute inset-0 bg-[#0A0B0E] overflow-hidden flex items-center justify-center">
               <div className="absolute w-[800px] h-[800px] border border-white/5 rounded-full" />
               <div className="absolute w-[600px] h-[600px] border border-white/5 rounded-full" />
               <div className="absolute w-[400px] h-[400px] border border-white/5 rounded-full" />
               <div className="absolute w-[200px] h-[200px] border border-brand-primary/10 rounded-full" />
               
               <motion.div 
                 animate={{ rotate: 360 }}
                 transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                 className="absolute w-[800px] h-1 bg-gradient-to-r from-brand-primary/20 to-transparent origin-center"
               />

               <MapPin className="text-brand-accent w-8 h-8 relative z-10" />
               <div className="absolute top-10 left-10 p-6 frosted-glass rounded-3xl">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary mb-2">Lieu actuel</p>
                  <p className="font-bold">Bukavu Centre (Place de l'indépendance)</p>
               </div>
            </div>

            {activeRegistration && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-8 left-8 right-8 p-8 frosted-glass rounded-[2rem] border-brand-primary/20"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                   <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-brand-primary rounded-2xl flex items-center justify-center">
                         <MapPin className="text-black w-8 h-8" />
                      </div>
                      <div>
                         <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">Trajet en cours...</p>
                         <h4 className="text-xl font-bold">Bus {activeRegistration.busId}</h4>
                         <p className="text-white/40 text-xs">Démarré à {new Date(activeRegistration.startTime?.toDate()).toLocaleTimeString()}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-6">
                      <div className="text-right">
                         <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Estimation prix</p>
                         <p className="text-2xl font-bold text-brand-primary">$1.50</p>
                      </div>
                      <button className="px-8 py-4 bg-brand-warning text-white rounded-2xl font-bold">Terminer</button>
                   </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
           <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="w-full max-w-md frosted-glass rounded-[2.5rem] p-8 overflow-hidden relative"
           >
              <button 
                onClick={() => setShowScanner(false)}
                className="absolute top-6 right-6 p-2 rounded-xl frosted-glass text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h4 className="text-xl font-bold mb-6 text-center">Scanner QR Code du Bus</h4>
              
              <div className="aspect-square w-full bg-black rounded-3xl overflow-hidden relative border border-white/10 mb-6">
                <QrScanner
                  delay={300}
                  onError={(err: any) => console.error(err)}
                  onScan={handleScan}
                  style={{ width: '100%' }}
                />
                <div className="absolute inset-0 border-2 border-brand-primary border-dashed opacity-50 pointer-events-none" />
              </div>

              {scanning && (
                <div className="flex items-center justify-center gap-2 text-brand-primary font-bold animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" /> Traitement...
                </div>
              )}
           </motion.div>
        </div>
      )}
    </Layout>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="p-6 rounded-[2rem] frosted-glass flex flex-col gap-3">
      <Icon className="w-5 h-5 text-white/20" />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</p>
        <p className="text-xl font-bold leading-none">{value}</p>
      </div>
    </div>
  );
}
