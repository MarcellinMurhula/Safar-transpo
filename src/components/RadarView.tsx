import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navigation, Bus } from 'lucide-react';
import { cn } from '../lib/utils';

interface BusPosition {
  id: string;
  busId: string;
  lat: number;
  lng: number;
  nickname?: string;
}

interface RadarViewProps {
  liveBuses: BusPosition[];
  center: { lat: number; lng: number };
  activeBusId?: string | null;
  title: string;
  subtitle: string;
  variant?: 'primary' | 'accent';
}

export default function RadarView({ 
  liveBuses, 
  center, 
  activeBusId, 
  title, 
  subtitle,
  variant = 'accent' 
}: RadarViewProps) {
  
  // Max radius for visualization (approx 5km for Bukavu scale)
  const MAX_RADIUS_KM = 3; 

  const getRelativePosition = (lat: number, lng: number) => {
    const R = 6371; // km
    const dLat = (lat - center.lat) * Math.PI / 180;
    const dLng = (lng - center.lng) * Math.PI / 180;
    
    // Simple projection for small distances
    const y = dLat * R;
    const x = dLng * R * Math.cos(center.lat * Math.PI / 180);

    // Normalize to percentage (-50 to 50) based on MAX_RADIUS_KM
    const normX = (x / MAX_RADIUS_KM) * 50;
    const normY = (y / MAX_RADIUS_KM) * 50;

    // Clamp values
    return {
      x: Math.max(-50, Math.min(50, normX)) + 50,
      y: 50 - (Math.max(-50, Math.min(50, normY))) // Invert Y for screen coordinates
    };
  };

  const brandColor = variant === 'primary' ? 'text-brand-primary' : 'text-brand-accent';
  const brandBg = variant === 'primary' ? 'bg-brand-primary' : 'bg-brand-accent';

  return (
    <div className="w-full h-full relative overflow-hidden flex items-center justify-center bg-[#0A0B0E]">
      {/* Radar Background Circles */}
      <div className="absolute w-[80%] aspect-square border border-white/5 rounded-full" />
      <div className="absolute w-[60%] aspect-square border border-white/5 rounded-full" />
      <div className="absolute w-[40%] aspect-square border border-white/5 rounded-full" />
      <div className="absolute w-[20%] aspect-square border border-white/5 rounded-full" />
      
      {/* Crosshair */}
      <div className="absolute w-px h-[90%] bg-white/5" />
      <div className="absolute h-px w-[90%] bg-white/5" />
      
      {/* Radar Sweeper Animation */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute w-[90%] aspect-square"
        style={{
          background: `conic-gradient(from 0deg, transparent 80%, var(--brand-${variant === 'primary' ? 'primary' : 'accent'}))`,
          opacity: 0.15,
          borderRadius: '50%'
        }}
      />

      {/* Center Marker (Base station / User) */}
      <div className="relative z-20 w-4 h-4">
        <div className={cn("absolute inset-0 rounded-full animate-ping opacity-50", brandBg)} />
        <div className={cn("absolute inset-0 rounded-full", brandBg)} />
      </div>

      {/* Live Bus Markers */}
      <AnimatePresence>
        {liveBuses.map((bus) => {
          const pos = getRelativePosition(bus.lat, bus.lng);
          const isActive = bus.id === activeBusId;
          
          return (
            <motion.div
              key={bus.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="absolute z-30"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              <div className="relative -translate-x-1/2 -translate-y-1/2 group">
                <div className={cn(
                  "w-3 h-3 rounded-full border border-white/50 shadow-lg transition-all duration-300",
                  isActive ? brandBg : "bg-[#00C2FF]",
                  isActive ? "scale-150" : "group-hover:scale-125"
                )} />
                
                {/* Tooltip on hover */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 bg-black/80 backdrop-blur-md rounded-lg text-[8px] font-bold uppercase tracking-widest text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {bus.nickname || `BUS ${bus.busId}`}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Info Overlay */}
      <div className="absolute top-10 left-10 z-40 pointer-events-none">
        <div className="flex items-center gap-3 mb-2">
          <Navigation className={cn("w-4 h-4 animate-pulse", brandColor)} />
          <p className={cn("text-[10px] font-bold uppercase tracking-widest", brandColor)}>{title}</p>
        </div>
        <h4 className="text-2xl font-bold tracking-tighter text-white">{subtitle}</h4>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00C2FF]" />
            <span className="text-[10px] text-white/40 uppercase font-bold">Réseau Tierce</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", brandBg)} />
            <span className="text-[10px] text-white/40 uppercase font-bold">Ma Flotte</span>
          </div>
        </div>
      </div>

      {/* Distance Markers */}
      <div className="absolute bottom-10 right-10 z-40 text-[8px] font-bold text-white/20 uppercase tracking-widest">
        Portée : {MAX_RADIUS_KM}km
      </div>
    </div>
  );
}
