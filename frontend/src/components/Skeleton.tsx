import React from "react";

interface SkeletonProps {
  variant?: "rect" | "circle" | "text" | "grid" | "list" | "log";
  width?: string | number;
  height?: string | number;
  rows?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = "rect",
  width,
  height,
  rows = 1,
  className = "",
  style = {},
}) => {
  const baseClass = `skeleton ${className}`;

  if (variant === "text") {
    return (
      <div style={{ width, ...style }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className={`${baseClass} skeleton-text`} />
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div style={{ width, ...style }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className={`${baseClass} skeleton-bar`} />
        ))}
      </div>
    );
  }

  if (variant === "log") {
    return (
      <div style={{ width, ...style, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className={`${baseClass}`} style={{ 
            height: '16px', 
            width: '100%',
            clipPath: 'none',
            display: 'grid',
            gridTemplateColumns: '36px 46px 1fr 52px',
            gap: '6px',
            alignItems: 'center',
            padding: '2px 4px',
            opacity: 1 - (i * 0.08) // fade out effect
          }}>
            <div className="skeleton" style={{ height: '8px', width: '20px' }} />
            <div className="skeleton" style={{ height: '8px', width: '30px' }} />
            <div className="skeleton" style={{ height: '8px', width: '60%' }} />
            <div className="skeleton" style={{ height: '8px', width: '20px', justifySelf: 'end' }} />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "grid") {
    // Default to 4x4 grid for Wumpus
    return (
      <div 
        className="skeleton-grid" 
        style={{ 
          gridTemplateColumns: "repeat(4, 1fr)", 
          gridTemplateRows: "repeat(4, 1fr)",
          ...style 
        }}
      >
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className={baseClass} style={{ 
            width: '100%', 
            height: '100%',
            border: '1px solid rgba(0, 229, 255, 0.1)'
          }} />
        ))}
      </div>
    );
  }

  return (
    <div
      className={baseClass}
      style={{
        width,
        height,
        borderRadius: variant === "circle" ? "50%" : undefined,
        ...style,
      }}
    />
  );
};
