import React, { useState, useEffect } from 'react';
import { AlertIcon, SpeakerIcon, StopIcon } from './Icons';
import { DISCLAIMER_TEXT } from '../constants';
import { speakText, stopSpeech } from '../utils';

interface DisclaimerModalProps {
  onAccept: () => void;
}

const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ onAccept }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const fullTextToRead = `Aviso Importante de Salud. Bienvenido a Motivia. Antes de continuar, por favor lea atentamente: ${DISCLAIMER_TEXT}. La inteligencia artificial puede cometer errores. Verifique siempre la información importante con fuentes médicas oficiales.`;

  const handleSpeak = () => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
    } else {
      speakText(
        fullTextToRead, 
        () => setIsSpeaking(true), 
        () => setIsSpeaking(false)
      );
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden animate-scale-up">
        <div className="bg-pagebg p-4 border-b border-bordercustom flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-full text-primary border border-bordercustom">
                <AlertIcon className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-maintext">Aviso Importante de Salud</h2>
          </div>
          
          <button 
            onClick={handleSpeak}
            className={`p-2 rounded-full transition-colors ${isSpeaking ? 'bg-secondary text-primary border border-primary' : 'bg-white text-slate-500 hover:bg-secondary hover:text-primary border border-bordercustom'}`}
            title={isSpeaking ? "Detener lectura" : "Escuchar aviso"}
          >
            {isSpeaking ? <StopIcon className="w-5 h-5" /> : <SpeakerIcon className="w-5 h-5" />}
          </button>
        </div>
        
        <div className="p-6 text-maintext text-sm leading-relaxed space-y-4">
          <p className="font-medium">
            Bienvenido a Motivia. Antes de continuar, por favor lea atentamente:
          </p>
          <div className="p-4 bg-pagebg rounded-md border border-bordercustom text-slate-600 italic">
             {DISCLAIMER_TEXT}
          </div>
          <p>
            La inteligencia artificial puede cometer errores. Verifique siempre la información importante con fuentes médicas oficiales.
          </p>
        </div>

        <div className="p-4 bg-slate-50 border-t border-bordercustom flex justify-end">
          <button 
            onClick={() => {
                stopSpeech();
                onAccept();
            }}
            className="bg-accent hover:bg-accent-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-md"
          >
            Entiendo y Acepto
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisclaimerModal;