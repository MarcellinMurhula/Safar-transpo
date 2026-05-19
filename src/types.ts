// types.ts (needed for aiService refinement)
export interface DestinationAdvice {
  distance: string;
  estimatedTime: string;
  roadConditions: string;
  securityTips: string;
  practicability: string;
}

export interface MaintenancePrediction {
  component: string;
  status: 'ok' | 'warning' | 'critical';
  remainingLifePercent: number;
  estimatedFailureDate: string;
  recommendation: string;
}

export interface VehicleHealthStatus {
  fuelLevel: string;
  tireStatus: string;
  engineHealth: string;
  prediction: string;
  safetyAdvice: string;
  risks: string[];
  maintenancePredictions?: MaintenancePrediction[];
}

export interface AdminDecision {
  analysis: string;
  suggestedAction: string;
  priceFixingAdvice: string;
  networkOptimization: string;
}

export interface WeatherInfo {
  temperature: string;
  condition: string;
  riskLevel: 'low' | 'medium' | 'high';
  alertMessage: string;
  humidity: string;
  windSpeed: string;
}

export interface Profile {
  uid: string;
  email: string;
  role: 'user' | 'owner' | 'admin';
  roles?: ('user' | 'owner' | 'admin')[];
  status?: 'pending' | 'accepted' | 'rejected';
  balance: number;
  fullName: string;
  theme?: 'light' | 'dark';
  isApproved?: boolean;
}
