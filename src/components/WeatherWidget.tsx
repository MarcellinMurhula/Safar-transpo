import React, { useEffect, useState } from 'react';
import { Cloud, Sun, CloudRain, Wind, Thermometer, AlertCircle, RefreshCw } from 'lucide-react';
import { aiService, WeatherInfo } from '../services/aiService';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchWeather = async () => {
    setLoading(true);
    try {
      const data = await aiService.getBukavuWeather();
      setWeather(data);
    } catch (err) {
      console.error("Failed to fetch weather", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 300000); // Refresh every 5 mins
    return () => clearInterval(interval);
  }, []);

  if (!weather && loading) {
    return (
      <div className="p-6 rounded-[2rem] frosted-glass border border-glass-border flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin opacity-20" />
      </div>
    );
  }

  if (!weather) return null;

  const getIcon = (condition: string) => {
    const c = condition.toLowerCase();
    if (c.includes('pluie') || c.includes('rain')) return <CloudRain className="w-8 h-8 text-blue-400" />;
    if (c.includes('soleil') || c.includes('sun')) return <Sun className="w-8 h-8 text-yellow-400" />;
    return <Cloud className="w-8 h-8 text-gray-400" />;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-6 rounded-[2rem] frosted-glass border transition-all duration-500",
        weather.riskLevel === 'high' ? "border-red-500/50 bg-red-500/5" : 
        weather.riskLevel === 'medium' ? "border-yellow-500/50 bg-yellow-500/5" : 
        "border-glass-border"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/5 rounded-2xl">
            {getIcon(weather.condition)}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Météo Bukavu</p>
            <p className="text-sm font-bold capitalize">{weather.condition}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black tracking-tighter text-brand-accent">{weather.temperature}</p>
          <p className="text-[8px] font-bold uppercase opacity-40">En temps réel</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-white/5 border border-glass-border flex items-center gap-2">
          <Thermometer className="w-3 h-3 opacity-40" />
          <span className="text-[10px] font-bold">{weather.humidity} Hum.</span>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-glass-border flex items-center gap-2">
          <Wind className="w-3 h-3 opacity-40" />
          <span className="text-[10px] font-bold">{weather.windSpeed} Vent</span>
        </div>
      </div>

      <AnimatePresence>
        {weather.riskLevel !== 'low' && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={cn(
              "p-4 rounded-2xl flex gap-3 items-start",
              weather.riskLevel === 'high' ? "bg-red-500/20 text-red-200" : "bg-yellow-500/20 text-yellow-200"
            )}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-[10px] font-medium leading-relaxed italic">
              {weather.alertMessage}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={fetchWeather}
        disabled={loading}
        className="w-full mt-4 py-2 text-[8px] font-bold uppercase tracking-widest opacity-20 hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
      >
        <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> Actualiser
      </button>
    </motion.div>
  );
};

export default WeatherWidget;
