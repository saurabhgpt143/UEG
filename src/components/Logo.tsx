import React from "react";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export default function Logo({ className = "w-10 h-10", showText = false }: LogoProps) {
  return (
    <div className="flex items-center gap-3 select-none" id="logo-container">
      <svg
        viewBox="0 0 500 500"
        className={`${className} filter drop-shadow-[0_0_12px_rgba(56,189,248,0.35)]`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Ambient Glow Filters */}
          <filter id="glow-heavy" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="15" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-soft" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Core Gradients */}
          <linearGradient id="nebula-grad-1" x1="10%" y1="10%" x2="90%" y2="90%">
            <stop offset="0%" stopColor="#c084fc" /> {/* Purple */}
            <stop offset="50%" stopColor="#38bdf8" /> {/* Cyan */}
            <stop offset="100%" stopColor="#f59e0b" /> {/* Amber/Gold */}
          </linearGradient>

          <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#818cf8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f472b6" stopOpacity="0.9" />
          </linearGradient>

          <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="25%" stopColor="#fef08a" stopOpacity="0.8" /> {/* Light yellow */}
            <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.3" /> {/* Cyan */}
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>

          {/* Spiral Paths */}
          <linearGradient id="spiral-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          <linearGradient id="spiral-pink" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>

        {/* Outer Circular Space Bound */}
        <circle cx="250" cy="250" r="230" fill="#030712" stroke="#1f2937" strokeWidth="4" />
        
        {/* Ambient background nebulae glow */}
        <circle cx="250" cy="250" r="180" fill="url(#center-glow)" opacity="0.6" />

        {/* Starfield background */}
        <g opacity="0.7">
          <circle cx="120" cy="140" r="1.5" fill="#ffffff" />
          <circle cx="380" cy="150" r="1" fill="#ffffff" />
          <circle cx="150" cy="350" r="2" fill="#ffffff" opacity="0.5" />
          <circle cx="340" cy="370" r="1.5" fill="#ffffff" />
          <circle cx="200" cy="100" r="1" fill="#fef08a" />
          <circle cx="300" cy="110" r="2" fill="#ffffff" />
          <circle cx="280" cy="400" r="1.5" fill="#cbd5e1" />
          <circle cx="110" cy="250" r="1" fill="#ffffff" />
          <circle cx="390" cy="260" r="1.5" fill="#fef08a" opacity="0.8" />
        </g>

        {/* Outer Orbital Ring of Symbols */}
        <circle cx="250" cy="250" r="200" stroke="#1e293b" strokeWidth="1" strokeDasharray="5 10" />

        {/* Orbit track for mathematical symbols */}
        <g fill="#38bdf8" fontSize="24" fontFamily="monospace" fontWeight="bold" opacity="0.85">
          {/* Sigma at Top */}
          <text x="238" y="80">Σ</text>
          {/* Percentage */}
          <text x="360" y="130">%</text>
          {/* Square Root */}
          <text x="380" y="320">√x</text>
          {/* Pi */}
          <text x="242" y="440">π</text>
          {/* Plus */}
          <text x="100" y="320">+</text>
          {/* Sigma bottom-left */}
          <text x="100" y="150">Σ</text>
          {/* Multiply */}
          <text x="180" y="95">×</text>
          {/* Integral */}
          <text x="310" y="95">∫</text>
        </g>

        {/* Tiny stars on the orbit */}
        <circle cx="200" cy="74" r="3" fill="#38bdf8" />
        <circle cx="310" cy="426" r="3.5" fill="#c084fc" />
        <circle cx="430" cy="230" r="2" fill="#fbbf24" />
        <circle cx="70" cy="270" r="2.5" fill="#fb7185" />

        {/* Outer orbital rings wrapping the galaxy */}
        <ellipse cx="250" cy="250" rx="210" ry="80" stroke="url(#ring-grad)" strokeWidth="4.5" transform="rotate(-28 250 250)" strokeDasharray="300 20 50 20" />

        {/* Nested Spiral Arms of the Nebula */}
        <g filter="url(#glow-soft)" opacity="0.9">
          {/* Arm 1 - Cyan-Indigo Spiral */}
          <path
            d="M250,250 C290,220 330,220 340,260 C350,300 310,350 260,350 C200,350 160,290 170,220 C180,150 250,110 320,130 C390,150 420,230 390,300 C360,370 270,410 190,380 C110,350 80,250 120,160"
            stroke="url(#spiral-cyan)"
            strokeWidth="14"
            strokeLinecap="round"
            fill="none"
          />
          {/* Arm 2 - Magenta-Violet Spiral */}
          <path
            d="M250,250 C210,280 170,280 160,240 C150,200 190,150 240,150 C300,150 340,210 330,280 C320,350 250,390 180,370 C110,350 80,270 110,200 C140,130 230,90 310,120 C390,150 420,250 380,340"
            stroke="url(#spiral-pink)"
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* Central Brilliant Glowing Star (Primary focal point) */}
        <g filter="url(#glow-heavy)">
          {/* The white core star */}
          {/* Horizontal / Vertical flares */}
          <path d="M250,210 L254,246 L290,250 L254,254 L250,290 L246,254 L210,250 L246,246 Z" fill="#ffffff" />
          {/* Diagonal secondary flares */}
          <path d="M250,225 L252,248 L275,250 L252,252 L250,275 L248,252 L225,250 L248,248 Z" fill="#fef08a" opacity="0.8" />
          {/* Center pinpoint */}
          <circle cx="250" cy="250" r="5" fill="#ffffff" />
        </g>
      </svg>
      {showText && (
        <div className="flex flex-col">
          <span className="text-sm font-black tracking-wider text-slate-100 uppercase font-sans">
            UEG
          </span>
          <span className="text-[10px] font-medium tracking-tight text-cyan-400">
            Universe Estimate
          </span>
        </div>
      )}
    </div>
  );
}
