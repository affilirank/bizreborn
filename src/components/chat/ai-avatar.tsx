import * as React from "react";

export function AiAvatar({
  className = "",
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  const id = React.useId();
  const gid = `aiav-grad-${id.replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role="img"
      aria-label="Biz Reborn AI assistant"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="64" y2="64">
          <stop offset="0" stopColor="#6366F1" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${gid})`} />
      <rect
        x="0.75"
        y="0.75"
        width="62.5"
        height="62.5"
        rx="17.25"
        stroke="white"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      <g stroke="white" strokeWidth="3.4" strokeLinecap="round">
        <circle cx="24" cy="26" r="3" fill="white" stroke="none" />
        <circle cx="40" cy="26" r="3" fill="white" stroke="none" />
        <path d="M22 40 Q32 50 42 40" fill="none" />
      </g>
      <path
        d="M32 8 l2.2 5.8 L40 16 l-5.8 2.2 L32 24 l-2.2-5.8 L24 16 l5.8-2.2 Z"
        fill="white"
        fillOpacity="0.5"
      />
    </svg>
  );
}
