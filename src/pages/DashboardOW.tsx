import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../authContext';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp, deleteDoc, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Bus, Settings, Plus, QrCode, TrendingUp, Users, DollarSign, ExternalLink, Navigation, CheckCircle, X, Printer, MapPin, Loader2, AlertTriangle, ShieldCheck, Radio } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import QRCode from 'qrcode';

export default function DashboardOW() {
  const { profile, user } = useAuth();
  const [buses, setBuses] = useState<any[]>([]);
  const [showAddBus, setShowAddBus] = useState(false);
  const [newBus, setNewBus] = useState({ plate: '', nickname: '' });
  const [trackingBusId, setTrackingBusId] = useState<string | null>(null);
  const [livePassengers, setLivePassengers] = useState<any[]>([]);
  const [printingBus, setPrintingBus] = useState<any>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState('');
  const [alertDesc, setAlertDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [liveBuses, setLiveBuses] = useState<any[]>([]);

  // Listen for all Live Buses (Radar)
  useEffect(() => {
    const q = query(collection(db, 'live_buses'), where('isOnline', '==', true));
    const unsubscribe = onSnapshot(q, (snap) => {
      setLiveBuses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  const alertCategories = [
    { id: 'vol', label: 'Vol / Braquage', icon: ShieldCheck },
    { id: 'prix', label: 'Non respect de prix', icon: DollarSign },
    { id: 'kidnapping', label: 'Suspect Kidnapping', icon: AlertTriangle },
    { id: 'trafic', label: 'Trafic Illégal', icon: ShieldCheck },
    { id: 'accident', label: 'Accident', icon: MapPin },
    { id: 'autre', label: 'Autre incident', icon: AlertTriangle }
  ];

  const handleAlertSubmit = async () => {
    if (!alertType) return;
    try {
      setLoading(true);
      await addDoc(collection(db, 'alerts'), {
        userId: user!.uid,
        userName: profile?.fullName,
        type: alertType,
        description: alertDesc,
        category: alertCategories.find(c => c.id === alertType)?.label,
        timestamp: serverTimestamp(),
        busId: 'OWNER_REPORT',
        location: { lat: -2.4833, lng: 28.8333 }, // Simulated
        status: 'new'
      });
      setShowAlert(false);
      setAlertType('');
      setAlertDesc('');
      alert("Signalement envoyé à la Mairie.");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'buses'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      setBuses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  // GPS Tracking logic
  useEffect(() => {
    if (!trackingBusId) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          await setDoc(doc(db, 'live_buses', trackingBusId), {
            busId: trackingBusId,
            lat: latitude,
            lng: longitude,
            isOnline: true,
            lastUpdate: serverTimestamp()
          }, { merge: true });
        } catch (err) {
          console.error("GPS Update Error:", err);
        }
      },
      (err) => console.error("GPS Error:", err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setDoc(doc(db, 'live_buses', trackingBusId), { isOnline: false }, { merge: true });
    };
  }, [trackingBusId]);

  // Live Passengers Listener
  useEffect(() => {
    if (!user || buses.length === 0) return;
    const busIds = buses.map(b => b.id);
    const q = query(
      collection(db, 'registrations'), 
      where('busId', 'in', busIds.slice(0, 10)),
      where('status', '==', 'ongoing')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setLivePassengers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [user, buses]);

  const handleAddBus = async () => {
    if (!newBus.plate) return;
    try {
      const busId = `bus_${Math.random().toString(36).substring(2, 11)}`;
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

  const toggleTracking = (busId: string) => {
    if (trackingBusId === busId) {
      setTrackingBusId(null);
    } else {
      setTrackingBusId(busId);
    }
  };

  if (profile?.status === 'pending') {
    return (
      <Layout title="Accès En Attente">
        <div className="min-h-[60 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full frosted-glass rounded-[3rem] p-10 text-center"
          >
            <div className="w-20 h-20 bg-brand-warning/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <Loader2 className="w-10 h-10 text-brand-warning animate-spin" />
            </div>
            <h2 className="text-3xl font-bold tracking-tighter mb-4">Demande en cours...</h2>
            <p className="text-white/60 leading-relaxed mb-8">
              Votre compte propriétaire est en cours de vérification par l'administration de la Mairie. Vous recevrez une notification dès que votre accès sera validé.
            </p>
            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs text-black/40 dark:text-white/40 italic">
              Bukavu en mouvement — Service de régulation urbaine
            </div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  if (profile?.status === 'rejected') {
    return (
      <Layout title="Accès Refusé">
        <div className="min-h-[60 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full frosted-glass rounded-[3rem] p-10 text-center border-red-500/20"
          >
            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-3xl font-bold tracking-tighter mb-4">Accès Refusé</h2>
            <p className="text-white/60 leading-relaxed mb-8">
              Votre demande d'enregistrement en tant que propriétaire a été rejetée par l'administration. Veuillez contacter le bureau de transport de la Mairie pour plus d'informations.
            </p>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Espace Propriétaire & Conducteur">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Top Section: Metrics & Live Dashboard Toggle */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-5 gap-6">
           <StatusMetric icon={Bus} label="Véhicules" value={buses.length.toString()} iconColor="text-brand-primary" bgColor="bg-brand-primary/10" />
           <StatusMetric icon={TrendingUp} label="Recette Live" value={formatCurrency(livePassengers.length * 500)} iconColor="text-green-400" bgColor="bg-green-400/10" />
           <StatusMetric icon={Users} label="Passagers à Bord" value={livePassengers.length.toString()} iconColor="text-brand-accent" bgColor="bg-brand-accent/10" />
           <StatusMetric icon={Radio} label="Signaux GPS" value={liveBuses.length.toString()} iconColor="text-brand-warning" bgColor="bg-brand-warning/10" />
           <div 
             onClick={() => setShowAlert(true)}
             className="frosted-glass rounded-[2rem] p-6 flex flex-col gap-1 cursor-pointer hover:bg-brand-warning/10 transition-colors group border border-brand-warning/20"
           >
              <div className="flex items-center justify-between mb-4">
                 <div className="p-2.5 rounded-xl flex items-center justify-center bg-brand-warning/10 text-brand-warning group-hover:scale-110 transition-transform">
                    <AlertTriangle className="w-5 h-5" />
                 </div>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-warning">Urgences</p>
              <p className="text-xl font-bold tracking-tight">Signaler Incident</p>
           </div>
        </div>

        {/* Radar View for Owner */}
        <div className="lg:col-span-12 space-y-6">
           <div className="p-8 rounded-[3rem] frosted-glass relative overflow-hidden h-[400px]">
              <div className="absolute inset-0 bg-[#0A0B0E] flex items-center justify-center opacity-50">
                 <div className="absolute w-[600px] h-[600px] border border-white/5 rounded-full" />
                 <div className="absolute w-[300px] h-[300px] border border-white/5 rounded-full" />
                 <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute w-[600px] h-1 bg-gradient-to-r from-brand-accent/20 to-transparent origin-center"
                 />
                 {liveBuses.map((b) => (
                    <div 
                      key={b.id}
                      className={cn(
                        "absolute w-2 h-2 rounded-full transition-all duration-500",
                        b.busId === trackingBusId ? "bg-brand-primary shadow-[0_0_10px_#FF6B00] z-20" : "bg-brand-accent opacity-40"
                      )}
                      style={{ 
                        left: `calc(50% + ${(b.lng - 28.852) * 2000}px)`, 
                        top: `calc(50% + ${(b.lat + 2.492) * 2000}px)` 
                      }}
                    />
                 ))}
              </div>
              <div className="relative z-10">
                 <div className="flex items-center gap-3 mb-2">
                    <Navigation className="w-4 h-4 text-brand-accent animate-pulse" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand-accent">Système Radar de Conduite</p>
                 </div>
                 <h4 className="text-2xl font-bold tracking-tighter">Flux de Transport Bukavu</h4>
                 <p className="text-white/40 text-xs mt-2">Visualisez les autres transporteurs en temps réel pour optimiser vos trajets.</p>
              </div>
           </div>
        </div>

        {/* Left Column: Bus List & GPS Control */}
        <div className="lg:col-span-12 space-y-6">
          <div className="flex items-center justify-between px-2">
             <h3 className="text-2xl font-bold tracking-tighter">Mon Moyen de Transport</h3>
             {buses.length < 1 && (
               <button 
                 onClick={() => setShowAddBus(true)}
                 className="px-6 py-3 bg-brand-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,107,0,0.2)]"
               >
                 <Plus className="w-4 h-4" /> Enregistrer mon Bus
               </button>
             )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {buses.map((bus) => {
               const isTracking = trackingBusId === bus.id;
               return (
                <motion.div 
                  key={bus.id}
                  layoutId={bus.id}
                  className="frosted-glass rounded-[2.5rem] p-8 relative overflow-hidden group"
                >
                   <div className="relative z-10 h-full flex flex-col">
                     <div className="flex items-start justify-between mb-8">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                          isTracking ? "bg-brand-primary text-white animate-pulse" : "bg-white/5 text-white/40"
                        )}>
                           <Bus className="w-6 h-6" />
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => toggleTracking(bus.id)}
                            className={cn(
                              "p-2 rounded-xl border transition-all",
                              isTracking 
                                ? "bg-brand-warning border-brand-warning text-white" 
                                : "bg-white/5 border-glass-border text-white/40 hover:text-white"
                            )}
                            title={isTracking ? "Arrêter le tracking" : "Démarrer le tracking"}
                          >
                             <Navigation className={cn("w-4 h-4", isTracking && "animate-spin")} />
                          </button>
                        </div>
                     </div>
                     
                     <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary mb-1">{bus.plateNumber}</p>
                     <h4 className="text-xl font-bold mb-6">{bus.nickname}</h4>

                     <div className="mt-auto flex items-center gap-4">
                        <button 
                          onClick={() => setPrintingBus(bus)}
                          className="w-16 h-16 rounded-xl border border-glass-border overflow-hidden hover:scale-105 transition-transform"
                        >
                          <img src={bus.qrCodeData} alt="QR" className="w-full h-full object-cover p-1" referrerPolicy="no-referrer" />
                        </button>
                        <div className="flex-1 space-y-2">
                           <button className="w-full py-2 bg-brand-accent/10 hover:bg-brand-accent/20 border border-brand-accent/20 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 text-brand-accent">
                              <TrendingUp className="w-3 h-3" /> Historique Trajets
                           </button>
                           <button 
                              onClick={() => setPrintingBus(bus)}
                              className="w-full py-2 bg-white/5 hover:bg-white/10 border border-glass-border rounded-xl text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                            >
                              <Printer className="w-3 h-3" /> Imprimer Ticket QR
                           </button>
                        </div>
                     </div>
                   </div>
                   <Bus className="absolute -right-10 -bottom-10 w-48 h-48 text-white/5 rotate-[-15deg] group-hover:rotate-0 transition-transform duration-700 pointer-events-none" />
                </motion.div>
               )
             })}
          </div>
        </div>

        {/* Live Passenger Validation List */}
        <div className="lg:col-span-12 space-y-6">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-2xl font-bold tracking-tighter">Recettes en Direct & Passagers</h3>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-widest">
                 <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live Now
              </div>
           </div>

           <div className="frosted-glass rounded-[2.5rem] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-glass-border">
                      <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40">Passager</th>
                      <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40">Bus</th>
                      <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40">Heure Montée</th>
                      <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40">Position</th>
                      <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass-border/5">
                    {livePassengers.map((reg) => (
                      <tr key={reg.id} className="hover:bg-white/3 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-brand-accent/20 flex items-center justify-center text-brand-accent text-xs font-bold font-mono">
                                {reg.userId?.substring(0, 2).toUpperCase()}
                             </div>
                             <span className="text-sm font-medium">{reg.userId?.substring(0, 8)}...</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="px-3 py-1 rounded-lg bg-white/5 border border-glass-border text-[10px] font-bold font-mono uppercase">
                             {buses.find(b => b.id === reg.busId)?.nickname || reg.busId}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-sm text-white/60">
                          {new Date(reg.startTime?.toDate()).toLocaleTimeString()}
                        </td>
                        <td className="px-8 py-5">
                           <div className="flex items-center gap-2 text-xs text-brand-accent">
                              <MapPin className="w-3 h-3" /> {reg.startLat.toFixed(4)}, {reg.startLng.toFixed(4)}
                           </div>
                        </td>
                        <td className="px-8 py-5">
                           <button className="px-4 py-2 bg-brand-warning/10 hover:bg-brand-warning/20 border border-brand-warning/20 text-brand-warning rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all">
                              Forcer Sortie
                           </button>
                        </td>
                      </tr>
                    ))}
                    {livePassengers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center text-white/20 italic">
                           Aucun passager à bord actuellement
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
           </div>
        </div>
      </div>

      {/* Printing Modal */}
      <AnimatePresence>
        {printingBus && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="w-full max-w-sm bg-white text-black p-8 rounded-[2rem] flex flex-col items-center"
            >
              <div className="w-full flex justify-between items-center mb-6">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Safar'Transpo Bukavu</span>
                <button onClick={() => setPrintingBus(null)} className="text-black/40 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-center mb-8">
                <h4 className="text-2xl font-black uppercase tracking-tighter mb-1">{printingBus.nickname}</h4>
                <p className="text-xs font-mono font-bold text-black/50">{printingBus.plateNumber}</p>
              </div>

              <div className="p-4 bg-white border-2 border-dashed border-black/10 rounded-3xl mb-8">
                <img src={printingBus.qrCodeData} alt="Print QR" className="w-48 h-48" />
              </div>

              <div className="text-center mb-10">
                <p className="text-xs font-medium max-w-[200px] leading-relaxed opacity-60">
                   Affichez ce code à l'entrée de votre bus pour permettre aux passagers de scanner.
                </p>
              </div>

              <button 
                onClick={() => window.print()}
                className="w-full py-4 bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform active:scale-95"
              >
                <Printer className="w-5 h-5" /> Imprimer le Support QR
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Bus Modal */}
      <AnimatePresence>
        {showAddBus && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md frosted-glass rounded-[2.5rem] p-10 relative"
            >
                <button 
                  onClick={() => setShowAddBus(false)}
                  className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 border border-glass-border text-white/40 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>

                <h4 className="text-2xl font-bold mb-8 tracking-tighter">Enregistrer un Bus</h4>
                
                <div className="space-y-6">
                  <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 block">Plaque d'immatriculation</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 1234AB/22"
                        value={newBus.plate}
                        onChange={(e) => setNewBus({...newBus, plate: e.target.value})}
                        className="w-full bg-white/5 border border-glass-border rounded-2xl px-5 py-4 focus:border-brand-primary outline-none transition-all placeholder:text-white/10"
                      />
                  </div>
                  <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 block">Surnom du Bus</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Le Brave"
                        value={newBus.nickname}
                        onChange={(e) => setNewBus({...newBus, nickname: e.target.value})}
                        className="w-full bg-white/5 border border-glass-border rounded-2xl px-5 py-4 focus:border-brand-primary outline-none transition-all placeholder:text-white/10"
                      />
                  </div>
                </div>

                <div className="flex gap-4 mt-10">
                  <button 
                    onClick={() => setShowAddBus(false)}
                    className="flex-1 py-4 frosted-glass rounded-2xl font-bold hover:bg-white/5 transition-colors"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={handleAddBus}
                    disabled={!newBus.plate}
                    className="flex-1 py-4 bg-brand-primary text-white rounded-2xl font-bold shadow-[0_0_20px_rgba(255,107,0,0.3)] disabled:opacity-50"
                  >
                    Enregistrer le véhicule
                  </button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Alert Modal */}
      <AnimatePresence>
        {showAlert && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md frosted-glass rounded-[2.5rem] p-10 relative overflow-hidden"
            >
              <button 
                onClick={() => setShowAlert(false)}
                className="absolute top-8 right-8 p-2 rounded-xl frosted-glass text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h4 className="text-2xl font-bold mb-2 tracking-tighter text-brand-warning">Signaler une Alerte</h4>
              <p className="text-xs text-white/40 mb-8 uppercase tracking-widest font-bold">Sécurité Flotte Bukavu</p>

              <div className="grid grid-cols-2 gap-3 mb-8">
                {alertCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setAlertType(cat.id)}
                    className={cn(
                      "p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 group",
                      alertType === cat.id 
                        ? "border-brand-warning bg-brand-warning/10 text-brand-warning" 
                        : "border-white/5 bg-white/5 hover:border-white/10"
                    )}
                  >
                    <cat.icon className="w-5 h-5" />
                    <span className="text-[10px] font-bold text-center leading-tight">{cat.label}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Description / Détails de l'incident</p>
                  <textarea 
                    value={alertDesc}
                    onChange={(e) => setAlertDesc(e.target.value)}
                    placeholder="Détaillez le problème rencontré..."
                    className="w-full bg-transparent text-sm focus:outline-none min-h-[100px] resize-none"
                  />
                </div>

                <button 
                  onClick={handleAlertSubmit}
                  disabled={loading || !alertType}
                  className="w-full py-5 bg-brand-warning text-white rounded-[2rem] font-bold text-lg hover:scale-[1.02] transition-transform active:scale-95 shadow-xl shadow-brand-warning/20 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Envoyer le Rapport <ShieldCheck className="w-5 h-5" /></>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}

function StatusMetric({ icon: Icon, label, value, iconColor, bgColor }: { icon: any, label: string, value: string, iconColor: string, bgColor: string }) {
  return (
    <div className="frosted-glass rounded-[2rem] p-6 flex flex-col gap-1">
      <div className="flex items-center justify-between mb-4">
         <div className={cn("p-2.5 rounded-xl flex items-center justify-center", bgColor, iconColor)}>
            <Icon className="w-5 h-5" />
         </div>
         <div className="text-[10px] font-bold text-white/10 bg-white/5 px-2 py-0.5 rounded-md">LIVE</div>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40">{label}</p>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

