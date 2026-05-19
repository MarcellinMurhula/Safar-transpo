import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../authContext';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Bus, QrCode, Users, Navigation, X, Printer, MapPin, Loader2, AlertTriangle, ShieldCheck, Map as MapIcon, Star, Volume2, Mic, Clock, Send, MessageSquare, Settings } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import QRCode from 'qrcode';
import RadarView from '../components/RadarView';
import { aiService, VehicleHealthStatus } from '../services/aiService';
import WeatherWidget from '../components/WeatherWidget';

const center = { lat: -2.4833, lng: 28.8333 }; // Bukavu

export default function DashboardDR() {
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  
  const [assignedBus, setAssignedBus] = useState<any>(null);
  const [livePassengers, setLivePassengers] = useState<any[]>([]);
  const [liveBuses, setLiveBuses] = useState<any[]>([]);
  const [trackingActive, setTrackingActive] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState('');
  const [alertDesc, setAlertDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [healthStatus, setHealthStatus] = useState<VehicleHealthStatus | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [showQR, setShowQR] = useState(false);
  
  // Chatbot state
  const [messages, setMessages] = useState<any[]>([
    { role: 'assistant', content: "Bonjour ! Je suis votre copilote Gemini. Prêt pour votre service à Bukavu ?" }
  ]);
  const [input, setInput] = useState('');

  // Fetch assigned bus
  useEffect(() => {
    if (!user) return;
    // In a real app, drivers are linked to a specific bus. For now, we fetch the first bus where they are mentioned (simulated)
    // or simply look for a bus they are assigned to.
    const q = query(collection(db, 'buses'), where('driverEmail', '==', user.email));
    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setAssignedBus({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        // Fallback for demo: show any bus if none assigned specifically
        const q2 = query(collection(db, 'buses'), where('isApproved', '==', true));
        const unsub2 = onSnapshot(q2, (s2) => {
           if (!s2.empty) setAssignedBus({ id: s2.docs[0].id, ...s2.docs[0].data() });
        });
        return () => unsub2();
      }
    });
    return () => unsubscribe();
  }, [user]);

  // GPS Tracking logic
  useEffect(() => {
    if (!assignedBus || !trackingActive) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          await setDoc(doc(db, 'live_buses', assignedBus.id), {
            busId: assignedBus.id,
            lat: latitude,
            lng: longitude,
            isOnline: true,
            lastUpdate: serverTimestamp(),
            nickname: assignedBus.nickname,
            plateNumber: assignedBus.plateNumber
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
      setDoc(doc(db, 'live_buses', assignedBus.id), { isOnline: false }, { merge: true });
    };
  }, [assignedBus, trackingActive]);

  // Live Passengers Listener
  useEffect(() => {
    if (!assignedBus) return;
    const q = query(
      collection(db, 'registrations'), 
      where('busId', '==', assignedBus.id),
      where('status', '==', 'ongoing')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setLivePassengers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [assignedBus]);

  // Radar Listener
  useEffect(() => {
    const q = query(collection(db, 'live_buses'), where('isOnline', '==', true));
    const unsubscribe = onSnapshot(q, (snap) => {
      setLiveBuses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  const getAiHealth = async () => {
    if (!assignedBus) return;
    setLoadingHealth(true);
    try {
      const weatherData = await aiService.getBukavuWeather();
      const status = await aiService.getVehicleHealthStatus({
        type: assignedBus.vehicleType,
        year: assignedBus.vehicleYear,
        plate: assignedBus.plateNumber,
        passengers: livePassengers.length,
        weather: weatherData
      });
      setHealthStatus(status);
      if (isVoiceEnabled) {
        aiService.speak(`Bonjour Chauffeur. L'état du véhicule est : ${status.prediction}. Conseil de sécurité : ${status.safetyAdvice}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHealth(false);
    }
  };

  const alertCategories = [
    { id: 'vol', label: 'Vol / Braquage', icon: ShieldCheck },
    { id: 'kidnapping', label: 'Suspect Kidnapping', icon: AlertTriangle },
    { id: 'accident', label: 'Accident', icon: MapPin },
    { id: 'panne', label: 'Panne Critique', icon: Settings }
  ];

  const handleAlertSubmit = async () => {
    if (!alertType || !assignedBus) return;
    try {
      setLoading(true);
      await addDoc(collection(db, 'alerts'), {
        userId: user!.uid,
        userName: profile?.fullName,
        type: alertType,
        description: alertDesc,
        category: alertCategories.find(c => c.id === alertType)?.label,
        timestamp: serverTimestamp(),
        busId: assignedBus.id,
        location: { lat: center.lat, lng: center.lng }, // Should be real GPS
        status: 'new'
      });
      setShowAlert(false);
      setAlertType('');
      setAlertDesc('');
      alert("Signalement envoyé à la Mairie et au Propriétaire.");
      if (isVoiceEnabled) {
        aiService.speak("Alerte envoyée. Restez calme, les secours sont informés.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !assignedBus) return;
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    
    try {
      const response = await aiService.getChatResponse(input, `En tant que conducteur à Bukavu pour le bus ${assignedBus.nickname}, réponds de manière concise et donne un conseil de conduite.`);
      const assistantMsg = { role: 'assistant', content: response };
      setMessages(prev => [...prev, assistantMsg]);
      if (isVoiceEnabled) {
        aiService.speak(response);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Layout title={t('driver')}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Header: Transport Info */}
        <div className="lg:col-span-12">
          {assignedBus ? (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="frosted-glass rounded-[2rem] p-6 flex flex-wrap items-center justify-between gap-6 border border-brand-accent/20 bg-brand-accent/5"
            >
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-brand-primary rounded-2xl flex items-center justify-center shadow-lg">
                    <Bus className="text-white w-8 h-8" />
                 </div>
                 <div>
                    <h3 className="text-2xl font-bold tracking-tighter">{assignedBus.nickname}</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-app-secondary">
                      {assignedBus.plateNumber} • {assignedBus.vehicleYear} • {assignedBus.vehicleType}
                    </p>
                 </div>
              </div>
              <div className="flex gap-4">
                <div className="text-right">
                   <p className="text-[10px] font-bold uppercase tracking-widest text-app-secondary">{t('live_revenue')}</p>
                   <p className="text-xl font-bold text-green-400">{formatCurrency(livePassengers.length * 500)}</p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-bold uppercase tracking-widest text-app-secondary">{t('passengers_onboard')}</p>
                   <p className="text-xl font-bold">{livePassengers.length}</p>
                </div>
              </div>
              <div className="flex gap-2">
                 <button 
                   onClick={() => setTrackingActive(!trackingActive)}
                   className={cn(
                     "px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg",
                     trackingActive ? "bg-red-500 text-white" : "bg-brand-primary text-white"
                   )}
                 >
                   <Navigation className={cn("w-4 h-4", trackingActive && "animate-spin")} />
                   {trackingActive ? "STOP GPS" : "DÉMARRER GPS"}
                 </button>
                 <button 
                  onClick={() => setShowQR(true)}
                  className="p-3 rounded-xl bg-white/10 border border-glass-border text-white hover:bg-white/20"
                 >
                   <QrCode className="w-5 h-5" />
                 </button>
              </div>
            </motion.div>
          ) : (
            <div className="frosted-glass rounded-[2rem] p-10 text-center flex flex-col items-center gap-4">
               <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
               <p className="text-sm font-medium opacity-40">Recherche de votre véhicule assigné...</p>
            </div>
          )}
        </div>

        {/* Left Column: Radar & AI Chat */}
        <div className="lg:col-span-8 space-y-6">
           {/* Radar */}
           <div className="frosted-glass rounded-[2.5rem] p-6 h-[400px] relative overflow-hidden border border-brand-accent/10">
              <RadarView 
                liveBuses={liveBuses}
                center={center}
                activeBusId={assignedBus?.id}
                title={t('radar_live')}
                subtitle={t('traffic_flow')}
                variant="accent"
              />
           </div>

           {/* AI Chatbot */}
           <div className="frosted-glass rounded-[2.5rem] p-6 h-[400px] flex flex-col border border-brand-primary/10">
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-brand-primary" />
                  <h4 className="text-sm font-bold uppercase tracking-widest">Assistant Gemini</h4>
                </div>
                <button 
                  onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                  className={cn("p-2 rounded-lg transition-colors", isVoiceEnabled ? "text-brand-primary" : "text-white/20")}
                >
                  {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 px-2 mb-4 custom-scrollbar">
                {messages.map((m, i) => (
                  <div key={i} className={cn("max-w-[80%] p-4 rounded-2xl text-xs leading-relaxed", m.role === 'user' ? "ml-auto bg-brand-primary text-white" : "bg-white/5 border border-glass-border text-white/80")}>
                    {m.content}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 p-2 bg-black/20 rounded-2xl border border-white/5">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Posez une question à l'IA..."
                  className="flex-1 bg-transparent border-none outline-none text-xs px-2"
                />
                <button 
                  onClick={handleSendMessage}
                  className="p-2 bg-brand-primary rounded-xl text-white hover:scale-105 transition-transform"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
           </div>
        </div>

        {/* Right Column: Passengers & Alerts */}
        <div className="lg:col-span-4 space-y-6">
           <WeatherWidget />

           <div className="frosted-glass rounded-[2.5rem] p-6 border border-brand-warning/20">
              <div className="flex items-center justify-between mb-6">
                 <h4 className="text-sm font-bold uppercase tracking-widest text-brand-warning">{t('report_incident')}</h4>
                 <AlertTriangle className="w-5 h-5 text-brand-warning" />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                 {alertCategories.map(cat => (
                   <button 
                     key={cat.id}
                     onClick={() => { setAlertType(cat.id); setShowAlert(true); }}
                     className="p-3 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold text-center hover:bg-brand-warning/10 transition-colors"
                   >
                     {cat.label}
                   </button>
                 ))}
              </div>
           </div>

           <div className="frosted-glass rounded-[2.5rem] p-6 flex flex-col h-[400px]">
              <div className="flex items-center justify-between mb-6">
                 <h4 className="text-sm font-bold uppercase tracking-widest text-brand-accent">Passagers à Bord</h4>
                 <div className="px-2 py-1 bg-brand-accent/20 rounded-lg text-[10px] font-bold text-brand-accent">
                   {livePassengers.length}
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                 {livePassengers.map((p, i) => (
                   <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center text-[10px] font-bold text-brand-accent">
                          {p.userId?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold">PASS-{(p.userId || '').substring(0, 5)}</p>
                          <p className="text-[8px] opacity-40">{new Date(p.startTime?.toDate()).toLocaleTimeString()}</p>
                        </div>
                     </div>
                     <button 
                       onClick={async () => {
                         await updateDoc(doc(db, 'registrations', p.id), { status: 'completed', endTime: serverTimestamp() });
                       }}
                       className="p-2 rounded-lg hover:bg-red-500/10 text-red-500/40 hover:text-red-500 transition-colors"
                     >
                       <X className="w-4 h-4" />
                     </button>
                   </div>
                 ))}
                 {livePassengers.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center opacity-20 italic text-xs">
                      Aucun passager
                   </div>
                 )}
              </div>
           </div>

           <button 
             onClick={getAiHealth}
             disabled={loadingHealth}
             className="w-full py-4 bg-brand-accent text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg hover:scale-[1.02] transition-transform disabled:opacity-50"
           >
             {loadingHealth ? <Loader2 className="w-5 h-5 animate-spin" /> : <Star className="w-5 h-5" />}
             Santé IA & Maintenance
           </button>
        </div>

      </div>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQR && assignedBus && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="w-full max-w-sm bg-white text-black p-10 rounded-[3rem] flex flex-col items-center"
            >
               <button onClick={() => setShowQR(false)} className="absolute top-10 right-10 text-black/40 hover:text-black">
                 <X className="w-6 h-6" />
               </button>
               <div className="text-center mb-8">
                  <h4 className="text-2xl font-black uppercase tracking-tighter mb-1">{assignedBus.nickname}</h4>
                  <p className="text-xs font-mono font-bold text-black/40">{assignedBus.plateNumber}</p>
               </div>
               <div className="p-4 bg-white border-2 border-dashed border-black/10 rounded-[2rem] mb-8">
                  <img src={assignedBus.qrCodeData} alt="QR" className="w-56 h-56" />
               </div>
               <button 
                 onClick={() => window.print()}
                 className="w-full py-4 bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-3"
               >
                 <Printer className="w-5 h-5" /> Imprimer Ticket QR
               </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Alert Content Modal */}
      <AnimatePresence>
        {showAlert && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="w-full max-w-md frosted-glass rounded-[2.5rem] p-10"
            >
               <h4 className="text-2xl font-bold mb-4 tracking-tighter text-brand-warning">Détails de l'Alerte</h4>
               <textarea 
                 value={alertDesc}
                 onChange={(e) => setAlertDesc(e.target.value)}
                 placeholder="Décrivez brièvement la situation..."
                 className="w-full h-32 bg-white/5 border border-glass-border rounded-2xl p-4 text-sm outline-none focus:border-brand-warning transition-all mb-6"
               />
               <div className="flex gap-4">
                  <button onClick={() => setShowAlert(false)} className="flex-1 py-4 frosted-glass rounded-2xl font-bold">Annuler</button>
                  <button 
                    onClick={handleAlertSubmit}
                    disabled={loading || !alertDesc}
                    className="flex-1 py-4 bg-brand-warning text-white rounded-2xl font-bold flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Envoyer
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </Layout>
  );
}

function StatusMetric({ icon: Icon, label, value, iconColor, bgColor }: any) {
  return (
    <div className="flex items-center gap-4">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", bgColor, iconColor)}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{label}</p>
        <p className="text-xl font-bold tracking-tight">{value}</p>
      </div>
    </div>
  );
}
