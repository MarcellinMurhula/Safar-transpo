import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../authContext';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { QrCode, Map as MapIcon, CreditCard, Clock, MapPin, AlertTriangle, X, Loader2, Navigation, DollarSign, ShieldCheck, ArrowRight, ArrowLeft, Star, Send, Mic, Volume2 } from 'lucide-react';
import { formatCurrency, cn, getEuclideanDistance, getManhattanDistance } from '../lib/utils';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { aiService, DestinationAdvice } from '../services/aiService';
import { Cpu, Wifi, Zap } from 'lucide-react';

const center = { lat: -2.4833, lng: 28.8333 }; // Bukavu
import RadarView from '../components/RadarView';

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

import WeatherWidget from '../components/WeatherWidget';

export default function DashboardUS() {
  const { t } = useTranslation();
  const { profile, user, upgradeToOwner } = useAuth();
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [activeRegistration, setActiveRegistration] = useState<any>(null);
  const [liveBuses, setLiveBuses] = useState<any[]>([]);
  const [pricing, setPricing] = useState({ basePrice: 500, pricePerKm: 200 });
  const [currentDistance, setCurrentDistance] = useState(0);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile'>('mobile');
  const [operatorDetails, setOperatorDetails] = useState({ name: '', phone: '', pin: '', amount: 0, reference: '' });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [viewTab, setViewTab] = useState<'map' | 'history' | 'ai'>('map');
  const [isDetectingIot, setIsDetectingIot] = useState(false);

  // GPS State
  const [gpsLocked, setGpsLocked] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{lat: number, lng: number} | null>(null);

  // Monitor GPS
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLocked(true);
      },
      (err) => {
        console.error("GPS Error:", err);
        setGpsLocked(false);
        setCurrentCoords(null);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Initialize QR Scanner when modal opens
  useEffect(() => {
    if (showScanner && gpsLocked) {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
        },
        /* verbose= */ false
      );

      scanner.render((result) => {
        handleScan({ text: result });
        scanner.clear();
      }, (err) => {
        // Quiet errors during search
      });

      return () => {
        scanner.clear().catch(e => console.error("Scanner cleanup error", e));
      };
    }
  }, [showScanner, gpsLocked]);

  // AI Assistant States
  const [aiDestination, setAiDestination] = useState('');
  const [aiAdvice, setAiAdvice] = useState<DestinationAdvice | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiChatQuery, setAiChatQuery] = useState('');
  const [aiMessages, setAiMessages] = useState<{ role: 'ai' | 'user', text: string }[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);

  const toggleVoice = () => {
    if (isVoiceEnabled) {
      aiService.stopSpeaking();
    }
    setIsVoiceEnabled(!isVoiceEnabled);
  };

  const getAiAdvice = async () => {
    if (!aiDestination) return;
    setLoadingAi(true);
    try {
      const advice = await aiService.getDestinationAdvice("Ma position actuelle (Bukavu)", aiDestination);
      setAiAdvice(advice);
      if (isVoiceEnabled) {
        aiService.speak(`Voici votre guide pour ${aiDestination}. La distance est de ${advice.distance} avec un temps estimé de ${advice.estimatedTime}.`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleAiChat = async () => {
    if (!aiChatQuery) return;
    const userMsg = aiChatQuery;
    setAiChatQuery('');
    setAiMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    
    try {
      const response = await aiService.getChatResponse(userMsg, "Tu es l'assistant spécialisé transport de Bukavu-Trans. Tu aides les usagers avec le transport, les prix, la météo et la sécurité à Bukavu. Réponds de manière concise.");
      setAiMessages(prev => [...prev, { role: 'ai', text: response }]);
      
      if (isVoiceEnabled) {
        aiService.speak(response);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startVoiceInput = async () => {
    setIsListening(true);
    try {
      const text = await aiService.listen();
      setAiChatQuery(text);
      if (text.length > 3) {
        const userMsg = text;
        setAiChatQuery('');
        setAiMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        const response = await aiService.getChatResponse(userMsg, "Transport à Bukavu assistant.");
        setAiMessages(prev => [...prev, { role: 'ai', text: response }]);
        if (isVoiceEnabled) {
          aiService.speak(response);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsListening(false);
    }
  };

  /**
   * IoT Detection Logic (Simulated Sensor)
   * Finds the nearest bus within 10 meters using Bluetooth Beacon simulation.
   */
  const handleIotDetection = async () => {
    if (!gpsLocked || !currentCoords) {
      alert("Activez votre GPS pour la détection IoT.");
      return;
    }

    setIsDetectingIot(true);
    // Simulate Bluetooth / IoT scanning delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      // Find the closest bus from liveBuses
      const nearestBus = liveBuses.reduce((prev, curr) => {
        const distPrev = getDistance(currentCoords.lat, currentCoords.lng, prev.lat, prev.lng);
        const distCurr = getDistance(currentCoords.lat, currentCoords.lng, curr.lat, curr.lng);
        return distCurr < distPrev ? curr : prev;
      }, liveBuses[0]);

      if (nearestBus) {
        const distanceToBus = getDistance(currentCoords.lat, currentCoords.lng, nearestBus.lat, nearestBus.lng);
        
        if (distanceToBus > 0.02) { // 20 meters threshold for "proximity detection"
           alert("Aucun capteur IoT détecté à proximité immédiate (< 20m). Approchez-vous du véhicule.");
           return;
        }

        // Auto-register via Sensor
        await addDoc(collection(db, 'registrations'), {
          userId: user?.uid,
          tripId: `iot_${Date.now()}`,
          busId: nearestBus.busId,
          busMetadata: nearestBus,
          startTime: serverTimestamp(),
          status: 'ongoing',
          startLat: currentCoords.lat, 
          startLng: currentCoords.lng,
          detectionMethod: 'iot_sensor'
        });
        
        alert(`Capteur IoT détecté ! Vous êtes monté dans le Bus ${nearestBus.busId}.`);
      } else {
        alert("Aucun véhicule IoT actif détecté à Bukavu pour le moment.");
      }
    } catch (err) {
      console.error("IoT Detect Error:", err);
    } finally {
      setIsDetectingIot(false);
    }
  };

  // Listen for user's transactions
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => b.timestamp?.toMillis() - a.timestamp?.toMillis()));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'transactions');
    });
    return () => unsubscribe();
  }, [user]);

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

  // Distance tracking during active registration
  useEffect(() => {
    if (!activeRegistration) {
      setCurrentDistance(0);
      return;
    }

    const watchId = navigator.geolocation.watchPosition((pos) => {
      const dist = getDistance(
        activeRegistration.startLat,
        activeRegistration.startLng,
        pos.coords.latitude,
        pos.coords.longitude
      );
      setCurrentDistance(dist);
    }, (err) => console.error("Geo error:", err), { enableHighAccuracy: true });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeRegistration]);

  const estimatedPrice = pricing.basePrice + (currentDistance * pricing.pricePerKm);

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
    try {
      setScanning(true);
      const amount = parseInt(rechargeAmount);
      // Create ledger entry instead of direct update
      await addDoc(collection(db, 'ledger'), {
        userId: user!.uid,
        type: 'recharge',
        amount: amount,
        timestamp: serverTimestamp(),
        operator: selectedOperator,
        status: 'completed'
      });
      // For immediate UI feedback, we can optimistically update a local transient balance if needed
      // but the real fix is the Rules + Cloud Functions or summation.
      setShowRecharge(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'ledger');
    } finally {
      setScanning(false);
    }
  };

  const handleScan = async (data: any) => {
    if (data && !scanning) {
      if (!gpsLocked || !currentCoords) {
        alert("Action impossible : Localisation GPS non détectée. Veuillez activer votre GPS.");
        setShowScanner(false);
        return;
      }

      setScanning(true);
      try {
        let busDataIdx: any;
        try {
          busDataIdx = typeof data.text === 'string' ? JSON.parse(data.text) : { busId: data.text };
        } catch (e) {
          busDataIdx = { busId: data.text };
        }

        const busId = busDataIdx.busId;
        if (!busId) throw new Error("Format QR invalide");

        const busSnap = await getDoc(doc(db, 'buses', busId));
        if (!busSnap.exists()) {
          throw new Error("Bus non trouvé");
        }

        const busInfo = busSnap.data();
        if (!busInfo.isApproved) {
          throw new Error("Ce véhicule n'est pas encore approuvé par la Mairie.");
        }

        if ((profile?.balance || 0) < pricing.basePrice) {
          alert(`Solde insuffisant (${formatCurrency(profile?.balance || 0)}). Rechargement nécessaire.`);
          setShowScanner(false);
          setScanning(false);
          return;
        }

        await addDoc(collection(db, 'registrations'), {
          userId: user?.uid,
          tripId: `trip_${Date.now()}`,
          busId: busId,
          busMetadata: busInfo,
          startTime: serverTimestamp(),
          status: 'ongoing',
          startLat: currentCoords.lat, 
          startLng: currentCoords.lng,
        });
        
        setShowScanner(false);
      } catch (err: any) {
        alert(err.message || "Erreur lors du scan");
        setShowScanner(false);
      } finally {
        setScanning(false);
      }
    }
  };

  const handlePaymentSubmit = async () => {
    if (!activeRegistration || !selectedOperator || !operatorDetails.phone || !operatorDetails.pin) {
      alert("Veuillez remplir tous les champs de paiement.");
      return;
    }

    try {
      setScanning(true);
      const cost = Math.ceil(estimatedPrice);
      
      // Calculate precise distances
      const distEucl = getEuclideanDistance(
        activeRegistration.startLat,
        activeRegistration.startLng,
        currentCoords?.lat || activeRegistration.startLat,
        currentCoords?.lng || activeRegistration.startLng
      );
      
      const distManh = getManhattanDistance(
        activeRegistration.startLat,
        activeRegistration.startLng,
        currentCoords?.lat || activeRegistration.startLat,
        currentCoords?.lng || activeRegistration.startLng
      );

      // Automated Tax (5%) for city infrastructure
      const taxRate = 0.05; 
      const taxAmount = Math.ceil(cost * taxRate);
      
      // 1. Transaction via Ledger (Secure)
      await addDoc(collection(db, 'ledger'), {
        userId: user!.uid,
        type: 'payment',
        amount: -cost, 
        taxAmount: taxAmount,
        busId: activeRegistration.busId,
        timestamp: serverTimestamp(),
        status: 'completed',
        metrics: {
          euclideanKm: distEucl,
          manhattanKm: distManh
        }
      });

      // 2. Update Registration with metrics
      await updateDoc(doc(db, 'registrations', activeRegistration.id), {
        status: 'finished',
        endTime: serverTimestamp(),
        totalCost: cost,
        taxAmount: taxAmount,
        distance: currentDistance,
        distEuclidean: distEucl,
        distManhattan: distManh,
        endLat: currentCoords?.lat || 0,
        endLng: currentCoords?.lng || 0
      });

      // 3. Record History Transaction entry (for legacy UI compat)
      await addDoc(collection(db, 'transactions'), {
        userId: user?.uid,
        type: 'payment',
        amount: cost,
        taxAmount: taxAmount,
        description: `Paiement trajet Bus ${activeRegistration.busId}`,
        timestamp: serverTimestamp(),
        status: 'success',
        operator: selectedOperator,
        busId: activeRegistration.busId
      });
      
      setShowPayment(false);
      setActiveRegistration(null);
      setOperatorDetails({ name: '', phone: '', pin: '', amount: 0, reference: '' });
      alert(`Paiement effectué ! Votre solde sera mis à jour après vérification.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'ledger');
    } finally {
      setScanning(false);
    }
  };

  const handleCheckout = () => {
    if (!activeRegistration) return;
    setShowPayment(true);
  };

  return (
    <Layout title={t('passenger_space')}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Stats & Action */}
        <div className="lg:col-span-4 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 rounded-[2.5rem] bg-gradient-to-br from-brand-primary to-brand-primary/80 text-black overflow-hidden relative group"
          >
            <div className="relative z-10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-app-secondary mb-1">{t('balance')}</p>
              <h3 className="text-4xl font-bold tracking-tighter mb-8">{formatCurrency(profile?.balance || 0)}</h3>
              <button 
                onClick={() => setShowRecharge(true)}
                className="w-full py-4 bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black/80 transition-all active:scale-95 shadow-xl"
              >
                <CreditCard className="w-4 h-4" /> {t('recharge_balance')}
              </button>
            </div>
            <CreditCard className="absolute -right-8 -bottom-8 w-40 h-40 text-black/5 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
             <button 
               onClick={() => setViewTab('map')}
               className={cn(
                 "p-6 rounded-[2rem] border transition-all flex flex-col gap-3 text-left",
                 viewTab === 'map' ? "bg-brand-primary/10 border-brand-primary" : "frosted-glass border-glass-border"
               )}
             >
                <MapIcon className={cn("w-5 h-5", viewTab === 'map' ? "text-brand-primary" : "text-brand-primary/40")} />
                <div>
                   <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{t('navigation')}</p>
                   <p className="text-sm font-bold">{t('radar_live')}</p>
                </div>
             </button>
             <button 
               onClick={() => setViewTab('history')}
               className={cn(
                 "p-6 rounded-[2rem] border transition-all flex flex-col gap-3 text-left",
                 viewTab === 'history' ? "bg-brand-primary/10 border-brand-primary" : "frosted-glass border-glass-border"
               )}
             >
                <Clock className={cn("w-5 h-5", viewTab === 'history' ? "text-brand-primary" : "text-brand-primary/40")} />
                <div>
                   <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{t('movements')}</p>
                   <p className="text-sm font-bold">{t('history')}</p>
                </div>
             </button>
             <button 
               onClick={() => setViewTab('ai')}
               className={cn(
                 "p-6 rounded-[2rem] border transition-all flex flex-col gap-3 text-left col-span-2",
                 viewTab === 'ai' ? "bg-brand-accent/10 border-brand-accent" : "frosted-glass border-glass-border"
               )}
             >
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-brand-accent rounded-xl flex items-center justify-center shadow-lg transform rotate-3">
                      <Star className="text-white w-6 h-6" />
                   </div>
                   <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{t('strategic_assistant')}</p>
                      <p className="text-sm font-bold">{t('ai_strategy')}</p>
                   </div>
                </div>
             </button>
          </div>

          {!activeRegistration ? (
            <div className="space-y-4">
              <button 
                onClick={() => setShowScanner(true)}
                className="w-full py-8 rounded-[2.5rem] frosted-glass flex flex-col items-center justify-center gap-4 hover:border-brand-primary/40 group transition-all"
              >
                <div className="w-14 h-14 bg-brand-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-[0_0_30px_rgba(255,107,0,0.3)]">
                  <QrCode className="w-7 h-7 text-white" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">{t('scan_qr')}</span>
              </button>

              <button 
                onClick={handleIotDetection}
                disabled={isDetectingIot || !gpsLocked}
                className="w-full py-8 rounded-[2.5rem] bg-brand-primary/10 border border-brand-primary/20 flex flex-col items-center justify-center gap-4 hover:bg-brand-primary/20 transition-all disabled:opacity-50"
              >
                <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center shadow-xl">
                  {isDetectingIot ? <Loader2 className="w-7 h-7 text-brand-primary animate-spin" /> : <Wifi className="w-7 h-7 text-brand-primary" />}
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest block">{t('iot_detection')}</span>
                  <span className="text-[8px] opacity-40 font-bold uppercase tracking-widest">(Bluetooth Beacon)</span>
                </div>
              </button>
            </div>
          ) : (
            <div className="p-8 rounded-[2.5rem] bg-green-500/10 border border-green-500/20 text-center">
               <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Navigation className="text-white w-6 h-6" />
               </div>
               <p className="text-xs font-bold uppercase tracking-widest text-green-400 mb-1">{t('trip_ongoing')}</p>
               <div className="flex flex-col items-center gap-1 mb-6">
                  <p className="text-sm font-bold truncate">Bus {activeRegistration.busId}</p>
                  <div className="grid grid-cols-2 gap-4 w-full mt-4">
                    <div className="text-left bg-white/5 p-3 rounded-xl border border-white/5">
                      <p className="text-[8px] font-bold uppercase text-app-secondary">Distance</p>
                      <p className="text-[10px] font-bold text-brand-primary">{currentDistance.toFixed(2)} km parcourus</p>
                      {aiAdvice && <p className="text-[8px] font-medium opacity-60">Reste: {aiAdvice.distance}</p>}
                    </div>
                    <div className="text-left bg-white/5 p-3 rounded-xl border border-white/5">
                      <p className="text-[8px] font-bold uppercase text-app-secondary">Timing</p>
                      <p className="text-[10px] font-bold text-brand-primary">Écoulé: {Math.floor((Date.now() - (activeRegistration.startTime?.toMillis() || Date.now())) / 60000)} min</p>
                      {aiAdvice && <p className="text-[8px] font-medium opacity-60">Restant: {aiAdvice.estimatedTime}</p>}
                    </div>
                  </div>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mt-4">
                    Estimé: {formatCurrency(estimatedPrice)}
                  </p>
               </div>
               <button 
                onClick={handleCheckout}
                className="w-full py-4 bg-brand-warning text-white rounded-2xl font-bold hover:scale-[1.02] transition-transform active:scale-95"
               >
                 {t('finished_trip')}
               </button>
            </div>
          )}

          <button 
            onClick={() => setShowAlert(true)}
            className="w-full py-4 rounded-2xl bg-white/5 border border-glass-border text-brand-warning flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider hover:bg-brand-warning/10 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" /> {t('report_incident')}
          </button>

          <WeatherWidget />

          {profile?.roles && !profile.roles.includes('owner') && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="p-6 rounded-[2rem] bg-brand-accent/10 border border-brand-accent/20"
            >
               <div className="flex items-center gap-3 mb-4">
                  <Star className="w-5 h-5 text-brand-accent" />
                  <h5 className="font-bold text-brand-accent text-sm uppercase tracking-tight">Devenir Partenaire</h5>
               </div>
               <p className="text-xs text-[var(--app-text)]/60 mb-4 leading-relaxed">
                  Lancez votre propre transport et gérez vos véhicules via l'espace propriétaire.
               </p>
               <button 
                 onClick={async () => {
                    await upgradeToOwner();
                    alert("Demande envoyée ! Votre mode propriétaire est maintenant en attente d'approbation.");
                 }}
                 className="w-full py-3 bg-brand-accent text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-brand-accent/80 transition-all"
               >
                 Devenir Propriétaire
               </button>
            </motion.div>
          )}
        </div>

        {/* Right Column: Radar View or History or AI */}
        <div className="lg:col-span-8 space-y-6 overflow-hidden">
          {viewTab === 'map' ? (
            <div className="aspect-[16/9] lg:aspect-auto lg:h-[700px] rounded-[3rem] frosted-glass overflow-hidden relative border border-brand-primary/10 bg-[#0A0B0E]">
              <RadarView 
                liveBuses={liveBuses}
                center={center}
                title="Ma Position"
                subtitle="Radar de Proximité Bukavu"
                variant="primary"
              />

              <div className="absolute bottom-10 right-10 flex flex-col gap-3 z-40">
                 <div className="p-4 frosted-glass rounded-2xl border border-white/5 flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-brand-primary shadow-[0_0_8px_#ff6b00]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white">Bus Actifs : {liveBuses.length}</span>
                 </div>
              </div>

              <div className="absolute top-10 left-10 p-6 frosted-glass rounded-3xl border border-white/10 max-w-[280px] z-40">
                 <p className="text-[10px] font-bold uppercase tracking-widest text-app-secondary mb-2">Localisation Actuelle</p>
                 <p className="font-bold text-sm text-white">Bas-Congo / Place de l'Indépendance</p>
                 <div className="flex items-center gap-2 mt-4 text-[10px] font-medium text-white/40">
                    <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
                    {liveBuses.length} bus détectés dans la zone
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
                               <h4 className="text-xl font-bold tracking-tight text-white">Bus {activeRegistration.busId}</h4>
                               <p className="text-app-secondary text-xs flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Depuis {activeRegistration.startTime?.toDate() ? new Date(activeRegistration.startTime.toDate()).toLocaleTimeString() : '...'}
                               </p>
                            </div>
                         </div>
                         <div className="flex items-center gap-6">
                            <div className="text-right">
                               <p className="text-[10px] font-bold uppercase tracking-widest text-app-secondary">Prix Estimé</p>
                               <p className="text-3xl font-black text-brand-primary font-mono">{formatCurrency(pricing.basePrice + (currentDistance * pricing.pricePerKm))}</p>
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
          ) : viewTab === 'history' ? (
            <div className="lg:h-[700px] rounded-[3rem] frosted-glass overflow-hidden border border-brand-primary/10 flex flex-col">
              <div className="p-10 border-b border-glass-border">
                <h3 className="text-2xl font-bold tracking-tighter">Historique des Mouvements</h3>
                <p className="text-[10px] uppercase font-bold tracking-widest text-app-secondary mt-1 text-[var(--app-text)]">Vos dernières transactions et trajets</p>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {transactions.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                    <Clock className="w-12 h-12 mb-4" />
                    <p className="font-bold text-sm">Aucune activité enregistrée</p>
                  </div>
                ) : (
                  transactions.map((tx) => (
                    <div key={tx.id} className="p-6 rounded-3xl bg-black/5 dark:bg-white/5 border border-glass-border flex items-center justify-between group hover:border-brand-primary/40 transition-all">
                      <div className="flex items-center gap-6">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center",
                          tx.type === 'deposit' ? "bg-green-500/10 text-green-500" : "bg-brand-primary/10 text-brand-primary"
                        )}>
                          {tx.type === 'deposit' ? <ArrowLeft className="w-6 h-6 rotate-45" /> : <BusIcon className="w-6 h-6" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--app-text)]">{tx.description}</p>
                          <p className="text-[10px] opacity-40 uppercase font-bold tracking-widest mt-1">
                            {tx.timestamp?.toDate() ? new Date(tx.timestamp.toDate()).toLocaleDateString() : '...'} • {tx.operator || 'Système'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-lg font-black font-mono",
                          tx.type === 'deposit' ? "text-green-500" : "text-brand-primary"
                        )}>
                          {tx.type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </p>
                        {tx.taxAmount > 0 && (
                          <p className="text-[10px] text-brand-warning font-bold uppercase tracking-tight">Taxe: {formatCurrency(tx.taxAmount)}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="lg:h-[700px] rounded-[3rem] frosted-glass overflow-hidden border border-brand-accent/20 flex flex-col bg-brand-accent/5">
              <div className="p-10 border-b border-glass-border flex justify-between items-center bg-white/5">
                <div>
                  <h3 className="text-2xl font-bold tracking-tighter">Assistant Gemini IA</h3>
                  <p className="text-[10px] uppercase font-bold tracking-widest opacity-40 mt-1">Guide de voyage & Sécurité intelligent</p>
                </div>
                <div className="flex gap-2">
                   <button 
                    onClick={toggleVoice}
                    className={cn(
                      "p-4 rounded-2xl transition-all shadow-lg",
                      isVoiceEnabled ? "bg-brand-accent text-white" : "bg-white/10 text-white/40 border border-glass-border"
                    )}
                    title={isVoiceEnabled ? "Désactiver la voix" : "Activer la voix"}
                   >
                     {isVoiceEnabled ? <Volume2 className="w-5 h-5" /> : <Mic className="w-5 h-5 opacity-40" />}
                   </button>
                   <button 
                    onClick={() => aiService.stopSpeaking()}
                    className="p-4 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all shadow-lg"
                    title="Arrêter la lecture"
                   >
                     <X className="w-5 h-5" />
                   </button>
                   <button 
                    onClick={startVoiceInput}
                    className={cn(
                      "p-4 rounded-2xl transition-all shadow-lg",
                      isListening ? "bg-red-500 animate-pulse text-white" : "bg-brand-accent text-white hover:scale-105"
                    )}
                   >
                     <Mic className="w-5 h-5" />
                   </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                 {/* Destination Planning */}
                 <div className="w-full md:w-1/2 p-8 border-r border-glass-border space-y-6 overflow-y-auto custom-scrollbar">
                    <h4 className="text-sm font-bold uppercase tracking-widest opacity-60">Planifier ma destination</h4>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={aiDestination}
                        onChange={(e) => setAiDestination(e.target.value)}
                        placeholder="Où voulez-vous aller ?"
                        className="w-full p-6 pr-20 rounded-[2rem] bg-white/5 border border-glass-border focus:border-brand-accent outline-none text-sm font-bold"
                      />
                      <button 
                        onClick={getAiAdvice}
                        disabled={loadingAi}
                        className="absolute right-3 top-3 bottom-3 px-6 bg-brand-accent text-white rounded-[1.5rem] font-bold text-xs uppercase tracking-widest shadow-lg active:scale-95 disabled:opacity-50"
                      >
                        {loadingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : "Demander"}
                      </button>
                    </div>

                    <AnimatePresence>
                      {aiAdvice && (
                        <motion.div 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-4"
                        >
                          <div className="grid grid-cols-2 gap-3">
                             <div className="p-4 rounded-2xl bg-white/5 border border-glass-border">
                                <p className="text-[8px] font-bold uppercase tracking-widest opacity-40">Distance</p>
                                <p className="text-sm font-black text-brand-accent">{aiAdvice.distance}</p>
                             </div>
                             <div className="p-4 rounded-2xl bg-white/5 border border-glass-border">
                                <p className="text-[8px] font-bold uppercase tracking-widest opacity-40">Temps estimé</p>
                                <p className="text-sm font-black text-brand-accent">{aiAdvice.estimatedTime}</p>
                             </div>
                          </div>
                          <div className="p-6 rounded-3xl bg-white/5 border border-glass-border space-y-4">
                             <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-accent mb-2">État de la route</p>
                                <p className="text-xs leading-relaxed opacity-80">{aiAdvice.roadConditions}</p>
                             </div>
                             <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-accent mb-2">Praticabilité</p>
                                <p className="text-xs leading-relaxed opacity-80">{aiAdvice.practicability}</p>
                             </div>
                             <div className="p-4 rounded-2xl bg-brand-warning/10 border border-brand-warning/20">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-warning mb-2">Sécurité Recommandée</p>
                                <p className="text-xs leading-relaxed text-brand-warning">{aiAdvice.securityTips}</p>
                             </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                 </div>

                 {/* AI Chat */}
                 <div className="w-full md:w-1/2 flex flex-col bg-black/20">
                    <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                       {aiMessages.length === 0 && (
                         <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-20">
                            <Star className="w-12 h-12 mb-4" />
                            <p className="text-sm font-bold uppercase tracking-widest">Discutez avec l'IA</p>
                            <p className="text-[10px] mt-2">Posez vos questions sur Bukavu-Trans</p>
                         </div>
                       )}
                       {aiMessages.map((msg, i) => (
                         <div key={i} className={cn(
                           "flex",
                           msg.role === 'user' ? "justify-end" : "justify-start"
                         )}>
                            <div className={cn(
                              "max-w-[80%] p-4 rounded-2xl text-xs leading-relaxed",
                              msg.role === 'user' ? "bg-brand-accent text-white rounded-br-none" : "bg-white/10 text-[var(--app-text)] rounded-bl-none border border-glass-border"
                            )}>
                               {msg.text}
                            </div>
                         </div>
                       ))}
                    </div>
                    <div className="p-6 border-t border-glass-border bg-white/5">
                       <div className="relative">
                          <input 
                            type="text" 
                            value={aiChatQuery}
                            onChange={(e) => setAiChatQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAiChat()}
                            placeholder="Message à l'assistant..."
                            className="w-full p-4 pr-16 rounded-2xl bg-white/5 border border-glass-border focus:border-brand-accent outline-none text-xs"
                          />
                          <button 
                            onClick={handleAiChat}
                            className="absolute right-2 top-2 bottom-2 w-10 h-10 bg-brand-accent text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPayment && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/60 dark:bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md frosted-glass rounded-[2.5rem] p-10 relative overflow-hidden text-[var(--app-text)]"
            >
              <button 
                onClick={() => setShowPayment(false)}
                className="absolute top-8 right-8 p-2 rounded-xl frosted-glass text-[var(--app-text)]/40 hover:text-[var(--app-text)]"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4 mb-2">
                <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center shadow-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-2xl font-bold tracking-tighter">Paiement Trajet</h4>
                  <p className="text-[10px] text-app-secondary uppercase tracking-widest font-bold">Choisir le mode de paiement</p>
                </div>
              </div>

              <div className="flex gap-2 mb-8 mt-6">
                <button 
                  onClick={() => setPaymentMethod('cash')}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all",
                    paymentMethod === 'cash' ? "bg-brand-primary text-white shadow-lg" : "bg-black/5 dark:bg-white/5 text-app-secondary"
                  )}
                >
                  Espèces
                </button>
                <button 
                  onClick={() => setPaymentMethod('mobile')}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all",
                    paymentMethod === 'mobile' ? "bg-brand-primary text-white shadow-lg" : "bg-black/5 dark:bg-white/5 text-app-secondary"
                  )}
                >
                  Mobile Money
                </button>
              </div>

              <div className="p-6 rounded-3xl bg-black/5 dark:bg-black/40 border border-glass-border mb-8">
                 <div className="flex justify-between items-center mb-4">
                    <p className="text-xs opacity-40">Montant total calculé</p>
                    <p className="text-2xl font-black text-brand-primary">{formatCurrency(Math.ceil(estimatedPrice))}</p>
                 </div>
                 <div className="h-px bg-glass-border w-full mb-4" />
                 
                 {paymentMethod === 'mobile' ? (
                   <div className="space-y-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-3">Opérateur & Détails</p>
                      <div className="grid grid-cols-4 gap-2 mb-6">
                        {operators.map(op => (
                          <button 
                            key={op.id}
                            onClick={() => setSelectedOperator(op.id)}
                            className={cn(
                              "aspect-square rounded-xl flex items-center justify-center font-black text-white shadow-sm transition-all",
                              op.color,
                              selectedOperator === op.id ? "ring-2 ring-brand-primary ring-offset-2 ring-offset-transparent scale-110" : "opacity-40"
                            )}
                          >
                            {op.icon}
                          </button>
                        ))}
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-1">
                           <p className="text-[8px] font-bold uppercase tracking-widest opacity-40 ml-2">Numéro de téléphone</p>
                           <input 
                            type="tel" 
                            placeholder="081 234 5678"
                            value={operatorDetails.phone}
                            onChange={(e) => setOperatorDetails(prev => ({ ...prev, phone: e.target.value }))}
                            className="w-full p-5 rounded-2xl bg-black/5 dark:bg-black/40 border border-glass-border focus:outline-none focus:border-brand-primary transition-colors text-sm font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                           <p className="text-[8px] font-bold uppercase tracking-widest opacity-40 ml-2">ID Transaction (Requête de l'opérateur)</p>
                           <input 
                            type="text" 
                            placeholder="Ex: REF-123456"
                            value={operatorDetails.reference}
                            onChange={(e) => setOperatorDetails(prev => ({ ...prev, reference: e.target.value }))}
                            className="w-full p-5 rounded-2xl bg-black/5 dark:bg-black/40 border border-glass-border focus:outline-none focus:border-brand-primary transition-colors text-sm font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                           <p className="text-[8px] font-bold uppercase tracking-widest opacity-40 ml-2">Code PIN de validation</p>
                           <input 
                            type="password" 
                            placeholder="****"
                            value={operatorDetails.pin}
                            onChange={(e) => setOperatorDetails(prev => ({ ...prev, pin: e.target.value }))}
                            className="w-full p-5 rounded-2xl bg-black/5 dark:bg-black/40 border border-glass-border focus:outline-none focus:border-brand-primary transition-colors text-3xl font-black tracking-[0.5em] text-center"
                            maxLength={4}
                          />
                        </div>
                      </div>
                   </div>
                 ) : (
                   <div className="text-center py-8">
                     <p className="text-xs opacity-60 leading-relaxed">
                       Veuillez remettre le montant exact de <span className="font-bold text-[var(--app-text)]">{formatCurrency(Math.ceil(estimatedPrice))}</span> au conducteur du bus.
                     </p>
                   </div>
                 )}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowPayment(false)}
                  className="flex-1 py-4 frosted-glass rounded-2xl font-bold hover:bg-white/5 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={handlePaymentSubmit}
                  disabled={scanning || (paymentMethod === 'mobile' && (!operatorDetails.phone || !operatorDetails.reference || !operatorDetails.pin))}
                  className="flex-1 py-4 bg-brand-primary text-white rounded-[2rem] font-bold text-lg shadow-xl shadow-brand-primary/20 flex items-center justify-center gap-3 transition-transform active:scale-95"
                >
                  {scanning ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Confirmer <ShieldCheck className="w-5 h-5" /></>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showRecharge && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/40 dark:bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md frosted-glass rounded-[2.5rem] p-10 relative overflow-hidden text-[var(--app-text)]"
            >
              <button 
                onClick={() => setShowRecharge(false)}
                className="absolute top-8 right-8 p-2 rounded-xl frosted-glass text-[var(--app-text)]/40 hover:text-[var(--app-text)]"
              >
                <X className="w-5 h-5" />
              </button>

              <h4 className="text-2xl font-bold mb-2 tracking-tighter">Recharger mon compte</h4>
              <p className="text-xs text-app-secondary mb-8 uppercase tracking-widest font-bold">Sélectionnez un opérateur mobile</p>

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
                  <p className="text-[10px] font-bold uppercase tracking-widest text-app-secondary mb-2">Montant à recharger (FC)</p>
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
                
                <div className="aspect-square w-full bg-black/40 rounded-[2rem] overflow-hidden relative border border-white/10 mb-8 shadow-inner flex flex-col items-center justify-center">
                  {!gpsLocked ? (
                    <div className="text-center p-10 space-y-4">
                       <Loader2 className="w-10 h-10 animate-spin text-brand-primary mx-auto" />
                       <p className="text-xs font-bold text-white uppercase tracking-widest">Initialisation GPS...</p>
                       <p className="text-[10px] text-white/40 italic">Veuillez autoriser l'accès à votre position pour sécuriser le trajet.</p>
                    </div>
                  ) : (
                    <div id="qr-reader" className="w-full h-full" />
                  )}
                  {gpsLocked && <div className="absolute inset-10 border-2 border-brand-primary border-dashed rounded-2xl opacity-40 animate-pulse pointer-events-none" />}
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
                className="absolute top-8 right-8 p-2 rounded-xl frosted-glass text-[var(--app-text)]/40 hover:text-[var(--app-text)]"
              >
                <X className="w-5 h-5" />
              </button>

              <h4 className="text-2xl font-bold mb-2 tracking-tighter text-brand-warning">Signaler une Alerte</h4>
              <p className="text-xs text-[var(--app-text)]/40 mb-8 uppercase tracking-widest font-bold">Aidez-nous à sécuriser Bukavu</p>

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
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--app-text)]/40 mb-2">Description locale / Détails</p>
                  <textarea 
                    value={alertDesc}
                    onChange={(e) => setAlertDesc(e.target.value)}
                    placeholder="Ex: Vol au niveau de la Place de l'indépendance..."
                    className="w-full bg-transparent text-sm focus:outline-none min-h-[100px] resize-none text-[var(--app-text)]"
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
    <div className="p-6 rounded-[2rem] frosted-glass border border-[var(--glass-border)] flex flex-col gap-3">
      <Icon className="w-5 h-5 text-brand-primary/40" />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40">{label}</p>
        <p className="text-xl font-bold leading-none tracking-tight text-[var(--app-text)]">{value}</p>
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

