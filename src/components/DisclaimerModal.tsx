import React, { useState, useEffect } from 'react';
import { AlertIcon, SpeakerIcon, StopIcon } from './Icons';
import { DISCLAIMER_TEXT } from '../constants';
import { speakText, stopSpeech } from '../utils';

interface DisclaimerModalProps {
  onAccept: () => void;
}

const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ onAccept }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [step, setStep] = useState(1);

  const firstPageTextToRead = `Aviso importante. 
  Bienvenida/o a Serena. 
  Este espacio está pensado para acompañarte con información clara, útil y basada en evidencia sobre tu salud y bienestar. 
  Antes de empezar, queremos compartir contigo algunos aspectos importantes: ${DISCLAIMER_TEXT}. 
  Este chatbot utiliza inteligencia artificial, por lo que puede cometer errores. 
  Te animamos a contrastar la información importante con profesionales sanitarios.
  Para continuar leyendo la información inicial sobre la aplicación pulse en el botón "He leído y quiero continuar.`;

  const secondPageTextToRead = `Aviso importante. 
  Espacio de apoyo para tu salud y bienestar.
  Puedes consultar sobre: Uso de psicofármacos, Bienestar emocional y salud mental, Estrategias de autocuidado o Ejercicios de relajación y respiración.
  También puedo acompañarte con información clara para ayudarte a entender mejor tu tratamiento y sentirte más segura/o en su uso.
  Para empezar a usar la aplicación pulse en el botón "Tu equipo de salud sigue siendo tu referencia principal".`;

  const currentTextToRead =
    step === 1 ? firstPageTextToRead : secondPageTextToRead;

  const handleSpeak = () => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
    } else {
      speakText(
        currentTextToRead,
        () => setIsSpeaking(true),
        () => setIsSpeaking(false)
      );
    }
  };

  const handleNextStep = () => {
    stopSpeech();
    setIsSpeaking(false);
    setStep(2);
  };

  const handleBackStep = () => {
    stopSpeech();
    setIsSpeaking(false);
    setStep(1);
  };

  const handleFinish = () => {
    stopSpeech();
    setIsSpeaking(false);
    onAccept();
  };

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
            <h2 className="text-lg font-bold text-maintext">
              {step === 1 ? 'Aviso importante' : 'Aviso importante'}
            </h2>
          </div>

          <button
            onClick={handleSpeak}
            className={`p-2 rounded-full transition-colors ${
              isSpeaking
                ? 'bg-secondary text-primary border border-primary'
                : 'bg-white text-slate-500 hover:bg-secondary hover:text-primary border border-bordercustom'
            }`}
            title={isSpeaking ? 'Detener lectura' : 'Escuchar aviso'}
          >
            {isSpeaking ? (
              <StopIcon className="w-5 h-5" />
            ) : (
              <SpeakerIcon className="w-5 h-5" />
            )}
          </button>
        </div>

        <div className="p-6 text-maintext text-sm leading-relaxed space-y-4">
          {step === 1 ? (
            <>
              <p className="text-justify">
                <b>Bienvenida/o a Serena.</b><br/>
                Este espacio está pensado para acompañarte con información clara,
                útil y basada en evidencia sobre tu salud y bienestar.
                Antes de empezar, queremos compartir contigo algunos aspectos importantes:
              </p>

              <div className="p-4 bg-pagebg rounded-md border border-bordercustom text-slate-600 text-justify">
                <p><b>Serena es una herramienta de apoyo educativo.</b></p>
                <p>Su objetivo es ayudarte a comprender mejor el uso de los medicamentos, los hábitos de salud y las opciones de cuidado, para que puedas tomar decisiones informadas.</p>
                <p>No sustituye la valoración individual de profesionales sanitarios.</p>
                <p>Si tienes dudas sobre tu tratamiento o tu salud, te recomendamos consultarlo con tu médica/o o enfermera/o de referencia.</p>
                <p>Sabemos que la salud se vive de manera diferente en cada persona, y que factores como el género, el contexto personal y las responsabilidades de cuidado pueden influir en cómo usamos los tratamientos o en nuestro bienestar.</p>
                <p>Por eso, este chatbot busca ofrecerte información adaptada, comprensible y respetuosa con tu realidad.</p>
              </div>

              <p className="text-justify">
                Este chatbot utiliza inteligencia artificial, por lo que puede cometer errores.
                Te animamos a contrastar la información importante con profesionales sanitarios.
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">
                <b>Espacio de apoyo para tu salud y bienestar</b>
              </p>

              <div className="p-4 bg-pagebg rounded-md border border-bordercustom text-slate-600">
                <p>Puedes consultar sobre:</p>
                <p>•	Uso de psicofármacos.</p>
                <p>•	Bienestar emocional y salud mental.</p>
                <p>•	Estrategias de autocuidado.</p>
                <p>•	Ejercicios de relajación y respiración.</p>
              </div>

              <p>👉 También puedo acompañarte con información clara para ayudarte a entender mejor tu tratamiento y sentirte más segura/o en su uso.</p>
            </>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-bordercustom flex justify-center gap-3">
          {step === 1 ? (
            <button
              onClick={handleNextStep}
              className="bg-accent hover:bg-accent-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-md"
            >
              👉 He leído la información y quiero continuar
            </button>
          ) : (
            <>
              <button
                onClick={handleFinish}
                className="bg-accent hover:bg-accent-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-md"
              >
                Tu equipo de salud sigue siendo tu referencia principal
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
export default DisclaimerModal;