
import React, { useEffect } from 'react';
import { XIcon } from './Icons';

interface VideoModalProps {
  videoId: string;
  onClose: () => void;
}

const VideoModal: React.FC<VideoModalProps> = ({ videoId, onClose }) => {
  // Prevent scrolling on body when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-4xl bg-black rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-up border border-slate-700">
        
        {/* Header / Close Button */}
        <div className="absolute top-0 right-0 p-4 z-10">
          <button 
            onClick={onClose}
            className="bg-black/50 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-md transition-all border border-white/10"
            title="Cerrar video"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Video Container (16:9 Aspect Ratio) */}
        <div className="relative pt-[56.25%] w-full bg-black">
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>
        </div>
      </div>
      
      {/* Backdrop click to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose}></div>
    </div>
  );
};

export default VideoModal;
