import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, Upload, X } from 'lucide-react';
import { Button } from './Button.tsx';

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
        }
      };
      
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        // Explicit play() required for iOS Safari to render video
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn("Video play() failed:", playErr);
        }
      }
      setError(null);
    } catch (err) {
      console.error("Camera Error:", err);
      setError("Unable to access camera. Ensure HTTPS is enabled and permissions are granted.");
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

  // Helper to resize image to max 1024px to prevent memory crashes on mobile
  const processAndCapture = (source: HTMLVideoElement | HTMLImageElement) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const MAX_DIMENSION = 1024;
    
    let width = 0; 
    let height = 0;
    
    if (source instanceof HTMLVideoElement) {
       width = source.videoWidth;
       height = source.videoHeight;
    } else {
       width = source.width;
       height = source.height;
    }

    // Calculate new dimensions
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const ratio = width / height;
      if (width > height) {
        width = MAX_DIMENSION;
        height = Math.round(MAX_DIMENSION / ratio);
      } else {
        height = MAX_DIMENSION;
        width = Math.round(MAX_DIMENSION * ratio);
      }
    }

    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw and compress
      ctx.drawImage(source, 0, 0, width, height);
      // Use 0.8 quality jpeg to reduce payload size significantly
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      // Stop stream if active
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      onCapture(dataUrl);
    }
  };

  const takePhoto = () => {
    if (videoRef.current) {
      processAndCapture(videoRef.current);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const img = new Image();
      img.onload = () => {
        processAndCapture(img);
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => {
        setError("Failed to load image.");
      };
      img.src = URL.createObjectURL(file);
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
    <div className="fixed inset-0 bg-black flex flex-col z-50" style={{ height: '100dvh' }}>
      {/* Camera Viewport - takes all remaining space */}
      <div className="relative flex-1 overflow-hidden bg-neutral-900 min-h-0">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted
          className="absolute inset-0 w-full h-full object-cover grayscale contrast-125"
        />
        {/* Guide Overlay - Minimalist White Corners */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
           <div className="w-64 h-64 relative">
             <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/80"></div>
             <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/80"></div>
             <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/80"></div>
             <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/80"></div>
           </div>
        </div>

        {/* Upload button - top right corner */}
        <label className="absolute top-6 right-6 z-50">
          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          <div className="bg-black/80 backdrop-blur-md p-3 border border-neutral-700 rounded-full cursor-pointer hover:border-white hover:bg-black transition-all">
            <Upload className="w-5 h-5 text-white" />
          </div>
        </label>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Controls - pinned to bottom */}
      <div className="flex-shrink-0 h-36 bg-black flex items-center justify-around px-8">
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
    </div>
  );
};