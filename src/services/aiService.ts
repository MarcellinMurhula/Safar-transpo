import { DestinationAdvice, VehicleHealthStatus, AdminDecision, WeatherInfo } from "../types";
export type { DestinationAdvice, VehicleHealthStatus, AdminDecision, WeatherInfo };

export const aiService = {
  /**
   * Helper to call our server-side proxy
   */
  async generate(prompt: string, config?: any) {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, config })
    });
    
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'AI request failed');
    }
    
    return await response.json();
  },

  /**
   * Get current weather and transit risks for Bukavu
   */
  async getBukavuWeather(): Promise<WeatherInfo> {
    const result = await this.generate(
      `Génère un bulletin météo réaliste pour Bukavu, RDC à ce moment précis (${new Date().toLocaleString()}). 
      Inclus la température, la condition (pluie, soleil, orage), l'humidité, la vitesse du vent.
      Evalue le niveau de risque pour le transport routier (pentes, boue) et donne un message d'alerte si nécessaire.`,
      {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            temperature: { type: "string" },
            condition: { type: "string" },
            riskLevel: { type: "string", enum: ["low", "medium", "high"] },
            alertMessage: { type: "string" },
            humidity: { type: "string" },
            windSpeed: { type: "string" }
          },
          required: ["temperature", "condition", "riskLevel", "alertMessage", "humidity", "windSpeed"]
        }
      }
    );

    return JSON.parse(result.text || "{}");
  },

  /**
   * Get advice for a user's destination with weather context
   */
  async getDestinationAdvice(origin: string, destination: string, weather?: WeatherInfo): Promise<DestinationAdvice> {
    const weatherContext = weather ? `Conditions météo actuelles : ${weather.condition}, Température: ${weather.temperature}, Risque: ${weather.riskLevel}. ${weather.alertMessage}` : "Considère les conditions habituelles.";
    
    const result = await this.generate(
      `Analyse un trajet de "${origin}" vers "${destination}" à Bukavu, RDC. 
      ${weatherContext}
      Donne la distance estimée, le temps de trajet (en tenant compte de la météo), l'état probable de la route (praticabilité), et des conseils de sécurité spécifiques aux conditions.`,
      {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            distance: { type: "string" },
            estimatedTime: { type: "string" },
            roadConditions: { type: "string" },
            securityTips: { type: "string" },
            practicability: { type: "string" }
          },
          required: ["distance", "estimatedTime", "roadConditions", "securityTips", "practicability"]
        }
      }
    );

    return JSON.parse(result.text || "{}");
  },

  /**
   * Get health status and predictions for a vehicle
   */
  async getVehicleHealthStatus(vehicleData: any): Promise<VehicleHealthStatus> {
    const result = await this.generate(
      `Analyse l'état technique d'un véhicule de transport à Bukavu avec ces données : ${JSON.stringify(vehicleData)}.
      Prédit les pannes, évalue l'usure (pneus, moteur), et donne des conseils de sécurité face aux risques (vitesse, conduite).
      Ajoute des prédictions de maintenance structurées pour les composants clés.`,
      {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            fuelLevel: { type: "string" },
            tireStatus: { type: "string" },
            engineHealth: { type: "string" },
            prediction: { type: "string" },
            safetyAdvice: { type: "string" },
            risks: { 
              type: "array", 
              items: { type: "string" }
            },
            maintenancePredictions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  component: { type: "string" },
                  status: { type: "string", enum: ["ok", "warning", "critical"] },
                  remainingLifePercent: { type: "number" },
                  estimatedFailureDate: { type: "string" },
                  recommendation: { type: "string" }
                },
                required: ["component", "status", "remainingLifePercent", "estimatedFailureDate", "recommendation"]
              }
            }
          },
          required: ["fuelLevel", "tireStatus", "engineHealth", "prediction", "safetyAdvice", "risks", "maintenancePredictions"]
        }
      }
    );

    return JSON.parse(result.text || "{}");
  },

  /**
   * Decision support for Admin
   */
  async getAdminDecisionSupport(alertData: any, networkStats: any): Promise<AdminDecision> {
    const result = await this.generate(
      `En tant qu'expert en transport urbain à Bukavu, analyse cette alerte : ${JSON.stringify(alertData)} 
      et ces statistiques réseau : ${JSON.stringify(networkStats)}.
      Propose des actions, une fixation de prix de transport selon les réalités du terrain, et l'optimisation du réseau.`,
      {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            analysis: { type: "string" },
            suggestedAction: { type: "string" },
            priceFixingAdvice: { type: "string" },
            networkOptimization: { type: "string" }
          },
          required: ["analysis", "suggestedAction", "priceFixingAdvice", "networkOptimization"]
        }
      }
    );

    return JSON.parse(result.text || "{}");
  },

  /**
   * General chat response for any user context
   */
  async getChatResponse(query: string, context: string): Promise<string> {
    const result = await this.generate(
      `Contexte : ${context}\nQuestion : ${query}\nRéponds de manière concise et utile en français.`,
    );
    return result.text || "Désolé, je ne peux pas répondre pour le moment.";
  },

  /**
   * Voice Helpers (TTS / STT)
   */
  speak(text: string) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      window.speechSynthesis.speak(utterance);
    }
  },

  stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  },

  async listen(): Promise<string> {
    return new Promise((resolve, reject) => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        reject("Speech recognition not supported");
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.onresult = (event: any) => {
        resolve(event.results[0][0].transcript);
      };
      recognition.onerror = (err: any) => reject(err);
      recognition.start();
    });
  }
};
