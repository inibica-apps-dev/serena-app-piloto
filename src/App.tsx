import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, Role, SpeechRecognition } from './types';
import { sendMessage } from './services/chatService';
import { INITIAL_GREETING, APP_NAME, LOGO_URL } from './constants';
import MessageBubble from './components/MessageBubble';
import DisclaimerModal from './components/DisclaimerModal';
import VideoModal from './components/VideoModal';
import { SendIcon, InfoIcon, ImageIcon, XIcon, RefreshIcon, CapsuleIcon, SpeakerIcon, StopIcon, CameraIcon, MicIcon, ChevronDownIcon, ChevronUpIcon } from './components/Icons';
import { speakText, stopSpeech } from './utils';

interface SelectedImage {
  dataUrl: string; // The full data URL for preview (data:image/png;base64,...)
  rawBase64: string; // The raw base64 string for the API
  mimeType: string;
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState(false);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [isWelcomeSpeaking, setIsWelcomeSpeaking] = useState(false);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(false); // New state for Auto-Read
  const [isListening, setIsListening] = useState(false); // State for microphone
  const [isQuickQueriesOpen, setIsQuickQueriesOpen] = useState(false); // State for dropdown toggle
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null); // State for modal video player
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Initialize Chat Session
useEffect(() => {
  const greeting: Message = {
    id: 'init-1',
    role: Role.MODEL,
    content: INITIAL_GREETING,
    timestamp: new Date(),
  };
  setMessages([greeting]);
}, []);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      if (recognitionRef.current) {
        recognitionRef.current.continuous = false; // Stop after one sentence/pause
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'es-ES';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
          setIsListening(false);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  // Toggle Microphone
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Tu navegador no soporta entrada de voz.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInputText(''); // Optional: clear input before speaking? Or append? Let's just start listening.
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, selectedImage]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit check
        alert("La imagen es demasiado grande. Por favor usa una imagen menor a 5MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        // Extract raw base64 and mime type
        const mimeType = result.split(';')[0].split(':')[1];
        const rawBase64 = result.split(',')[1];
        
        setSelectedImage({
          dataUrl: result,
          rawBase64: rawBase64,
          mimeType: mimeType
        });
      };
      reader.readAsDataURL(file);
    }
    // Reset inputs so same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
  };

  const handleResetChat = useCallback(() => {
    // 1. Reset the API session (clears conversation history in backend wrapper)
    stopSpeech(); // Stop any ongoing speech
    setIsWelcomeSpeaking(false);
    setIsQuickQueriesOpen(false); // Reset dropdown to closed
    setActiveVideoId(null);
    
    // 2. Create fresh greeting message with unique ID to force re-render
    const greeting: Message = {
      id: `init-${Date.now()}`, 
      role: Role.MODEL,
      content: INITIAL_GREETING,
      timestamp: new Date(),
    };

    // 3. Hard reset of all React state
    setMessages([greeting]);
    setInputText('');
    setSelectedImage(null);
    setIsLoading(false);
  }, []);

  const handleWelcomeSpeak = () => {
    if (isWelcomeSpeaking) {
        stopSpeech();
        setIsWelcomeSpeaking(false);
    } else {
        const welcomeText = "Bienvenido a tu espacio educativo. Consulta sobre psicofármacos, temas de psicología, o pídeme videos de relajación y respiración. Recuerda consultar siempre a tu médico.";
        speakText(
            welcomeText,
            () => setIsWelcomeSpeaking(true),
            () => setIsWelcomeSpeaking(false)
        );
    }
  };

  const handleSendMessage = useCallback(async (textOverride?: string) => {
    stopSpeech(); // Stop speech when user interacts
    
    // Determine content to send: either the override (from buttons) or input state
    const messageToSend = typeof textOverride === 'string' ? textOverride : inputText.trim();
    
    if ((!messageToSend && !selectedImage) || isLoading) return;

    const userMsgId = Date.now().toString();
    const userMessage: Message = {
      id: userMsgId,
      role: Role.USER,
      content: messageToSend,
      image: selectedImage?.dataUrl,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    
    // Prepare data for API
    const imageToSend = selectedImage ? { data: selectedImage.rawBase64, mimeType: selectedImage.mimeType } : undefined;

    // Reset inputs
    setInputText('');
    setSelectedImage(null);
    setIsLoading(true);

try {
  const { text } = await sendMessage(messageToSend, false);

  const botMessage: Message = {
    id: (Date.now() + 1).toString(),
    role: Role.MODEL,
    content: text,
    timestamp: new Date()
  };

  setMessages((prev) => [...prev, botMessage]);

} catch (error: any) {
  const errorMessage: Message = {
    id: (Date.now() + 1).toString(),
    role: Role.MODEL,
    content: error?.message || "Error desconocido en frontend",
    timestamp: new Date(),
    isError: true,
  };

  setMessages((prev) => [...prev, errorMessage]);

} finally {
  setIsLoading(false);
}

  }, [inputText, isLoading, selectedImage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickQueries = [
    { icon: "🔍", text: "Señales de que necesito ayuda profesional" },
    { icon: "🔵", text: "Información sobre antidepresivos" },
    { icon: "🔴", text: "Información sobre ansiolíticos" },
    { icon: "⚡", text: "Manejo de ansiedad" },
    { icon: "🌬️", text: "Manejo del estrés" },
    { icon: "⚖️", text: "Diferencia entre ansiedad y estrés" },
    { icon: "💨", text: "Ejercicios de respiración" },
    { icon: "🧘", text: "Ejercicios de relajación" },
    { icon: "🍃", text: "Ejercicios de meditación / mindfulness" },
    { icon: "🌙", text: "Rutinas para mejorar el sueño" },
    { icon: "🫂", text: "Apoyo familiar en salud mental" },
    { icon: "🗣️", text: "Cómo poner límites sin sentir culpa" },
  ];

  return (
    <div className="flex flex-col h-screen bg-pagebg relative">
      {!hasAcceptedDisclaimer && (
        <DisclaimerModal onAccept={() => setHasAcceptedDisclaimer(true)} />
      )}

      {/* Video Modal Player */}
      {activeVideoId && (
        <VideoModal videoId={activeVideoId} onClose={() => setActiveVideoId(null)} />
      )}

      {/* Header - Primary Color - TEXT GRAY */}
      <header className="bg-primary border-b border-primary-700/10 px-6 py-4 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/20 border border-white/30 shadow-sm backdrop-blur-sm">
            <img 
              src={LOGO_URL} 
              alt={`${APP_NAME} Logo`} 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight hidden sm:block text-slate-500 drop-shadow-sm">{APP_NAME}</h1>
            <p className="text-xs text-slate-100 font-semibold hidden sm:block drop-shadow-sm">Farmacología & Psicología Educativa</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Auto-Read Toggle */}
          <button
            onClick={() => setIsAutoPlayEnabled(!isAutoPlayEnabled)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all bg-white shadow-sm ${
              isAutoPlayEnabled 
                ? 'text-primary border-primary' 
                : 'text-gray-500 border-gray-200 hover:bg-gray-50'
            }`}
            title={isAutoPlayEnabled ? "Lectura automática activada" : "Activar lectura automática"}
          >
             {isAutoPlayEnabled ? <SpeakerIcon className="w-3.5 h-3.5" /> : <SpeakerIcon className="w-3.5 h-3.5 opacity-80" />}
             <span className="hidden md:inline">Auto-leer: {isAutoPlayEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <div className="hidden lg:flex items-center gap-2 bg-white text-gray-500 px-3 py-1.5 rounded-full text-xs font-bold border border-gray-200 shadow-sm">
            <InfoIcon className="w-4 h-4" />
            <span>Evidencia Científica</span>
          </div>
          
          <button 
            type="button"
            onClick={handleResetChat}
            className="flex items-center gap-2 px-3 py-1.5 bg-white text-gray-500 hover:bg-gray-50 rounded-lg transition-colors text-sm font-bold border border-gray-200 shadow-sm cursor-pointer"
            title="Iniciar nueva conversación"
          >
            <RefreshIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva Consulta</span>
          </button>
        </div>
      </header>

      {/* Main Chat Area - Page Background */}
      <main className={`flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar transition-opacity duration-500 bg-pagebg ${!hasAcceptedDisclaimer ? 'opacity-0' : 'opacity-100'}`}>
        <div className="max-w-4xl mx-auto flex flex-col min-h-full justify-end">
          
          {/* Welcome Banner & Quick Actions (Only if few messages) */}
          {messages.length < 2 && (
            <div className="mb-8 animate-fade-in">
              <div className="relative text-center p-8 bg-white/80 backdrop-blur rounded-2xl border border-bordercustom shadow-sm mb-4 group">
                
                {/* TTS Button for Welcome Banner */}
                <div className="absolute top-4 right-4">
                     <button 
                        onClick={handleWelcomeSpeak}
                        className={`p-2 rounded-full transition-colors shadow-sm border ${isWelcomeSpeaking ? 'bg-primary text-white border-primary' : 'bg-white border-bordercustom text-slate-400 hover:text-primary'}`}
                        title="Escuchar bienvenida"
                    >
                        {isWelcomeSpeaking ? <StopIcon className="w-4 h-4" /> : <SpeakerIcon className="w-4 h-4" />}
                    </button>
                </div>

                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl overflow-hidden bg-white border border-bordercustom shadow-sm p-2">
                  <img src={LOGO_URL} alt="Serena Logo" className="w-full h-full object-cover rounded-xl" />
                </div>
                <h3 className="text-lg font-semibold text-maintext mb-2">Bienvenido a tu espacio educativo</h3>
                <p className="text-slate-600 max-w-md mx-auto mb-6">
                  Consulta sobre psicofármacos, temas de psicología, o pídeme videos de relajación y respiración. 
                </p>
                <div className="inline-block px-3 py-1 bg-highlight/10 text-highlight text-xs font-semibold rounded-full border border-highlight/20">
                  Recuerda consultar siempre a tu médico
                </div>
              </div>

              {/* Collapsible Quick Query Section */}
              <div className="max-w-3xl mx-auto">
                 <button 
                    onClick={() => setIsQuickQueriesOpen(!isQuickQueriesOpen)}
                    className="w-full flex items-center justify-between p-4 bg-white border border-bordercustom hover:border-primary/50 rounded-xl transition-all shadow-sm group mb-2"
                 >
                    <span className="text-sm font-semibold text-primary group-hover:text-primary-700">
                        Algunas consultas rápidas comunes...
                    </span>
                    <div className={`text-primary/70 group-hover:text-primary-700 transition-transform duration-300 ${isQuickQueriesOpen ? 'rotate-180' : ''}`}>
                         <ChevronDownIcon className="w-5 h-5" />
                    </div>
                 </button>

                 {isQuickQueriesOpen && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 animate-fade-in-down">
                        {quickQueries.map((query, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSendMessage(query.text)}
                            className="flex items-center gap-3 p-4 bg-white border border-bordercustom rounded-xl transition-all shadow-sm group text-left h-full"
                        >
                            <span className="text-2xl group-hover:scale-110 transition-transform flex-shrink-0 flex items-center justify-center w-8 h-8">
                                {query.icon}
                            </span>
                            <span className="text-sm font-medium text-maintext group-hover:text-accent">{query.text}</span>
                        </button>
                        ))}
                    </div>
                 )}
              </div>

            </div>
          )}

          {messages.map((msg, idx) => (
            <MessageBubble 
              key={msg.id} 
              message={msg} 
              autoPlay={isAutoPlayEnabled && idx === messages.length - 1 && msg.role === Role.MODEL && !msg.isError}
              onPlayVideo={(videoId) => setActiveVideoId(videoId)}
            />
          ))}
          
          {isLoading && (
            <div className="flex w-full justify-start mb-6">
               <div className="flex max-w-[75%] flex-row gap-3">
                 <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-white border border-bordercustom">
                    <img src={LOGO_URL} alt="Bot" className="w-full h-full object-cover" />
                 </div>
                 <div className="p-4 bg-secondary border border-bordercustom rounded-2xl rounded-tl-none shadow-sm">
                   <div className="flex space-x-1 h-full items-center">
                     <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                     <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                     <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                   </div>
                 </div>
               </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="bg-white border-t border-bordercustom p-4 pb-6 md:p-6 z-10">
        <div className="max-w-4xl mx-auto relative">
          
          {/* Image Preview */}
          {selectedImage && (
            <div className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-xl shadow-lg border border-bordercustom animate-scale-up">
              <div className="relative">
                <img src={selectedImage.dataUrl} alt="Preview" className="h-24 w-auto rounded-lg object-cover" />
                <button 
                  onClick={removeSelectedImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          <div className="relative flex items-center shadow-sm rounded-xl overflow-hidden border border-bordercustom focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all bg-white">
            
            {/* Gallery Upload Button (Standard) */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="pl-3 pr-1 py-4 text-primary hover:text-accent transition-colors"
              title="Adjuntar imagen desde galería"
            >
              <ImageIcon className="w-6 h-6" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageSelect}
            />

            {/* Camera Capture Button (Mobile/Tablet) */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="pl-1 pr-2 py-4 text-primary hover:text-accent transition-colors"
              title="Tomar foto con cámara"
            >
              <CameraIcon className="w-6 h-6" />
            </button>
            <input 
              type="file" 
              ref={cameraInputRef} 
              className="hidden" 
              accept="image/*"
              capture="environment" // Forces rear camera on mobile
              onChange={handleImageSelect}
            />
            
            {/* Microphone Button */}
            <button
              onClick={toggleListening}
              className={`pl-1 pr-2 py-4 transition-colors ${
                isListening 
                  ? 'text-red-500 animate-pulse' 
                  : 'text-primary hover:text-accent'
              }`}
              title={isListening ? "Detener grabación" : "Hablar con Serena"}
            >
              <MicIcon className="w-6 h-6" />
            </button>

            <textarea
              className="w-full py-4 px-2 bg-white text-maintext placeholder:text-slate-400 focus:outline-none resize-none max-h-32"
              placeholder={isListening ? "Escuchando..." : (selectedImage ? "Describe la imagen..." : "Escribe o dicta tu consulta...")}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading || !hasAcceptedDisclaimer}
            />
            
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || (!inputText.trim() && !selectedImage) || !hasAcceptedDisclaimer}
              className="pr-4 pl-2 py-4 text-accent hover:text-accent-700 disabled:text-slate-300 transition-colors"
              aria-label="Enviar mensaje"
            >
              <SendIcon className="w-6 h-6" />
            </button>
          </div>
          <p className="text-center text-xs text-slate-400 mt-3">
            Serena utiliza IA y puede cometer errores. Verifica fuentes oficiales.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;