"use client";

import { useState, useEffect, useRef } from 'react';
import { Oval } from 'react-loader-spinner';

interface ImageWithLoaderProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  loaderSize?: number;
  wrapperClassName?: string;
  fallback?: React.ReactNode;
}

export function ImageWithLoader({ 
  src, 
  alt, 
  className, 
  loaderSize = 40, 
  wrapperClassName = "w-full h-full", 
  fallback,
  ...props 
}: ImageWithLoaderProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Reset states when source changes
    setLoaded(false);
    setError(false);

    // If image is already cached/complete, set state immediately
    if (imgRef.current && imgRef.current.complete) {
      if (imgRef.current.naturalWidth === 0) {
        setError(true);
      } else {
        setLoaded(true);
      }
    }
  }, [src]);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${wrapperClassName}`}>
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm z-10">
          <Oval
            visible={true}
            height={loaderSize}
            width={loaderSize}
            color="#ffcc00"
            secondaryColor="#27272a"
            strokeWidth={3}
            strokeWidthSecondary={3}
            ariaLabel="oval-loading"
          />
        </div>
      )}
      {error && fallback ? (
        fallback
      ) : error ? (
        <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-500 text-[10px] text-center p-2 leading-tight">
          {alt || "Error"}
        </div>
      ) : (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={`${className || ''} transition-all duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(true);
            setError(true);
          }}
          {...props}
        />
      )}
    </div>
  );
}
