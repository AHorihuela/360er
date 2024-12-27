import { useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(CustomEase);

interface LogoProps {
  className?: string;
  animate?: boolean;
}

export function Logo({ className = '', animate = true }: LogoProps) {
  const logoRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useGSAP(() => {
    if (!animate || !logoRef.current) return;

    const airtime = CustomEase.create("custom", "M0,0 C0.05,0.356 0.377,0.435 0.5,0.5 0.61,0.558 0.948,0.652 1,1");
    const tl = gsap.timeline({ 
      repeat: 0,
      defaults: { ease: "power4.inOut" }
    });

    // Initial state
    gsap.set(logoRef.current, { x: -100, opacity: 0 });
    gsap.set('.logo-circle', { scale: 0, transformOrigin: '50% 50%' });
    gsap.set('.logo-number', { opacity: 0, y: 20 });
    gsap.set('.logo-lines line', { scale: 0, transformOrigin: '50% 50%' });

    // Animate in
    tl.to(logoRef.current, {
      x: 0,
      opacity: 1,
      duration: 0.6,
      ease: "power2.out"
    })
    .to('.logo-circle', {
      scale: 1,
      duration: 0.5,
      ease: "back.out(1.7)"
    }, "-=0.3")
    .to('.logo-number', {
      opacity: 1,
      y: 0,
      duration: 0.4,
      ease: airtime
    }, "-=0.2")
    .to('.logo-lines line', {
      scale: 1,
      duration: 0.3,
      stagger: {
        each: 0.1,
        from: "random"
      },
      ease: "power1.out"
    }, "-=0.2");

    // Rotate lines
    tl.to('.logo-lines', {
      rotation: 360,
      duration: 20,
      repeat: -1,
      ease: "none",
      transformOrigin: "50% 50%"
    }, "-=0.5");

  }, [animate]);

  return (
    <svg
      ref={logoRef}
      viewBox="0 0 100 100"
      className={`w-10 h-10 ${className}`}
      aria-label="Squad360 Logo"
    >
      {/* Main circle */}
      <circle
        className="logo-circle"
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      
      {/* Dynamic lines */}
      <g className="logo-lines" stroke="currentColor" strokeWidth="2">
        <line x1="50" y1="10" x2="50" y2="25" />
        <line x1="90" y1="50" x2="75" y2="50" />
        <line x1="50" y1="90" x2="50" y2="75" />
        <line x1="10" y1="50" x2="25" y2="50" />
        <line x1="75" y1="25" x2="65" y2="35" />
        <line x1="75" y1="75" x2="65" y2="65" />
        <line x1="25" y1="75" x2="35" y2="65" />
        <line x1="25" y1="25" x2="35" y2="35" />
      </g>

      {/* 360 text */}
      <text
        className="logo-number"
        x="50"
        y="55"
        textAnchor="middle"
        fontSize="16"
        fontWeight="bold"
        fill="currentColor"
      >
        360
      </text>
    </svg>
  );
} 