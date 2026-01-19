"use client";

import React from "react"

import { useEffect, useRef, useState } from "react";

interface VideoHeroProps {
  videoUrl?: string;
  fallbackImage?: string;
  overlayOpacity?: number;
  children: React.ReactNode;
  className?: string;
}

export function VideoHero({
  videoUrl,
  fallbackImage,
  overlayOpacity = 0.6,
  children,
  className = "",
}: VideoHeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    const handleCanPlay = () => setIsLoaded(true);
    const handleError = () => setHasError(true);

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);
    };
  }, [videoUrl]);

  return (
    <section className={`relative min-h-screen overflow-hidden ${className}`}>
      {/* Video Background */}
      {videoUrl && !hasError && (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
      )}

      {/* Fallback Image */}
      {(fallbackImage && (!videoUrl || hasError || !isLoaded)) && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${fallbackImage})` }}
        />
      )}

      {/* Gradient Overlay - darker at bottom for text readability */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"
        style={{ opacity: overlayOpacity }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen">
        {children}
      </div>
    </section>
  );
}
