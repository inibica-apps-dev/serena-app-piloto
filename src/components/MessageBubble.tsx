import React, { useState, useEffect } from 'react';
import { Message, Role } from '../types';
import { UserIcon, ExternalLinkIcon, SpeakerIcon, StopIcon, ImageIcon } from './Icons';
import { LOGO_URL } from '../constants';
import { speakText, stopSpeech } from '../utils';

interface MessageBubbleProps {
  message: Message;
  autoPlay?: boolean;
  onPlayVideo?: (videoId: string) => void;
}

// --- UTILITY FUNCTIONS FOR ROBUST URL HANDLING ---

/**
 * Extracts a clean 11-character YouTube Video ID from any variation of YouTube URL.
 * Supports standard, shorts, embed, mobile, and shortened URLs.
 */
const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;

  try {
    const cleanUrl = url.trim().replace(/[.,;!:)\]]+$/, '');
    // Robust Regex for ID extraction handling Shorts, Embeds, standard Watch, and youtu.be
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = cleanUrl.match(regExp);
    
    // Ensure extracted ID is exactly 11 characters
    return (match && match[2].length === 11) ? match[2] : null;
  } catch (e) {
    return null;
  }
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, autoPlay, onPlayVideo }) => {
  const isModel = message.role === Role.MODEL;
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // --- 1. PRE-PROCESS SOURCES ---
  const videoMap = new Map<string, { uri: string; title: string; id: string }>();
  const webMap = new Map<string, { uri: string; title: string }>();

  if (isModel && message.groundingMetadata?.groundingChunks) {
    message.groundingMetadata.groundingChunks.forEach(chunk => {
      if (chunk.web?.uri) {
        const rawUri = chunk.web.uri;
        const title = chunk.web.title || "Fuente externa";
        
        const yId = getYouTubeVideoId(rawUri);

        if (yId) {
            const cleanUri = `https://www.youtube.com/watch?v=${yId}`;
            if (!videoMap.has(yId)) {
                videoMap.set(yId, { uri: cleanUri, title, id: yId });
            }
        } else {
            let validUri = rawUri;
            if (!validUri.startsWith('http')) {
                validUri = `https://${validUri}`;
            }
            if (!webMap.has(rawUri)) {
                webMap.set(rawUri, { uri: validUri, title });
            }
        }
      }
    });
  }

  // LIMIT: Top 5 videos go to big cards
  const allVideos = Array.from(videoMap.values());
  const highlightedVideos = allVideos.slice(0, 5);
  
  // OVERFLOW: Remaining videos + regular web sources go to the bottom list
  const overflowVideos = allVideos.slice(5);
  const webSources = Array.from(webMap.values());
  
  const additionalSources = [...overflowVideos, ...webSources];

  // --- TEXT TO SPEECH HANDLER ---
  const handleSpeak = () => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      return;
    }

    speakText(
        message.content,
        () => setIsSpeaking(true),
        () => setIsSpeaking(false)
    );
  };

  useEffect(() => {
    if (autoPlay && isModel) {
        handleSpeak();
    }
  }, [autoPlay, isModel]);

  useEffect(() => {
    return () => {
      if (isSpeaking) {
        stopSpeech();
      }
    };
  }, [isSpeaking]);


  // Helper to render bold text with highlighter effect
  const renderBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
            <strong 
                key={index} 
                className="font-bold text-highlight bg-amber-100 px-1 rounded-sm mx-0.5"
                title="Concepto clave"
            >
                {part.slice(2, -2)}
            </strong>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const formatTextSegment = (text: string) => {
    return renderBold(text);
  };

  const renderContent = () => {
    if (message.isError) {
      return <span className="text-red-500 font-medium">{message.content}</span>;
    }

    const lines = message.content.split('\n');

    return (
        <div className="space-y-1">
          {lines.map((line, idx) => {
            const trimmedLine = line.trim();
            
            // --- VISUAL SEARCH CARD RENDERER ---
            const visualSearchMatch = trimmedLine.match(/^\[VISUAL_SEARCH:\s*(.+?)\]$/);
            if (visualSearchMatch) {
                const searchTerm = visualSearchMatch[1];
                const googleImagesUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchTerm)}`;
                return (
                    <div key={idx} className="my-3 animate-fade-in">
                        <a href={googleImagesUrl} target="_blank" rel="noopener noreferrer" className="block group decoration-0">
                            <div className="flex items-center gap-4 p-4 bg-white border border-bordercustom rounded-xl shadow-sm hover:shadow-md hover:border-primary transition-all">
                                <div className="w-14 h-14 bg-pagebg rounded-lg flex items-center justify-center text-primary group-hover:scale-110 transition-transform flex-shrink-0">
                                    <ImageIcon className="w-7 h-7" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-maintext text-sm md:text-base group-hover:text-accent transition-colors truncate">
                                        Ver imágenes de: <span className="capitalize">{searchTerm}</span>
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                        Haga clic para ver fotos, diagramas y presentaciones en Google.
                                    </p>
                                </div>
                                <ExternalLinkIcon className="w-5 h-5 text-slate-300 group-hover:text-primary flex-shrink-0" />
                            </div>
                        </a>
                    </div>
                );
            }

            // --- EXERCISE/QUOTE BLOCK RENDERER ---
            if (trimmedLine.startsWith('>')) {
                const content = trimmedLine.substring(1).trim();
                const hasValidVideoSource = highlightedVideos.length > 0;
                const exerciseVideo = hasValidVideoSource ? highlightedVideos[0] : null;

                return (
                    <div key={idx} className="my-3 p-4 bg-white/50 border-l-4 border-primary rounded-r-lg text-maintext shadow-sm animate-fade-in flex flex-col gap-2">
                        <div className="flex items-start gap-3">
                             <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-primary flex-shrink-0 mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polygon points="10 8 16 12 10 16 10 8"></polygon>
                            </svg>
                            <span className="text-sm md:text-base leading-relaxed italic block w-full">
                                {formatTextSegment(content)}
                            </span>
                        </div>
                        
                        {exerciseVideo && (
                            <div className="pl-8 mt-1">
                                <button 
                                    onClick={() => onPlayVideo && onPlayVideo(exerciseVideo.id)}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-primary text-primary text-sm font-semibold rounded-md hover:bg-primary hover:text-white transition-all shadow-sm cursor-pointer"
                                >
                                    <span>Ver video del ejercicio</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                );
            }

            if (!trimmedLine) return <div key={idx} className="h-2"></div>;

            return (
                <div key={idx} className="whitespace-pre-wrap leading-relaxed">
                   {formatTextSegment(line)}
                </div>
            );
          })}
        </div>
      );
  };

  return (
    <div className={`flex w-full ${isModel ? 'justify-start' : 'justify-end'} mb-6 animate-fade-in`}>
      <div className={`flex max-w-[95%] md:max-w-[85%] ${isModel ? 'flex-row' : 'flex-row-reverse'} gap-3`}>
        
{/* Avatar */}
<div
  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden shadow-sm border
  ${isModel ? 'bg-primary border-primary/40' : 'bg-accent border-accent text-white'}`}
>
  {isModel ? (
    <img
      src={LOGO_URL}
      alt="Serena"
      className="w-[160%] h-[160%] object-contain"
    />
  ) : (
    <UserIcon className="w-5 h-5" />
  )}
</div>

        {/* Content Wrapper */}
        <div className={`flex flex-col ${isModel ? 'items-start' : 'items-end'} w-full min-w-0`}>
          
          {/* Main Bubble */}
          <div className={`p-4 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed overflow-hidden w-full relative group border border-bordercustom ${
            isModel 
              ? 'bg-secondary text-maintext rounded-tl-none' // Soft Blue/Grey
              : 'bg-userbubble text-maintext rounded-tr-none' // White (User)
          }`}>
            
            {message.image && (
              <div className="mb-3 rounded-lg overflow-hidden border border-black/10">
                <img 
                  src={message.image} 
                  alt="Imagen adjunta" 
                  className="max-w-full h-auto max-h-64 object-contain bg-black/5" 
                />
              </div>
            )}

            {renderContent()}

            {/* TTS Button for Model Messages */}
            {isModel && !message.isError && (
              <div className="absolute top-2 right-2 transition-opacity">
                <button 
                  onClick={handleSpeak}
                  className={`p-1.5 rounded-full hover:bg-white/50 transition-colors ${isSpeaking ? 'text-accent bg-white/80' : 'text-slate-400 hover:text-primary'}`}
                  title={isSpeaking ? "Detener lectura" : "Escuchar respuesta"}
                >
                  {isSpeaking ? <StopIcon className="w-4 h-4" /> : <SpeakerIcon className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>

          {/* --- RECOMMENDED VIDEOS SECTION (CARDS) --- */}
          {isModel && highlightedVideos.length > 0 && (
            <div className="mt-4 w-full max-w-lg space-y-3">
                <div className="flex items-center gap-2 mb-1 pl-1">
                    <div className="h-px bg-bordercustom flex-1"></div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Videos Recomendados</p>
                    <div className="h-px bg-bordercustom flex-1"></div>
                </div>
                
                {highlightedVideos.map((video) => (
                    <div key={video.id} className="bg-white border border-bordercustom rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary transition-all duration-300 group">
                        <button 
                            onClick={() => onPlayVideo && onPlayVideo(video.id)}
                            className="flex flex-col sm:flex-row text-left w-full"
                        >
                            {/* Thumbnail */}
                            <div className="relative w-full sm:w-40 h-40 sm:h-28 flex-shrink-0 bg-slate-900 overflow-hidden">
                                <img 
                                    src={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`} 
                                    alt={video.title} 
                                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/0 transition-colors">
                                    <div className="w-8 h-8 bg-accent/90 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-4 h-4 ml-0.5">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Video Info */}
                            <div className="flex-1 p-3 flex flex-col justify-between bg-white transition-colors">
                                <h4 className="font-bold text-maintext text-sm leading-snug mb-1 line-clamp-2 group-hover:text-accent transition-colors">
                                    {video.title}
                                </h4>
                                <div className="mt-auto pt-2 flex items-center text-xs font-semibold text-interactive">
                                    <span>Ver video</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 ml-1">
                                        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </button>
                    </div>
                ))}
            </div>
          )}

          {/* --- WEB SOURCES --- */}
          {isModel && additionalSources.length > 0 && (
            <div className="mt-4 w-full max-w-lg">
               <div className="flex items-center gap-2 mb-3 pl-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fuentes Web Adicionales</p>
                    <div className="h-px bg-bordercustom flex-1"></div>
                </div>
              <div className="flex flex-col gap-2">
                {additionalSources.map((source, idx) => {
                    const videoId = (source as any).id || getYouTubeVideoId(source.uri);
                    const domain = new URL(source.uri).hostname.replace('www.', '');
                    const isVideo = !!videoId;
                    
                    const handleClick = (e: React.MouseEvent) => {
                        if (isVideo && videoId && onPlayVideo) {
                            e.preventDefault();
                            onPlayVideo(videoId);
                        }
                    };

                    return (
                        <a 
                        key={idx} 
                        href={source.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={handleClick}
                        className="group flex items-center gap-3 p-3 bg-white border border-bordercustom rounded-xl hover:border-interactive hover:shadow-md transition-all duration-200 cursor-pointer"
                        >
                            {/* Visual Asset */}
                            <div className="flex-shrink-0 w-12 h-12 md:w-16 md:h-12 rounded-lg overflow-hidden bg-pagebg relative border border-bordercustom">
                                {videoId ? (
                                    <>
                                        <img 
                                            src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} 
                                            alt="Thumbnail" 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10">
                                            <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center shadow-sm">
                                                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-3 h-3 ml-0.5"><path d="M8 5v14l11-7z" /></svg>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-secondary-100 text-primary group-hover:bg-secondary-200 transition-colors">
                                        <ExternalLinkIcon className="w-5 h-5" />
                                    </div>
                                )}
                            </div>

                            {/* Text Info */}
                            <div className="flex-1 min-w-0">
                                <h5 className="text-sm font-semibold text-maintext leading-tight group-hover:text-interactive transition-colors line-clamp-2">
                                    {source.title}
                                </h5>
                                <div className="flex items-center gap-1.5 mt-1">
                                    {videoId ? (
                                        <span className="text-[10px] font-bold text-accent bg-white px-1.5 py-0.5 rounded border border-bordercustom">
                                            YOUTUBE
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                            WEB
                                        </span>
                                    )}
                                    <span className="text-xs text-slate-400 truncate">
                                        {domain}
                                    </span>
                                </div>
                            </div>
                        </a>
                    );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default MessageBubble;