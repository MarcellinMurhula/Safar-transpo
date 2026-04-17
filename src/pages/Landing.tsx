import React from 'react';
import { motion } from 'motion/react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { Bus, MapPin, QrCode, ShieldCheck, ArrowRight } from 'lucide-react';

export default function Landing() {
  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login Error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-app-bg selection:bg-brand-primary selection:text-white overflow-hidden relative">
      {/* Background Blobs */}
      <div className="background-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      {/* Header */}
      <nav className="fixed top-0 w-full z-50 px-6 py-8 flex justify-between items-center max-w-7xl mx-auto left-0 right-0">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-12 h-12 bg-brand-primary rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,107,0,0.3)]">
            <Bus className="text-white w-7 h-7" />
          </div>
          <span className="text-2xl font-bold tracking-tighter">Safar'Transpo</span>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={handleLogin}
          className="px-6 py-2 rounded-full glass-morphism text-sm font-medium hover:bg-white hover:text-black transition-all duration-300"
        >
          Se connecter
        </motion.button>
      </nav>

      {/* Hero Section */}
      <main className="pt-40 pb-20 px-6 max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col lg:flex-row gap-20 items-center">
          <div className="flex-1">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-brand-primary font-mono text-xs tracking-[0.3em] uppercase mb-6"
            >
              Bukavu en mouvement
            </motion.p>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-6xl md:text-8xl font-bold leading-[0.9] tracking-tighter mb-8 premium-gradient-text"
            >
              Le transport <br />du futur, <br />aujourd'hui.
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white/60 text-lg max-w-md mb-10 leading-relaxed"
            >
              Simplifiez vos trajets quotidiens à Bukavu. Scannez, voyagez et payez en toute sécurité avec Safar'Transpo.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <button 
                onClick={handleLogin}
                className="px-10 py-5 bg-brand-primary text-white rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,107,0,0.3)] hover:shadow-[0_0_40px_rgba(255,107,0,0.5)]"
              >
                Démarrer maintenant <ArrowRight className="w-5 h-5" />
              </button>
              <button className="px-10 py-5 frosted-glass rounded-2xl font-medium hover:bg-white/10 transition-colors">
                En savoir plus
              </button>
            </motion.div>
          </div>

          <div className="flex-1 w-full lg:w-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, rotate: 5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="relative aspect-square max-w-sm mx-auto"
            >
              <div className="absolute inset-0 bg-brand-accent/20 rounded-[3rem] blur-2xl animate-pulse" />
              <div className="relative h-full w-full frosted-glass rounded-[3rem] p-10 flex flex-col justify-end overflow-hidden group">
                 <div className="absolute top-0 right-0 p-10">
                    <QrCode className="w-16 h-16 text-brand-primary/20 group-hover:text-brand-primary transition-colors duration-500" />
                 </div>
                 <div className="absolute -left-10 top-1/2 -translate-y-1/2">
                    <MapPin className="w-64 h-64 text-brand-accent/5" />
                 </div>
                 <h3 className="text-4xl font-bold mb-3 tracking-tighter">Scan & Go</h3>
                 <p className="text-white/40 text-sm leading-relaxed">Le système de ticketing intelligent pour les bus de Bukavu.</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Feature Grid */}
        <section className="mt-40 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: MapPin, title: "Suivi Live", desc: "Localisez les bus en temps réel sur la carte de Bukavu." },
            { icon: QrCode, title: "QR Ticketing", desc: "Payez votre course en un scan. Fini les soucis de monnaie." },
            { icon: ShieldCheck, title: "Sécurité", desc: "Voyages tracés et bouton d'alerte en cas d'urgence." },
            { icon: Bus, title: "Confort", desc: "Évitez les attentes inutiles aux arrêts." },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-3xl frosted-glass hover:border-white/20 transition-colors"
            >
              <feature.icon className="w-10 h-10 text-brand-primary mb-6" />
              <h4 className="text-lg font-bold mb-2">{feature.title}</h4>
              <p className="text-white/40 text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </section>
      </main>

      <footer className="py-20 px-6 max-w-7xl mx-auto border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-10 text-white/30 text-xs uppercase tracking-widest font-mono">
        <p>© 2026 Safar'Transpo — Mairie de Bukavu</p>
        <div className="flex gap-8">
          <a href="#" className="hover:text-white transition-colors">Confidentialité</a>
          <a href="#" className="hover:text-white transition-colors">Conditions</a>
          <a href="#" className="hover:text-white transition-colors">Support</a>
        </div>
      </footer>
    </div>
  );
}
