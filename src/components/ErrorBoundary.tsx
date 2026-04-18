import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let displayMessage = "Oups ! Quelque chose s'est mal passé.";
      let details = this.state.error?.message || "";

      try {
        const parsed = JSON.parse(details);
        if (parsed.operationType) {
          displayMessage = "Erreur de synchronisation avec le serveur.";
          details = `Action: ${parsed.operationType} sur ${parsed.path}. ${parsed.error}`;
        }
      } catch (e) {
        // Not a JSON error info
      }

      return (
        <div className="min-h-screen bg-[#0a0b0e] flex items-center justify-center p-6 text-white text-center">
          <div className="max-w-md w-full frosted-glass rounded-[2.5rem] p-10 border border-white/10 shadow-2xl">
            <div className="w-20 h-20 bg-red-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            
            <h2 className="text-3xl font-bold tracking-tighter mb-4">{displayMessage}</h2>
            <p className="text-white/40 text-sm leading-relaxed mb-8 break-words">
              {details}
            </p>

            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={this.handleReset}
                className="w-full py-4 bg-brand-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-xl shadow-brand-primary/20"
              >
                <RefreshCcw className="w-5 h-5" /> Réessayer
              </button>
              <button 
                onClick={() => window.location.href = '/'}
                className="w-full py-4 bg-white/5 border border-white/10 text-white/60 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
              >
                <Home className="w-5 h-5" /> Retour à l'accueil
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
