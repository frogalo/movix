"use client";

import { useState } from 'react';
import { Oval } from 'react-loader-spinner';

interface ImageWithLoaderProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  loaderSize?: number;
  wrapperClassName?: string;
}

export function ImageWithLoader({ 
  src, 
  alt, 
  className, 
  loaderSize = 40, 
  wrapperClassName = "w-full h-full", 
  ...props 
}: ImageWithLoaderProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative flex items-center justify-center ${wrapperClassName}`}>
      {!loaded && (
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
      <img
        src={src}
        alt={alt}
        className={`${className || ''} transition-all duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        {...props}
      />
    </div>
  );
}
