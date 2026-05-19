import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../authContext';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Bus, Settings, Plus, QrCode, TrendingUp, Users, DollarSign, ExternalLink, Navigation, CheckCircle, X, Printer, MapPin, Loader2, AlertTriangle, ShieldCheck, Radio, Map as MapIcon, Star, Volume2, Mic, Wifi, Cpu, Tablet } from 'lucide-react';
import { formatCurrency, cn, getEuclideanDistance, getManhattanDistance } from '../lib/utils';
import QRCode from 'qrcode';
import RadarView from '../components/RadarView';
import { aiService, VehicleHealthStatus } from '../services/aiService';

const center = { lat: -2.4833, lng: 28.8333 }; // Bukavu

import WeatherWidget from '../components/WeatherWidget';

export default function DashboardOW() {
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  
  const [buses, setBuses] = useState<any[]>([]);
  const [showAddBus, setShowAddBus] = useState(false);
  const [newBus, setNewBus] = useState({ 
    plate: '', 
    nickname: '',
    vehicleType: 'Minibus',
    vehicleYear: '2015',
    iotDevice: 'tablet', // 'tablet' or 'gps_chip'
    orange: '',
    airtel: '',
    vodacom: '',
    africell: ''
  });
  const [trackingBusId, setTrackingBusId] = useState<string | null>(null);
  const [livePassengers, setLivePassengers] = useState<any[]>([]);
  const [printingBus, setPrintingBus] = useState<any>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState('');
  const [alertDesc, setAlertDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [liveBuses, setLiveBuses] = useState<any[]>([]);

  // AI Health States
  const [healthStatus, setHealthStatus] = useState<VehicleHealthStatus | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);

  const toggleVoice = () => {
    if (isVoiceEnabled) {
      aiService.stopSpeaking();
    }
    setIsVoiceEnabled(!isVoiceEnabled);
  };

  const getAiHealth = async (bus: any) => {
    setLoadingHealth(true);
    try {
      const weatherData = await aiService.getBukavuWeather();
      const status = await aiService.getVehicleHealthStatus({
        type: bus.vehicleType,
        year: bus.vehicleYear,
        plate: bus.plateNumber,
        passengers: livePassengers.length,
        weather: weatherData
      });
      setHealthStatus(status);
      if (isVoiceEnabled) {
        aiService.speak(`État de santé pour ${bus.nickname}. Prédiction : ${status.prediction}. Attention aux conditions : ${weatherData.condition}.`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHealth(false);
    }
  };

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
    if (buses.length >= 1) {
      alert("En tant que propriétaire, vous ne pouvez gérer qu'un seul véhicule sur ce compte conformément à la réglementation de la Mairie.");
      return;
    }
    try {
      const busId = `bus_${Math.random().toString(36).substring(2, 11)}`;
      const regId = `ST-${Math.floor(100000 + Math.random() * 900000)}`; // Random ID given by marie

      const qrPayload = {
        busId: busId,
        ownerId: user?.uid,
        ownerName: profile?.fullName,
        plateNumber: newBus.plate,
        vehicleType: newBus.vehicleType,
        vehicleYear: newBus.vehicleYear,
        iotDevice: newBus.iotDevice,
        registrationId: regId,
        mobileMoney: {
          orange: newBus.orange,
          airtel: newBus.airtel,
          vodacom: newBus.vodacom,
          africell: newBus.africell
        }
      };

      const qrData = await QRCode.toDataURL(JSON.stringify(qrPayload));
      
      await setDoc(doc(db, 'buses', busId), {
        ...qrPayload,
        qrCodeData: qrData,
        id: busId,
        isApproved: false, // Must be approved by Mairie admin
        createdAt: serverTimestamp()
      });

      // Update profile status to pending if not already
      await updateDoc(doc(db, 'profiles', user!.uid), {
        isApproved: false,
        ownerDetails: {
          vehicleType: newBus.vehicleType,
          vehicleYear: newBus.vehicleYear,
          registrationId: regId,
          mobileMoney: qrPayload.mobileMoney
        }
      });

      setShowAddBus(false);
      setNewBus({ plate: '', nickname: '', vehicleType: 'Minibus', vehicleYear: '2015', iotDevice: 'tablet', orange: '', airtel: '', vodacom: '', africell: '' });
      alert("Véhicule enregistré ! L'approbation de la Mairie est requise avant toute mise en circulation.");
    } catch (err) {
      console.error("Add bus error:", err);
    }
  };

  const handleForceCheckout = async (regId: string) => {
    try {
      await updateDoc(doc(db, 'registrations', regId), { 
        status: 'completed',
        endTime: serverTimestamp()
      });
    } catch (err) {
      console.error("Force checkout error:", err);
    }
  };

  const toggleTracking = (busId: string) => {
    if (trackingBusId === busId) {
      setTrackingBusId(null);
    } else {
      setTrackingBusId(busId);
    }
  };

  /**
   * Simulated IoT Sensor: Auto-add passenger
   * Represents a sensor detecting proximity or physical entry.
   */
  const simulateIotEntry = async (busId: string) => {
    try {
      setLoading(true);
      await addDoc(collection(db, 'registrations'), {
        userId: `sensor_${Math.random().toString(36).substring(7)}`,
        tripId: `iot_auto_${Date.now()}`,
        busId: busId,
        startTime: serverTimestamp(),
        status: 'ongoing',
        startLat: center.lat + (Math.random() - 0.5) * 0.01,
        startLng: center.lng + (Math.random() - 0.5) * 0.01,
        detectionMethod: 'iot_sensor'
      });
    } catch (err) {
      console.error("IoT Entry Simulation Error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (profile?.status === 'pending') {
    return (
      <Layout title="Accès En Attente">
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full frosted-glass rounded-[3rem] p-10 text-center"
          >
            <div className="w-20 h-20 bg-brand-warning/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <Loader2 className="w-10 h-10 text-brand-warning animate-spin" />
            </div>
            <h2 className="text-3xl font-bold tracking-tighter mb-4">Demande en cours...</h2>
            <p className="text-xs text-[var(--app-text)]/60 leading-relaxed mb-8">
              Votre compte propriétaire est en cours de vérification par l'administration de la Mairie. Vous recevrez une notification dès que votre accès sera validé.
            </p>
            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs text-app-secondary italic">
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
        <div className="min-h-[60vh] flex items-center justify-center p-6">
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
    <Layout title={t('owner_space')}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Top Section: Metrics & Live Dashboard Toggle */}
        <div className="lg:col-span-12 flex flex-wrap gap-4 items-center justify-between">
           <div className="flex flex-wrap gap-6">
              <StatusMetric icon={Bus} label="Véhicules" value={buses.length.toString()} iconColor="text-brand-primary" bgColor="bg-brand-primary/10" />
              <StatusMetric icon={TrendingUp} label={t('live_revenue')} value={formatCurrency(livePassengers.length * 500)} iconColor="text-green-400" bgColor="bg-green-400/10" />
              <StatusMetric icon={Users} label={t('passengers_onboard')} value={livePassengers.length.toString()} iconColor="text-brand-accent" bgColor="bg-brand-accent/10" />
           </div>
           <div className="flex gap-2">
              <button 
                onClick={toggleVoice}
                className={cn(
                  "px-6 py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2",
                  isVoiceEnabled ? "bg-brand-primary text-white" : "bg-white/10 text-white/40 border border-glass-border"
                )}
              >
                {isVoiceEnabled ? <Volume2 className="w-5 h-5" /> : <Mic className="w-5 h-5 opacity-40" />}
                <span className="text-xs font-bold uppercase tracking-widest">{isVoiceEnabled ? "Voix ON" : "Voix OFF"}</span>
              </button>
              <button 
                onClick={() => aiService.stopSpeaking()}
                className="p-4 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all shadow-lg"
              >
                <X className="w-5 h-5" />
              </button>
           </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
           <WeatherWidget />
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
              <p className="text-xl font-bold tracking-tight">{t('report_incident')}</p>
           </div>
        </div>

        {/* Radar View for Owner */}
        <div className="lg:col-span-8 space-y-6">
           <div className="p-8 rounded-[3rem] frosted-glass relative overflow-hidden h-[500px] border border-brand-accent/10">
              <RadarView 
                liveBuses={liveBuses}
                center={center}
                activeBusId={trackingBusId}
                title={t('radar_driving_system')}
                subtitle={t('traffic_flow')}
                variant="accent"
              />
              <div className="absolute bottom-10 left-10 z-40 bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 max-w-xs pointer-events-none">
                 <p className="text-[var(--app-text)]/40 text-[10px] leading-relaxed">
                   Visualisez les autres transporteurs en temps réel pour optimiser vos trajets et éviter les zones saturées.
                 </p>
              </div>
           </div>
        </div>

        {/* Left Column: Bus List & GPS Control */}
        <div className="lg:col-span-12 space-y-6">
          <div className="flex items-center justify-between px-2">
             <h3 className="text-2xl font-bold tracking-tighter">{t('my_transport')}</h3>
             {buses.length < 1 && (
               <button 
                 onClick={() => setShowAddBus(true)}
                 className="px-6 py-3 bg-brand-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,107,0,0.2)]"
               >
                 <Plus className="w-4 h-4" /> {t('register_bus')}
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
                     <h4 className="text-xl font-bold mb-2">{bus.nickname}</h4>
                     <div className="flex items-center gap-2 mb-6">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest",
                          bus.isApproved ? "bg-green-500/20 text-green-400" : "bg-brand-warning/20 text-brand-warning"
                        )}>
                          {bus.isApproved ? "Approuvé par Mairie" : "En attente d'approbation"}
                        </span>
                        <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-full border border-white/5">
                           {bus.iotDevice === 'gps_chip' ? <Cpu className="w-2.5 h-2.5 text-brand-primary" /> : <Tablet className="w-2.5 h-2.5 text-brand-primary" />}
                           <span className="text-[8px] font-bold uppercase tracking-widest text-white/40">{bus.iotDevice === 'gps_chip' ? 'Chip GPS' : 'Tablette'}</span>
                        </div>
                     </div>

                     <div className="mt-auto flex items-center gap-4">
                        <button 
                          onClick={() => setPrintingBus(bus)}
                          className="w-16 h-16 rounded-xl border border-glass-border overflow-hidden hover:scale-105 transition-transform"
                        >
                          <img src={bus.qrCodeData} alt="QR" className="w-full h-full object-cover p-1" referrerPolicy="no-referrer" />
                        </button>
                        <div className="flex-1 space-y-2">
                           <button 
                             onClick={() => simulateIotEntry(bus.id)}
                             className="w-full py-2 bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/20 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 text-brand-primary"
                           >
                              <Wifi className="w-3 h-3 animate-pulse" /> {t('iot_detection')}
                           </button>
                           <button className="w-full py-2 bg-brand-accent/10 hover:bg-brand-accent/20 border border-brand-accent/20 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 text-brand-accent">
                              <TrendingUp className="w-3 h-3" /> Historique Trajets
                           </button>
                           <button 
                               onClick={() => getAiHealth(bus)}
                               disabled={loadingHealth}
                               className="w-full py-2 bg-brand-accent/20 hover:bg-brand-accent/30 border border-brand-accent/30 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 text-brand-accent"
                             >
                               {loadingHealth ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />} Santé IA
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

      {healthStatus && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-12 frosted-glass rounded-[3rem] p-10 border border-brand-accent/20 bg-brand-accent/5 overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 p-10 opacity-5">
             <Star className="w-40 h-40 text-brand-accent" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-brand-accent rounded-2xl flex items-center justify-center shadow-lg">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tighter">Bilan de Santé IA Strategique</h3>
                <p className="text-[10px] uppercase font-bold tracking-widest opacity-40">Propulsé par Gemini 1.5</p>
              </div>
              <button 
                onClick={() => setHealthStatus(null)}
                className="ml-auto p-2 rounded-lg hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
               <div className="p-6 rounded-3xl bg-white/5 border border-glass-border">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-accent mb-2">Carburant & Consommation</p>
                  <p className="text-sm font-bold opacity-80">{healthStatus.fuelLevel}</p>
               </div>
               <div className="p-6 rounded-3xl bg-white/5 border border-glass-border">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-accent mb-2">Pneumatiques</p>
                  <p className="text-sm font-bold opacity-80">{healthStatus.tireStatus}</p>
               </div>
               <div className="p-6 rounded-3xl bg-white/5 border border-glass-border">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-accent mb-2">Santé Moteur</p>
                  <p className="text-sm font-bold opacity-80">{healthStatus.engineHealth}</p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-6">
                  <div>
                    <h4 className="text-brand-accent font-bold text-sm uppercase tracking-widest mb-3">Prédiction Technique</h4>
                    <p className="text-sm leading-relaxed opacity-80">{healthStatus.prediction}</p>
                  </div>
                  <div>
                    <h4 className="text-brand-primary font-bold text-sm uppercase tracking-widest mb-3">Conseils de Sécurité</h4>
                    <p className="text-sm leading-relaxed opacity-80">{healthStatus.safetyAdvice}</p>
                  </div>
               </div>
               <div className="bg-brand-warning/5 border border-brand-warning/20 p-8 rounded-[2.5rem]">
                  <h4 className="text-brand-warning font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Analyse des Risques (Conduite)
                  </h4>
                  <ul className="space-y-3 mb-8">
                    {healthStatus.risks.map((risk, i) => (
                      <li key={i} className="flex items-center gap-3 text-xs text-brand-warning">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-warning" />
                        {risk}
                      </li>
                    ))}
                  </ul>

                  <h4 className="text-brand-primary font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Settings className="w-4 h-4" /> {t('maintenance')}
                  </h4>
                  <div className="space-y-4">
                    {healthStatus.maintenancePredictions?.map((pred, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5">
                         <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold">{pred.component}</span>
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[8px] font-bold uppercase",
                              pred.status === 'ok' ? "bg-green-500/20 text-green-400" :
                              pred.status === 'warning' ? "bg-brand-warning/20 text-brand-warning" :
                              "bg-red-500/20 text-red-500"
                            )}>
                              {pred.status}
                            </span>
                         </div>
                         <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-2">
                            <div 
                              className={cn(
                                "h-full transition-all duration-1000",
                                pred.status === 'ok' ? "bg-green-500" :
                                pred.status === 'warning' ? "bg-brand-warning" :
                                "bg-red-500"
                              )} 
                              style={{ width: `${pred.remainingLifePercent}%` }}
                            />
                         </div>
                         <p className="text-[10px] opacity-40 mb-1">Faille estimée : {pred.estimatedFailureDate}</p>
                         <p className="text-[10px] italic text-brand-primary/80">{pred.recommendation}</p>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        </motion.div>
      )}
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
                      <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-app-secondary">Passager</th>
                      <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-app-secondary">Bus</th>
                      <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-app-secondary">Heure Montée</th>
                      <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-app-secondary">Position</th>
                      <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-app-secondary">Actions</th>
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
                        <td className="px-8 py-5 text-sm text-[var(--app-text)]/60">
                          {reg.startTime ? new Date(reg.startTime.toDate()).toLocaleTimeString() : '...'}
                        </td>
                        <td className="px-8 py-5">
                           <div className="flex items-center gap-2 text-xs text-brand-accent">
                              <MapPin className="w-3 h-3" /> {reg.startLat.toFixed(4)}, {reg.startLng.toFixed(4)}
                           </div>
                        </td>
                        <td className="px-8 py-5">
                           <button 
                             onClick={() => handleForceCheckout(reg.id)}
                             className="px-4 py-2 bg-brand-warning/10 hover:bg-brand-warning/20 border border-brand-warning/20 text-brand-warning rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                           >
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
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-secondary">Safar'Transpo Bukavu</span>
                <button onClick={() => setPrintingBus(null)} className="text-app-secondary hover:text-[var(--app-text)]">
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
                <p className="text-xs font-medium max-w-[200px] leading-relaxed text-app-secondary">
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
                
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 block">Type de Véhicule</label>
                        <select 
                          value={newBus.vehicleType}
                          onChange={(e) => setNewBus({...newBus, vehicleType: e.target.value})}
                          className="w-full bg-white/5 border border-glass-border rounded-2xl px-5 py-4 focus:border-brand-primary outline-none transition-all"
                        >
                          <option value="Minibus">Minibus (Hiace)</option>
                          <option value="Bus">Gros Bus</option>
                          <option value="Taxi">Taxi Voiture</option>
                          <option value="Moto">Moto-Taxi</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 block">Technologie IoT</label>
                        <select 
                          value={newBus.iotDevice}
                          onChange={(e) => setNewBus({...newBus, iotDevice: e.target.value})}
                          className="w-full bg-white/5 border border-glass-border rounded-2xl px-5 py-4 focus:border-brand-primary outline-none transition-all"
                        >
                          <option value="tablet">Tablette Intégrée</option>
                          <option value="gps_chip">Puce GPS / Module IoT</option>
                        </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 block">Année de mise en mouvement</label>
                        <input 
                          type="number" 
                          value={newBus.vehicleYear}
                          onChange={(e) => setNewBus({...newBus, vehicleYear: e.target.value})}
                          className="w-full bg-white/5 border border-glass-border rounded-2xl px-5 py-4 focus:border-brand-primary outline-none transition-all"
                        />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">Coordonnées Mobile Money Actifs</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase opacity-40 ml-2">Orange Money</label>
                        <input 
                          type="tel" 
                          placeholder="089..."
                          value={newBus.orange}
                          onChange={(e) => setNewBus({...newBus, orange: e.target.value})}
                          className="w-full bg-white/5 border border-glass-border rounded-xl px-4 py-3 text-xs focus:border-[#FF6600] outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase opacity-40 ml-2">Airtel Money</label>
                        <input 
                          type="tel" 
                          placeholder="099..."
                          value={newBus.airtel}
                          onChange={(e) => setNewBus({...newBus, airtel: e.target.value})}
                          className="w-full bg-white/5 border border-glass-border rounded-xl px-4 py-3 text-xs focus:border-[#E11900] outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase opacity-40 ml-2">Vodacom M-Pesa</label>
                        <input 
                          type="tel" 
                          placeholder="081..."
                          value={newBus.vodacom}
                          onChange={(e) => setNewBus({...newBus, vodacom: e.target.value})}
                          className="w-full bg-white/5 border border-glass-border rounded-xl px-4 py-3 text-xs focus:border-[#B01F24] outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase opacity-40 ml-2">Africell</label>
                        <input 
                          type="tel" 
                          placeholder="090..."
                          value={newBus.africell}
                          onChange={(e) => setNewBus({...newBus, africell: e.target.value})}
                          className="w-full bg-white/5 border border-glass-border rounded-xl px-4 py-3 text-xs focus:border-[#009639] outline-none"
                        />
                      </div>
                    </div>
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
                <div className="p-4 rounded-2xl bg-black/5 dark:bg-black/40 border border-[var(--glass-border)]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--app-text)]/40 mb-2">Description / Détails de l'incident</p>
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
      <p className="text-[10px] font-bold uppercase tracking-widest text-app-secondary">{label}</p>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

