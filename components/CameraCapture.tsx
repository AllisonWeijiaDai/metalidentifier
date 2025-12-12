import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, Upload, X } from 'lucide-react';
import { Button } from './Button';

interface CameraCaptureProps {
  onCapture: (base64Image: string) => void;
  onCancel: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const startCamera = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };
      
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setError(null);
    } catch (err) {
      console.error("Camera Error:", err);
      setError("Unable to access camera. Please check permissions.");
    }
  }, [facingMode]); 

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]); 

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        
        // Stop stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        onCapture(dataUrl);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        onCapture(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-6 bg-black">
        <div className="text-white font-typewriter text-xl tracking-widest">{error}</div>
        <label className="w-full max-w-xs">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={handleFileUpload} 
          />
          <div className="bg-black p-6 border-2 border-neutral-700 hover:border-white flex flex-col items-center gap-4 cursor-pointer transition-all duration-300 group">
            <Upload className="w-10 h-10 text-neutral-500 group-hover:text-white" />
            <span className="text-neutral-500 group-hover:text-white font-typewriter tracking-widest uppercase">Upload Photo</span>
          </div>
        </label>
        <Button variant="ghost" onClick={onCancel}>Return</Button>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black flex flex-col">
      {/* Viewport */}
      <div className="relative flex-1 overflow-hidden bg-neutral-900">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover grayscale contrast-125"
        />
        {/* Guide Overlay - Minimalist White Corners */}
        <div className="absolute inset-0 border-[0px] border-black/80 pointer-events-none flex items-center justify-center">
           <div className="w-64 h-64 relative">
             <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/80"></div>
             <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/80"></div>
             <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/80"></div>
             <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/80"></div>
           </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Controls - Solid Black bar with White controls */}
      <div className="h-40 bg-black flex items-center justify-around px-8 relative z-50">
        <Button variant="ghost" onClick={onCancel} className="p-4 rounded-full text-neutral-500 hover:text-white hover:bg-neutral-900">
          <X className="w-8 h-8" />
        </Button>

        <button 
          onClick={takePhoto}
          className="w-24 h-24 rounded-full border border-neutral-600 flex items-center justify-center group active:scale-95 transition-transform hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
        >
          <div className="w-20 h-20 bg-neutral-100 rounded-full group-hover:bg-white transition-colors" />
        </button>

        <Button variant="ghost" onClick={switchCamera} className="p-4 rounded-full text-neutral-500 hover:text-white hover:bg-neutral-900">
          <RefreshCw className="w-8 h-8" />
        </Button>
      </div>
      
      {/* Hidden File Input */}
      <label className="absolute top-6 right-6 z-50">
         <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
         <div className="bg-black/80 backdrop-blur-md p-3 border border-neutral-700 rounded-full cursor-pointer hover:border-white hover:bg-black transition-all">
            <Upload className="w-5 h-5 text-white" />
         </div>
      </label>
    </div>
  );
};