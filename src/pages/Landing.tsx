import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../authContext';
import { useNavigate } from 'react-router-dom';
import { Bus, MapPin, QrCode, ShieldCheck, ArrowRight, AlertTriangle, X, Loader2, User, Star } from 'lucide-react';

export default function Landing() {
  const { t } = useTranslation();
  const { user, setSelectedRole } = useAuth();
  const navigate = useNavigate();
  const [showRoleSelection, setShowRoleSelection] = React.useState(false);
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        setShowRoleSelection(true);
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      if (err.code === 'auth/popup-blocked') {
        setError("Le popup a été bloqué par votre navigateur. Veuillez autoriser les popups pour ce site.");
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Ignore
      } else {
        setError("Une erreur est survenue lors de la connexion. Veuillez réessayer.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const selectRoleAndNavigate = (role: 'user' | 'owner' | 'admin' | 'driver') => {
    setSelectedRole(role);
    setShowRoleSelection(false);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] selection:bg-brand-primary selection:text-white overflow-hidden relative transition-colors duration-300">
      {/* Background Blobs */}
      <div className="background-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-6"
          >
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold flex items-center gap-3 frosted-glass backdrop-blur-xl">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
              <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-white/10 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
          <span className="text-2xl font-bold tracking-tighter">{t('app_name')}</span>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          disabled={isLoggingIn}
          onClick={() => user ? (setShowRoleSelection(true)) : handleLogin()}
          className="px-6 py-3 rounded-xl bg-brand-primary text-white font-bold text-sm hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_20px_rgba(255,107,0,0.3)]"
        >
          {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : user ? t('my_dashboard') : (
            <div className="flex items-center gap-3">
              <div className="bg-white p-1 rounded-md">
                <svg className="w-3 h-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </div>
              <span>Se connecter avec Google</span>
            </div>
          )}
        </motion.button>
      </nav>

      {/* Role Selection Modal */}
      <AnimatePresence>
        {showRoleSelection && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRoleSelection(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl frosted-glass rounded-[2.5rem] p-8 md:p-12 border border-white/10 shadow-2xl"
            >
              <button 
                onClick={() => setShowRoleSelection(false)}
                className="absolute top-8 right-8 p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-4xl font-bold tracking-tighter mb-2 text-white">{t('choose_access')}</h2>
              <p className="text-white/40 text-sm mb-10">{t('choose_access_desc')}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RoleOption 
                  icon={User} 
                  title={t('passenger')} 
                  desc={t('passenger_desc')}
                  onClick={() => selectRoleAndNavigate('user')}
                  color="brand-primary"
                />
                <RoleOption 
                  icon={Bus} 
                  title={t('driver')} 
                  desc={t('driver_desc')}
                  onClick={() => selectRoleAndNavigate('driver')}
                  color="brand-accent"
                />
                <RoleOption 
                  icon={ShieldCheck} 
                  title={t('owner')} 
                  desc={t('owner_desc')}
                  onClick={() => selectRoleAndNavigate('owner')}
                  color="brand-warning"
                />
                {user?.email === 'marcmurhularut@gmail.com' && (
                  <RoleOption 
                    icon={Star} 
                    title={t('admin')} 
                    desc={t('admin_desc')}
                    onClick={() => selectRoleAndNavigate('admin')}
                    color="purple-500"
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <main className="pt-40 pb-20 px-6 max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col lg:flex-row gap-20 items-center">
          <div className="flex-1">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-brand-primary font-mono text-xs tracking-[0.3em] uppercase mb-6"
            >
              {t('bukavu_motion')}
            </motion.p>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-6xl md:text-8xl font-bold leading-[0.9] tracking-tighter mb-8 premium-gradient-text"
            >
              {t('hero_title')}
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-[var(--app-text)]/60 text-lg max-w-md mb-10 leading-relaxed"
            >
              {t('hero_subtitle')}
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <button 
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="px-10 py-5 bg-brand-primary text-white rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,107,0,0.3)] hover:shadow-[0_0_40px_rgba(255,107,0,0.5)] disabled:opacity-75"
              >
                {isLoggingIn ? "..." : t('hero_cta')} <ArrowRight className="w-5 h-5" />
              </button>
              <button 
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-10 py-5 frosted-glass rounded-2xl font-medium hover:bg-white/10 transition-colors"
              >
                {t('learn_more')}
              </button>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-12 flex flex-col gap-4"
            >
              <p className="text-[10px] uppercase tracking-widest text-[var(--app-text)]/40 font-bold mb-2">Access</p>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={handleLogin}
                  className="px-6 py-3 rounded-xl frosted-glass border border-white/5 hover:border-brand-primary/40 text-xs font-bold transition-all text-[var(--app-text)]/60 hover:text-[var(--app-text)] flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-brand-primary" /> {t('hero_owner')}
                </button>
              </div>
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
                 <h3 className="text-4xl font-bold mb-3 tracking-tighter text-[var(--app-text)]">Scan & Go</h3>
                 <p className="text-[var(--app-text)]/40 text-sm leading-relaxed">System for Bukavu.</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Feature Grid */}
        <section id="features" className="mt-40 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: MapPin, title: t('feature_live'), desc: t('feature_live_desc') },
            { icon: QrCode, title: t('feature_qr'), desc: t('feature_qr_desc') },
            { icon: ShieldCheck, title: t('feature_security'), desc: t('feature_security_desc') },
            { icon: Bus, title: t('feature_comfort'), desc: t('feature_comfort_desc') },
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
              <h4 className="text-lg font-bold mb-2 text-[var(--app-text)]">{feature.title}</h4>
              <p className="text-[var(--app-text)]/40 text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </section>
      </main>

      <footer className="py-20 px-6 max-w-7xl mx-auto border-t border-[var(--glass-border)] flex flex-col md:flex-row justify-between items-center gap-10 text-[var(--app-text)]/30 text-xs uppercase tracking-widest font-mono">
        <p>
          © 2026 Safar'Transpo — 
          <span 
            onClick={() => {
              if (user && user.email === 'marcmurhularut@gmail.com') {
                setSelectedRole('admin');
                navigate('/dashboard');
              } else {
                handleLogin();
              }
            }} 
            className="cursor-default ml-1 transition-none select-none"
          >
            Mairie de Bukavu
          </span>
        </p>
        <div className="flex gap-8">
          <a href="#" className="hover:text-[var(--app-text)] transition-colors">Confidentialité</a>
          <a href="#" className="hover:text-[var(--app-text)] transition-colors">Conditions</a>
        </div>
      </footer>
    </div>
  );
}

function RoleOption({ icon: Icon, title, desc, onClick, color }: any) {
  const colorMap: any = {
    'brand-primary': 'text-[#FF6B00] bg-[#FF6B00]/10',
    'brand-accent': 'text-[#00C2FF] bg-[#00C2FF]/10',
    'brand-warning': 'text-[#FFD600] bg-[#FFD600]/10',
    'purple-500': 'text-purple-500 bg-purple-500/10'
  };
  
  return (
    <button 
      onClick={onClick}
      className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-white/20 transition-all text-left flex flex-col gap-4 group hover:bg-white/10 relative overflow-hidden"
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${colorMap[color] || ''}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="relative z-10">
        <h4 className="font-bold text-white mb-1">{title}</h4>
        <p className="text-[10px] text-white/40 leading-relaxed">{desc}</p>
      </div>
      <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none ${colorMap[color] ? colorMap[color].split(' ')[1] : ''}`} />
    </button>
  );
}
