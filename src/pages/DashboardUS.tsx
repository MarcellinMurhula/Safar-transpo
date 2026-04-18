import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../authContext';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { QrCode, Map as MapIcon, CreditCard, Clock, MapPin, AlertTriangle, X, Loader2, Navigation, DollarSign, ShieldCheck, ArrowRight } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import QrScanner from 'react-qr-scanner';

export default function DashboardUS() {
  const { profile, user } = useAuth();
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [activeRegistration, setActiveRegistration] = useState<any>(null);
  const [liveBuses, setLiveBuses] = useState<any[]>([]);
  const [pricing, setPricing] = useState({ basePrice: 500, pricePerKm: 200 });

  // Listen for user's active registration
  useEffect(() => {
    if (!user) return;
    const path = 'registrations';
    const q = query(
      collection(db, path), 
      where('userId', '==', user.uid),
      where('status', '==', 'ongoing')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setActiveRegistration({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setActiveRegistration(null);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, [user]);

  // Listen for Live Buses nearby
  useEffect(() => {
    const path = 'live_buses';
    const q = query(collection(db, path), where('isOnline', '==', true));
    const unsubscribe = onSnapshot(q, (snap) => {
      setLiveBuses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Pricing
  useEffect(() => {
    const fetchPricing = async () => {
      const path = 'config/pricing';
      try {
        const snap = await getDoc(doc(db, 'config', 'pricing'));
        if (snap.exists()) setPricing(snap.data() as any);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
      }
    };
    fetchPricing();
  }, []);

  const [showRecharge, setShowRecharge] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState('');
  const [alertDesc, setAlertDesc] = useState('');

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
      setScanning(true);
      await addDoc(collection(db, 'alerts'), {
        userId: user!.uid,
        userName: profile?.fullName,
        type: alertType,
        description: alertDesc,
        category: alertCategories.find(c => c.id === alertType)?.label,
        timestamp: serverTimestamp(),
        busId: activeRegistration?.busId || 'N/A',
        location: { lat: -2.4833, lng: 28.8333 }, // Simulated
        status: 'new'
      });
      setShowAlert(false);
      setAlertType('');
      setAlertDesc('');
      alert("Signalement envoyé à la Mairie. Restez vigilant.");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'alerts');
    } finally {
      setScanning(false);
    }
  };

  const [rechargeAmount, setRechargeAmount] = useState('5000');
  const [selectedOperator, setSelectedOperator] = useState('mpesa');

  const operators = [
    { id: 'mpesa', name: 'M-Pesa', color: 'bg-[#B01F24]', icon: 'M' },
    { id: 'orange', name: 'Orange Money', color: 'bg-[#FF6600]', icon: 'O' },
    { id: 'airtel', name: 'Airtel Money', color: 'bg-[#E11900]', icon: 'A' },
    { id: 'afrimoney', name: 'AfriMoney', color: 'bg-[#009639]', icon: 'Af' }
  ];

  const handleRechargeSubmit = async () => {
    const path = `profiles/${user?.uid}`;
    try {
      setScanning(true);
      await updateDoc(doc(db, 'profiles', user!.uid), {
        balance: (profile?.balance || 0) + parseInt(rechargeAmount)
      });
      setShowRecharge(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally {
      setScanning(false);
    }
  };

  const handleScan = async (data: any) => {
    if (data && !scanning) {
      setScanning(true);
      try {
        const busId = data.text; 
        const busPath = `buses/${busId}`;
        
        // Find bus to verify
        const busSnap = await getDoc(doc(db, 'buses', busId));
        if (!busSnap.exists()) {
          throw new Error("Bus non trouvé");
        }

        const regPath = 'registrations';
        await addDoc(collection(db, regPath), {
          userId: user?.uid,
          tripId: `trip_${Date.now()}`,
          busId: busId,
          startTime: serverTimestamp(),
          status: 'ongoing',
          startLat: -2.4833, 
          startLng: 28.8333,
        });
        
        setShowScanner(false);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'registrations');
      } finally {
        setScanning(false);
      }
    }
  };

  const handleCheckout = async () => {
    if (!activeRegistration) return;
    const path = `registrations/${activeRegistration.id}`;
    try {
      const cost = pricing.basePrice + (pricing.pricePerKm * 2); // Simulated distance of 2km
      
      await updateDoc(doc(db, 'registrations', activeRegistration.id), {
        status: 'finished',
        endTime: serverTimestamp(),
        totalCost: cost
      });

      const userPath = `profiles/${user?.uid}`;
      await updateDoc(doc(db, 'profiles', user!.uid), {
        balance: (profile?.balance || 0) - cost
      });
      
      setActiveRegistration(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
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
              <button 
                onClick={() => setShowRecharge(true)}
                className="w-full py-4 bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black/80 transition-all active:scale-95 shadow-xl"
              >
                <CreditCard className="w-4 h-4" /> Recharger Solde
              </button>
            </div>
            <CreditCard className="absolute -right-8 -bottom-8 w-40 h-40 text-black/5 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
             <StatCard icon={Clock} label="Trajets ce mois" value="24" />
             <StatCard icon={MapIcon} label="Distance totale" value="128 km" />
          </div>

          {!activeRegistration ? (
            <button 
              onClick={() => setShowScanner(true)}
              className="w-full py-10 rounded-[2.5rem] frosted-glass flex flex-col items-center justify-center gap-4 hover:border-brand-primary/40 group transition-all"
            >
              <div className="w-16 h-16 bg-brand-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-[0_0_30px_rgba(255,107,0,0.3)]">
                <QrCode className="w-8 h-8 text-white" />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest">Scanner QR pour Monter</span>
            </button>
          ) : (
            <div className="p-8 rounded-[2.5rem] bg-green-500/10 border border-green-500/20 text-center">
               <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Navigation className="text-white w-6 h-6" />
               </div>
               <p className="text-xs font-bold uppercase tracking-widest text-green-400 mb-1">Voyage en cours</p>
               <p className="text-sm opacity-60 mb-6">Vous êtes actuellement à bord du bus {activeRegistration.busId}</p>
               <button 
                onClick={handleCheckout}
                className="w-full py-4 bg-brand-warning text-white rounded-2xl font-bold hover:scale-[1.02] transition-transform active:scale-95"
               >
                 Scanner pour Descendre
               </button>
            </div>
          )}

          <button 
            onClick={() => setShowAlert(true)}
            className="w-full py-4 rounded-2xl bg-white/5 border border-glass-border text-brand-warning flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider hover:bg-brand-warning/10 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" /> Alerte Sécurité
          </button>
        </div>

        {/* Right Column: Interactive Map */}
        <div className="lg:col-span-8 space-y-6">
          <div className="aspect-[16/9] lg:aspect-auto lg:h-[700px] rounded-[3rem] frosted-glass overflow-hidden relative">
            <div className="absolute inset-0 bg-[#0A0B0E] overflow-hidden flex items-center justify-center">
               {/* Radar Waves */}
               <div className="absolute w-[800px] h-[800px] border border-white/5 rounded-full" />
               <div className="absolute w-[600px] h-[600px] border border-white/5 rounded-full" />
               <div className="absolute w-[400px] h-[400px] border border-white/5 rounded-full" />
               
               <motion.div 
                 animate={{ rotate: 360 }}
                 transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                 className="absolute w-[800px] h-1 bg-gradient-to-r from-brand-primary/10 to-transparent origin-center"
               />

               {/* Your Location */}
               <div className="relative z-10">
                  <div className="w-4 h-4 bg-brand-accent rounded-full animate-ping absolute inset-0" />
                  <MapPin className="text-brand-accent w-8 h-8 relative" />
               </div>

               {/* Live Buses Blips */}
               {liveBuses.map((bus) => {
                 const dx = (bus.lng - 28.852) * 5000;
                 const dy = (bus.lat + 2.492) * 5000;
                 return (
                   <motion.div
                    key={bus.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, x: dx, y: dy }}
                    className="absolute"
                   >
                     <div className="relative group">
                        <div className="w-4 h-4 bg-brand-primary rounded-full shadow-[0_0_15px_rgba(255,107,0,0.5)] flex items-center justify-center">
                           <Navigation className="w-2 h-2 text-white fill-white rotate-45" />
                        </div>
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 frosted-glass px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                           <p className="text-[10px] font-bold">BUS {bus.busId}</p>
                        </div>
                     </div>
                   </motion.div>
                 );
               })}

               <div className="absolute top-10 left-10 p-6 frosted-glass rounded-3xl border border-white/10 max-w-[280px]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary mb-2">Ma Position</p>
                  <p className="font-bold text-sm">Place de l'indépendance, Bukavu</p>
                  <div className="flex items-center gap-2 mt-4 text-[10px] font-medium text-black/40 dark:text-white/40">
                     <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
                     {liveBuses.length} bus actifs à proximité
                  </div>
               </div>

               <AnimatePresence>
                {activeRegistration && (
                  <motion.div 
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 100 }}
                    className="absolute bottom-8 left-8 right-8 p-8 frosted-glass rounded-[2.5rem] border border-brand-primary/20 bg-black/40"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                       <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-brand-primary/20 border border-brand-primary/20 rounded-2xl flex items-center justify-center">
                             <BusIcon className="text-brand-primary w-8 h-8" />
                          </div>
                          <div>
                             <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">Voyage en cours</p>
                             <h4 className="text-xl font-bold tracking-tight">Bus {activeRegistration.busId}</h4>
                             <p className="text-white/40 text-xs flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Depuis {new Date(activeRegistration.startTime?.toDate()).toLocaleTimeString()}
                             </p>
                          </div>
                       </div>
                       <div className="flex items-center gap-6">
                          <div className="text-right">
                             <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Prix Estimé</p>
                             <p className="text-3xl font-black text-brand-primary font-mono">{formatCurrency(pricing.basePrice + 400)}</p>
                          </div>
                          <button 
                            onClick={handleCheckout}
                            className="px-8 py-4 bg-brand-warning text-white rounded-2xl font-bold shadow-lg shadow-brand-warning/20 hover:scale-105 transition-transform"
                          >
                            Fin de trajet
                          </button>
                       </div>
                    </div>
                  </motion.div>
                )}
               </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Recharge Modal */}
      <AnimatePresence>
        {showRecharge && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md frosted-glass rounded-[2.5rem] p-10 relative overflow-hidden"
            >
              <button 
                onClick={() => setShowRecharge(false)}
                className="absolute top-8 right-8 p-2 rounded-xl frosted-glass text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h4 className="text-2xl font-bold mb-2 tracking-tighter">Recharger mon compte</h4>
              <p className="text-xs text-black/40 dark:text-white/40 mb-8 uppercase tracking-widest font-bold">Sélectionnez un opérateur mobile</p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {operators.map((op) => (
                  <button
                    key={op.id}
                    onClick={() => setSelectedOperator(op.id)}
                    className={cn(
                      "p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 group relative overflow-hidden",
                      selectedOperator === op.id 
                        ? "border-brand-primary bg-brand-primary/10" 
                        : "border-white/5 bg-white/5 hover:border-white/20"
                    )}
                  >
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-lg", op.color)}>
                      {op.icon}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider">{op.name}</span>
                    {selectedOperator === op.id && (
                      <div className="absolute top-2 right-2 w-4 h-4 bg-brand-primary rounded-full flex items-center justify-center">
                        <ShieldCheck className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div className="p-6 rounded-3xl bg-black/40 border border-white/10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40 mb-2">Montant à recharger (FC)</p>
                  <input 
                    type="number" 
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    className="w-full bg-transparent text-3xl font-black focus:outline-none text-brand-primary"
                  />
                </div>

                <button 
                  onClick={handleRechargeSubmit}
                  disabled={scanning}
                  className="w-full py-5 bg-brand-primary text-white rounded-[2rem] font-bold text-lg hover:scale-[1.02] transition-transform active:scale-95 shadow-xl shadow-brand-primary/20 flex items-center justify-center gap-3"
                >
                  {scanning ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Confirmer le Paiement <ArrowRight className="w-5 h-5" /></>}
                </button>
              </div>

              <div className="mt-8 flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#00ff66]" />
                <p className="text-[10px] text-white/20 font-bold uppercase tracking-[0.2em]">Transaction Sécurisée</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR Scanner Modal */}
      <AnimatePresence>
        {showScanner && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md frosted-glass rounded-[2.5rem] p-10 overflow-hidden relative"
            >
                <button 
                  onClick={() => setShowScanner(false)}
                  className="absolute top-8 right-8 p-2 rounded-xl frosted-glass border border-white/10 text-white/40 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>

                <h4 className="text-2xl font-bold mb-8 text-center tracking-tighter">Scanner QR Code du Bus</h4>
                
                <div className="aspect-square w-full bg-black/40 rounded-[2rem] overflow-hidden relative border border-white/10 mb-8 shadow-inner">
                  <QrScanner
                    delay={300}
                    onError={(err: any) => console.error(err)}
                    onScan={handleScan}
                    style={{ width: '100%' }}
                  />
                  <div className="absolute inset-10 border-2 border-brand-primary border-dashed rounded-2xl opacity-40 animate-pulse pointer-events-none" />
                </div>

                {scanning ? (
                  <div className="flex items-center justify-center gap-3 text-brand-primary font-bold text-sm tracking-widest uppercase">
                    <Loader2 className="w-5 h-5 animate-spin" /> Traitement en cours...
                  </div>
                ) : (
                  <p className="text-[10px] text-center text-white/40 font-bold uppercase tracking-widest">
                    Veuillez viser le code QR affiché à l'entrée du bus
                  </p>
                )}
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
              <p className="text-xs text-white/40 mb-8 uppercase tracking-widest font-bold">Aidez-nous à sécuriser Bukavu</p>

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
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Description locale / Détails</p>
                  <textarea 
                    value={alertDesc}
                    onChange={(e) => setAlertDesc(e.target.value)}
                    placeholder="Ex: Vol au niveau de la Place de l'indépendance..."
                    className="w-full bg-transparent text-sm focus:outline-none min-h-[100px] resize-none"
                  />
                </div>

                <button 
                  onClick={handleAlertSubmit}
                  disabled={scanning || !alertType}
                  className="w-full py-5 bg-brand-warning text-white rounded-[2rem] font-bold text-lg hover:scale-[1.02] transition-transform active:scale-95 shadow-xl shadow-brand-warning/20 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {scanning ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Envoyer l'alerte <ShieldCheck className="w-5 h-5" /></>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="p-6 rounded-[2rem] frosted-glass border border-white/5 flex flex-col gap-3">
      <Icon className="w-5 h-5 text-brand-primary/40" />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40">{label}</p>
        <p className="text-xl font-bold leading-none tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function BusIcon(props: any) {
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

