import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Message, Role, SpeechRecognition } from "./types";
import { sendMessage } from "./services/chatService";
import { INITIAL_GREETING, APP_NAME, LOGO_URL } from "./constants";
import MessageBubble from "./components/MessageBubble";
import DisclaimerModal from "./components/DisclaimerModal";
import VideoModal from "./components/VideoModal";
import {
  SendIcon,
  InfoIcon,
  ImageIcon,
  XIcon,
  RefreshIcon,
  SpeakerIcon,
  StopIcon,
  CameraIcon,
  MicIcon,
  ChevronDownIcon,
} from "./components/Icons";
import { speakText, stopSpeech } from "./utils";
import {
  Conversation,
  createConversation,
  getConversationTitle,
  loadActiveConversationId,
  loadConversations,
  saveActiveConversationId,
  saveConversations,
} from "./conversations";

interface SelectedImage {
  dataUrl: string;
  rawBase64: string;
  mimeType: string;
}

const App: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState(false);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [isWelcomeSpeaking, setIsWelcomeSpeaking] = useState(false);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isQuickQueriesOpen, setIsQuickQueriesOpen] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const activeConversation = useMemo(() => {
    return conversations.find((conv) => conv.id === activeConversationId) || null;
  }, [conversations, activeConversationId]);

  const messages = activeConversation?.messages || [];

  // Cargar conversaciones desde localStorage
  useEffect(() => {
    const savedConversations = loadConversations();
    const savedActiveId = loadActiveConversationId();

    if (savedConversations.length > 0) {
      setConversations(savedConversations);

      const exists = savedConversations.some((conv) => conv.id === savedActiveId);
      setActiveConversationId(exists ? savedActiveId : savedConversations[0].id);
    } else {
      const initialConversation = createConversation(INITIAL_GREETING);
      setConversations([initialConversation]);
      setActiveConversationId(initialConversation.id);
    }
  }, []);

  // Guardar en localStorage
  useEffect(() => {
    if (conversations.length > 0) {
      saveConversations(conversations);
    }
  }, [conversations]);

  useEffect(() => {
    saveActiveConversationId(activeConversationId);
  }, [activeConversationId]);

  // Speech Recognition
  useEffect(() => {
    if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
      const SpeechRecognitionAPI =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      recognitionRef.current = new SpeechRecognitionAPI();

      if (recognitionRef.current) {
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = "es-ES";

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

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Tu navegador no soporta entrada de voz.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInputText("");
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, selectedImage]);

useEffect(() => {
  const textareas = document.querySelectorAll("textarea");
  textareas.forEach((textarea) => {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  });
}, [inputText]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("La imagen es demasiado grande. Por favor usa una imagen menor a 5MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const mimeType = result.split(";")[0].split(":")[1];
        const rawBase64 = result.split(",")[1];

        setSelectedImage({
          dataUrl: result,
          rawBase64,
          mimeType,
        });
      };
      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
  };

  const updateActiveConversationMessages = useCallback(
    (updater: (currentMessages: Message[]) => Message[]) => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== activeConversationId) return conv;

          const updatedMessages = updater(conv.messages);

          return {
            ...conv,
            messages: updatedMessages,
            title: getConversationTitle(updatedMessages),
            updatedAt: new Date().toISOString(),
          };
        })
      );
    },
    [activeConversationId]
  );

  const handleNewConversation = useCallback(() => {
    stopSpeech();
    setIsWelcomeSpeaking(false);
    setIsQuickQueriesOpen(false);
    setActiveVideoId(null);
    setInputText("");
    setSelectedImage(null);
    setIsLoading(false);

    const newConversation = createConversation(INITIAL_GREETING);
    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
    setIsHistoryOpen(false);
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    stopSpeech();
    setIsWelcomeSpeaking(false);
    setActiveVideoId(null);
    setInputText("");
    setSelectedImage(null);
    setIsLoading(false);
    setActiveConversationId(id);
    setIsHistoryOpen(false);
  }, []);

  const handleDeleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const updated = prev.filter((conv) => conv.id !== id);

        if (updated.length === 0) {
          const newConversation = createConversation(INITIAL_GREETING);
          setActiveConversationId(newConversation.id);
          return [newConversation];
        }

        if (activeConversationId === id) {
          setActiveConversationId(updated[0].id);
        }

        return updated;
      });
    },
    [activeConversationId]
  );

  const handleClearAllConversations = useCallback(() => {
    stopSpeech();
    setIsWelcomeSpeaking(false);
    setActiveVideoId(null);

    const newConversation = createConversation(INITIAL_GREETING);
    setConversations([newConversation]);
    setActiveConversationId(newConversation.id);
    setInputText("");
    setSelectedImage(null);
    setIsLoading(false);
    setIsHistoryOpen(false);
  }, []);

  const handleWelcomeSpeak = () => {
    if (isWelcomeSpeaking) {
      stopSpeech();
      setIsWelcomeSpeaking(false);
    } else {
      const welcomeText =
        "Bienvenida/o a tu espacio educativo. Recuerda consultar siempre con el equipo de salud.";
      speakText(
        welcomeText,
        () => setIsWelcomeSpeaking(true),
        () => setIsWelcomeSpeaking(false)
      );
    }
  };

  const buildHistoryForApi = useCallback((conversationMessages: Message[]) => {
    return conversationMessages
      .filter((msg) => !msg.isError)
      .map((msg) => ({
        role: msg.role === Role.USER ? "user" : "assistant",
        content: msg.content,
      }))
      .slice(-20);
  }, []);

  const handleSendMessage = useCallback(
    async (textOverride?: string) => {
      stopSpeech();

      const messageToSend =
        typeof textOverride === "string" ? textOverride : inputText.trim();

      if ((!messageToSend && !selectedImage) || isLoading || !activeConversationId) return;

      const historyForApi = buildHistoryForApi(messages);

      const userMessage: Message = {
        id: Date.now().toString(),
        role: Role.USER,
        content: messageToSend,
        image: selectedImage?.dataUrl,
        timestamp: new Date(),
      };

      updateActiveConversationMessages((prev) => [...prev, userMessage]);

      setInputText("");
      setSelectedImage(null);
      setIsLoading(true);

      try {
        const { text } = await sendMessage(messageToSend, false, historyForApi);

        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: Role.MODEL,
          content: text,
          timestamp: new Date(),
        };

        updateActiveConversationMessages((prev) => [...prev, botMessage]);
      } catch (error: any) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: Role.MODEL,
          content: error?.message || "Error desconocido en frontend",
          timestamp: new Date(),
          isError: true,
        };

        updateActiveConversationMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [
      inputText,
      selectedImage,
      isLoading,
      activeConversationId,
      messages,
      buildHistoryForApi,
      updateActiveConversationMessages,
    ]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
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

      {activeVideoId && (
        <VideoModal videoId={activeVideoId} onClose={() => setActiveVideoId(null)} />
      )}

      <header className="bg-primary border-b border-primary-700/10 px-3 py-3 sm:px-6 sm:py-4 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-white/20 border border-white/30 shadow-sm backdrop-blur-sm">
            <img
              src={LOGO_URL}
              alt={`${APP_NAME} Logo`}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight hidden sm:block text-slate-500 drop-shadow-sm">
              {APP_NAME}
            </h1>
            <p className="text-xs text-slate-100 font-semibold hidden sm:block drop-shadow-sm">
              Farmacología & Psicología Educativa
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsHistoryOpen((prev) => !prev)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold border transition-all bg-white shadow-sm text-gray-500 border-gray-200 hover:bg-gray-50"
            title="Mostrar historial"
          >
            <span className="hidden md:inline">Historial</span>
            <ChevronDownIcon
              className={`w-4 h-4 transition-transform ${
                isHistoryOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          <button
            onClick={() => setIsAutoPlayEnabled(!isAutoPlayEnabled)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all bg-white shadow-sm ${
              isAutoPlayEnabled
                ? "text-primary border-primary"
                : "text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
            title={isAutoPlayEnabled ? "Lectura automática activada" : "Activar lectura automática"}
          >
            <SpeakerIcon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              Auto-leer: {isAutoPlayEnabled ? "ON" : "OFF"}
            </span>
          </button>

          <div className="hidden lg:flex items-center gap-2 bg-white text-gray-500 px-3 py-1.5 rounded-full text-xs font-bold border border-gray-200 shadow-sm">
            <InfoIcon className="w-4 h-4" />
            <span>Evidencia Científica</span>
          </div>

          <button
            type="button"
            onClick={handleNewConversation}
            className="flex items-center gap-2 px-3 py-1.5 bg-white text-gray-500 hover:bg-gray-50 rounded-lg transition-colors text-sm font-bold border border-gray-200 shadow-sm cursor-pointer"
            title="Iniciar nueva conversación"
          >
            <RefreshIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva conversación</span>
          </button>
        </div>
      </header>

      {isHistoryOpen && (
        <section className="bg-white border-b border-bordercustom px-4 py-4 shadow-sm z-10">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-maintext">Conversaciones guardadas</h2>
              <button
                onClick={handleClearAllConversations}
                className="text-xs font-semibold text-red-500 hover:text-red-600"
              >
                Borrar todo
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`rounded-xl border p-3 flex items-start justify-between gap-3 ${
                    conv.id === activeConversationId
                      ? "border-primary bg-primary/5"
                      : "border-bordercustom bg-white"
                  }`}
                >
                  <button
                    onClick={() => handleSelectConversation(conv.id)}
                    className="flex-1 text-left"
                  >
                    <div className="font-semibold text-sm text-maintext truncate">
                      {conv.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(conv.updatedAt).toLocaleString("es-ES")}
                    </div>
                  </button>

                  <button
                    onClick={() => handleDeleteConversation(conv.id)}
                    className="text-xs font-semibold text-red-500 hover:text-red-600"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <main
        className={`flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 custom-scrollbar transition-opacity duration-500 bg-pagebg ${
          !hasAcceptedDisclaimer ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="max-w-4xl mx-auto flex flex-col min-h-full justify-end">
          {messages.length < 2 && (
            <div className="mb-8 animate-fade-in">
              <div className="relative text-center p-5 sm:p-8 bg-white/80 backdrop-blur rounded-2xl border border-bordercustom shadow-sm mb-4 group">
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                  <button
                    onClick={handleWelcomeSpeak}
                    className={`p-1.5 sm:p-2 rounded-full transition-colors shadow-sm border ${
                      isWelcomeSpeaking
                        ? "bg-primary text-white border-primary"
                        : "bg-white border-bordercustom text-slate-400 hover:text-primary"
                    }`}
                    title="Escuchar bienvenida"
                  >
{isWelcomeSpeaking ? (
  <StopIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
) : (
  <SpeakerIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
)}
                  </button>
                </div>

                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-2xl overflow-hidden bg-white border border-bordercustom shadow-sm p-2">
                  <img
                    src={LOGO_URL}
                    alt="Serena Logo"
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-maintext mb-2">
                  Bienvenida/o a tu espacio educativo
                </h3>
                <div className="inline-block px-2.5 sm:px-3 py-1 bg-highlight/10 text-highlight text-[11px] sm:text-xs font-semibold rounded-full border border-highlight/20 leading-snug">
                  Recuerda consultar siempre con el equipo de salud
                </div>
              </div>

              <div className="max-w-3xl mx-auto">
                <button
                  onClick={() => setIsQuickQueriesOpen(!isQuickQueriesOpen)}
                  className="w-full flex items-center justify-between p-3 sm:p-4 bg-white border border-bordercustom hover:border-primary/50 rounded-xl transition-all shadow-sm group mb-2"
                >
                  <span className="text-xs sm:text-sm font-semibold text-primary group-hover:text-primary-700">
                    Algunas consultas rápidas comunes...
                  </span>
                  <div
                    className={`text-primary/70 group-hover:text-primary-700 transition-transform duration-300 ${
                      isQuickQueriesOpen ? "rotate-180" : ""
                    }`}
                  >
                    <ChevronDownIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </button>

                {isQuickQueriesOpen && (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 animate-fade-in-down">
                    {quickQueries.map((query, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(query.text)}
                        className="flex items-center gap-2.5 sm:gap-3 p-3 sm:p-4 bg-white border border-bordercustom rounded-xl transition-all shadow-sm group text-left h-full"
                      >
                        <span className="text-xl sm:text-2xl group-hover:scale-110 transition-transform flex-shrink-0 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8">
                          {query.icon}
                        </span>
                        <span className="text-xs sm:text-sm font-medium text-maintext group-hover:text-accent leading-snug">
                          {query.text}
                        </span>
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
              autoPlay={
                isAutoPlayEnabled &&
                idx === messages.length - 1 &&
                msg.role === Role.MODEL &&
                !msg.isError
              }
              onPlayVideo={(videoId) => setActiveVideoId(videoId)}
            />
          ))}

          {isLoading && (
            <div className="flex w-full justify-start mb-6">
              <div className="flex max-w-[75%] flex-row gap-3">
                <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-white border border-bordercustom">
                  <img src={LOGO_URL} alt="Bot" className="w-full h-full object-cover" />
                </div>
                <div className="p-3 sm:p-4 bg-secondary border border-bordercustom rounded-2xl rounded-tl-none shadow-sm">
                  <div className="flex space-x-1 h-full items-center">
                    <div
                      className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="bg-white border-t border-bordercustom p-2.5 pb-4 sm:p-4 sm:pb-6 md:p-6 z-10">
        <div className="max-w-4xl mx-auto relative">
          {selectedImage && (
            <div className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-xl shadow-lg border border-bordercustom animate-scale-up">
              <div className="relative">
                <img
                  src={selectedImage.dataUrl}
                  alt="Preview"
                  className="h-24 w-auto rounded-lg object-cover"
                />
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
            <button
              onClick={() => fileInputRef.current?.click()}
              className="pl-2.5 sm:pl-3 pr-1 py-3 sm:py-4 text-primary hover:text-accent transition-colors"
              title="Adjuntar imagen desde galería"
            >
              <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageSelect}
            />

            <button
              onClick={() => cameraInputRef.current?.click()}
              className="pl-1 pr-1.5 sm:pr-2 py-3 sm:py-4 text-primary hover:text-accent transition-colors"
              title="Tomar foto con cámara"
            >
              <CameraIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <input
              type="file"
              ref={cameraInputRef}
              className="hidden"
              accept="image/*"
              capture="environment"
              onChange={handleImageSelect}
            />

            <button
              onClick={toggleListening}
              className={`pl-1 pr-1.5 sm:pr-2 py-3 sm:py-4 transition-colors ${
                isListening ? "text-red-500 animate-pulse" : "text-primary hover:text-accent"
              }`}
              title={isListening ? "Detener grabación" : "Hablar con Serena"}
            >
              <MicIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

<textarea
  className="w-full py-3 sm:py-4 px-2 bg-white text-sm sm:text-base text-maintext placeholder:text-slate-400 placeholder:text-sm sm:placeholder:text-base focus:outline-none resize-none min-h-[44px] max-h-40 leading-snug overflow-y-auto"
  placeholder={
    isListening
      ? "Escuchando..."
      : selectedImage
      ? "Describe la imagen..."
      : "Cuéntame qué necesitas y en qué te podemos ayudar..."
  }
  rows={2}
  value={inputText}
  onChange={(e) => {
    setInputText(e.target.value);
    e.currentTarget.style.height = "auto";
    e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
  }}
  onKeyDown={handleKeyDown}
  disabled={isLoading || !hasAcceptedDisclaimer}
/>

            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || (!inputText.trim() && !selectedImage) || !hasAcceptedDisclaimer}
              className="pr-3 sm:pr-4 pl-1.5 sm:pl-2 py-3 sm:py-4 text-accent hover:text-accent-700 disabled:text-slate-300 transition-colors"
              aria-label="Enviar mensaje"
            >
              <SendIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          <p className="text-center text-[10px] sm:text-xs text-slate-400 mt-2.5 sm:mt-3 leading-snug px-2">
            Serena utiliza IA y puede cometer errores. Verifica fuentes oficiales.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;