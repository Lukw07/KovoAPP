"use client";

import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
  useInView,
  useAnimationControls,
  type HTMLMotionProps,
  type Variants,
} from "framer-motion";
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
  type CSSProperties,
} from "react";
import {
  pageTransition,
  fadeIn,
  slideUp,
  slideIn,
  scaleIn,
  staggerContainer,
  staggerItem,
  springPresets,
  easings,
} from "./variants";
import { cn } from "@/lib/utils";

/* ============================================================================
   PAGE TRANSITION — wrap page content for route change animations
   ============================================================================ */

interface PageTransitionProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
}

export function PageTransition({
  children,
  className,
  ...props
}: PageTransitionProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransition}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================================
   FADE IN — simple opacity animation
   ============================================================================ */

interface FadeInProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.5,
  className,
  ...props
}: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration, ease: easings.enter }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================================
   SLIDE UP — content slides up with fade
   ============================================================================ */

interface SlideUpProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  delay?: number;
  distance?: number;
  className?: string;
}

export function SlideUp({
  children,
  delay = 0,
  distance = 24,
  className,
  ...props
}: SlideUpProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: distance }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: easings.emphasis }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================================
   SLIDE IN — from any direction
   ============================================================================ */

interface SlideInProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  direction?: "left" | "right" | "up" | "down";
  delay?: number;
  distance?: number;
  className?: string;
}

export function SlideIn({
  children,
  direction = "left",
  delay = 0,
  distance = 40,
  className,
  ...props
}: SlideInProps) {
  const axis = direction === "left" || direction === "right" ? "x" : "y";
  const value = direction === "left" || direction === "up" ? -distance : distance;

  return (
    <motion.div
      initial={{ opacity: 0, [axis]: value }}
      animate={{ opacity: 1, [axis]: 0 }}
      transition={{ delay, duration: 0.45, ease: easings.expressive }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================================
   SCALE IN — pop-in from center
   ============================================================================ */

interface ScaleInProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function ScaleIn({
  children,
  delay = 0,
  className,
  ...props
}: ScaleInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, ...springPresets.bouncy }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================================
   STAGGER CONTAINER + ITEM — orchestrated list animations
   ============================================================================ */

interface StaggerContainerProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  staggerDelay?: number;
  delayChildren?: number;
  className?: string;
}

export function StaggerContainer({
  children,
  staggerDelay = 0.06,
  delayChildren = 0.1,
  className,
  ...props
}: StaggerContainerProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={staggerContainer(staggerDelay, delayChildren)}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({
  children,
  className,
  ...props
}: StaggerItemProps) {
  return (
    <motion.div variants={staggerItem} className={className} {...props}>
      {children}
    </motion.div>
  );
}

/* ============================================================================
   SCROLL REVEAL — animate when element enters viewport
   ============================================================================ */

interface ScrollRevealProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  direction?: "up" | "down" | "left" | "right";
  distance?: number;
  delay?: number;
  once?: boolean;
  className?: string;
}

export function ScrollReveal({
  children,
  direction = "up",
  distance = 30,
  delay = 0,
  once = true,
  className,
  ...props
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once,
    margin: "-60px 0px",
  });

  const axis = direction === "left" || direction === "right" ? "x" : "y";
  const value = direction === "left" || direction === "up" ? distance : -distance;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, [axis]: value }}
      animate={isInView ? { opacity: 1, [axis]: 0 } : { opacity: 0, [axis]: value }}
      transition={{
        delay,
        duration: 0.6,
        ease: easings.emphasis,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================================
   ANIMATED COUNTER — smooth number counting animation
   ============================================================================ */

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  formatFn?: (n: number) => string;
}

export function AnimatedCounter({
  value,
  duration = 1.5,
  className,
  prefix = "",
  suffix = "",
  formatFn,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      motionVal.set(value);
    }
  }, [isInView, value, motionVal]);

  useEffect(() => {
    const unsubscribe = springVal.on("change", (latest) => {
      if (ref.current) {
        const formatted = formatFn
          ? formatFn(Math.round(latest))
          : Math.round(latest).toLocaleString("cs-CZ");
        ref.current.textContent = `${prefix}${formatted}${suffix}`;
      }
    });
    return unsubscribe;
  }, [springVal, prefix, suffix, formatFn]);

  return <span ref={ref} className={className} />;
}

/* ============================================================================
   MAGNETIC BUTTON — cursor-attracted interactive element
   ============================================================================ */

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  strength?: number;
  as?: "button" | "div" | "a";
  onClick?: () => void;
}

export function MagneticButton({
  children,
  className,
  strength = 0.35,
  as = "button",
  onClick,
}: MagneticButtonProps) {
  const ref = useRef<HTMLElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, springPresets.snappy);
  const springY = useSpring(y, springPresets.snappy);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      x.set((e.clientX - centerX) * strength);
      y.set((e.clientY - centerY) * strength);
    },
    [strength, x, y],
  );

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  const Component = motion[as] as typeof motion.button;

  return (
    <Component
      ref={ref as any}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={className}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </Component>
  );
}

/* ============================================================================
   FLOATING ELEMENT — subtle Y oscillation (like CSS subtleFloat but smarter)
   ============================================================================ */

interface FloatingElementProps {
  children: ReactNode;
  className?: string;
  amplitude?: number;
  duration?: number;
}

export function FloatingElement({
  children,
  className,
  amplitude = 8,
  duration = 3,
}: FloatingElementProps) {
  return (
    <motion.div
      animate={{
        y: [-amplitude / 2, amplitude / 2, -amplitude / 2],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================================
   GLOW CARD — interactive hover glow effect tracking cursor
   ============================================================================ */

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  glowSize?: number;
}

export function GlowCard({
  children,
  className,
  glowColor = "rgba(99, 102, 241, 0.15)",
  glowSize = 300,
}: GlowCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    [],
  );

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={cn("relative overflow-hidden", className)}
      whileHover={{ y: -2 }}
      transition={springPresets.smooth}
    >
      {/* Glow gradient following cursor */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-0 rounded-[inherit]"
        animate={{
          opacity: isHovering ? 1 : 0,
          background: `radial-gradient(${glowSize}px circle at ${mousePos.x}px ${mousePos.y}px, ${glowColor}, transparent 70%)`,
        }}
        transition={{ opacity: { duration: 0.3 } }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

/* ============================================================================
   RIPPLE BUTTON — Material-style click ripple
   ============================================================================ */

interface RippleButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  type?: "button" | "submit";
}

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

export function RippleButton({
  children,
  className,
  onClick,
  disabled,
  type = "button",
}: RippleButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const ripple: Ripple = {
        id: Date.now(),
        x: e.clientX - rect.left - size / 2,
        y: e.clientY - rect.top - size / 2,
        size,
      };
      setRipples((prev) => [...prev, ripple]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
      }, 600);
      onClick?.(e);
    },
    [onClick],
  );

  return (
    <motion.button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={cn("relative overflow-hidden", className)}
      whileTap={{ scale: 0.97 }}
      transition={springPresets.snappy}
    >
      {children}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full bg-white/25 pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
          }}
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 0 }}
          transition={{ duration: 0.6, ease: easings.enter }}
        />
      ))}
    </motion.button>
  );
}

/* ============================================================================
   SHIMMER TEXT — premium text with animated gradient shimmer
   ============================================================================ */

interface ShimmerTextProps {
  children: string;
  className?: string;
  shimmerColor?: string;
}

export function ShimmerText({
  children,
  className,
  shimmerColor = "rgba(255,255,255,0.4)",
}: ShimmerTextProps) {
  return (
    <motion.span
      className={cn("relative inline-block bg-clip-text", className)}
      style={{
        backgroundImage: `linear-gradient(
          110deg,
          currentColor 35%,
          ${shimmerColor} 50%,
          currentColor 65%
        )`,
        backgroundSize: "200% 100%",
        WebkitBackgroundClip: "text",
        color: "transparent",
      }}
      animate={{ backgroundPosition: ["200% 0%", "-200% 0%"] }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      {children}
    </motion.span>
  );
}

/* ============================================================================
   PARALLAX SCROLL — element moves at different scroll rate
   ============================================================================ */

interface ParallaxScrollProps {
  children: ReactNode;
  speed?: number;
  className?: string;
}

export function ParallaxScroll({
  children,
  speed = 0.3,
  className,
}: ParallaxScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const smoothY = useSpring(y, { stiffness: 100, damping: 30 });

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const scrollProgress = rect.top / window.innerHeight;
      y.set(scrollProgress * 100 * speed);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [speed, y]);

  return (
    <motion.div ref={ref} style={{ y: smoothY }} className={className}>
      {children}
    </motion.div>
  );
}

/* ============================================================================
   ANIMATED GRADIENT BORDER — rotating gradient border effect
   ============================================================================ */

interface AnimatedGradientBorderProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  borderWidth?: number;
  gradientColors?: string[];
  duration?: number;
}

export function AnimatedGradientBorder({
  children,
  className,
  containerClassName,
  borderWidth = 2,
  gradientColors = ["#6366f1", "#8b5cf6", "#06b6d4", "#6366f1"],
  duration = 4,
}: AnimatedGradientBorderProps) {
  return (
    <div className={cn("relative rounded-2xl p-[var(--border-width)]", containerClassName)}
      style={{ "--border-width": `${borderWidth}px` } as CSSProperties}
    >
      {/* Rotating gradient background */}
      <motion.div
        className="absolute inset-0 rounded-[inherit]"
        style={{
          background: `conic-gradient(from 0deg, ${gradientColors.join(", ")})`,
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      {/* Inner content with background to mask the gradient */}
      <div className={cn("relative rounded-[calc(1rem-var(--border-width))] bg-card", className)}>
        {children}
      </div>
    </div>
  );
}

/* ============================================================================
   PULSE ON HOVER — element pulses when hovered
   ============================================================================ */

interface PulseOnHoverProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
}

export function PulseOnHover({
  children,
  className,
  ...props
}: PulseOnHoverProps) {
  return (
    <motion.div
      whileHover={{
        scale: [1, 1.02, 1],
        transition: {
          duration: 0.8,
          repeat: Infinity,
          ease: "easeInOut",
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================================
   MORPHING CARD — card with interactive 3D tilt effect
   ============================================================================ */

interface MorphingCardProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
}

export function MorphingCard({
  children,
  className,
  intensity = 15,
}: MorphingCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRX = useSpring(rotateX, springPresets.smooth);
  const springRY = useSpring(rotateY, springPresets.smooth);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const percentX = (e.clientX - centerX) / (rect.width / 2);
      const percentY = (e.clientY - centerY) / (rect.height / 2);
      rotateX.set(-percentY * intensity);
      rotateY.set(percentX * intensity);
    },
    [intensity, rotateX, rotateY],
  );

  const handleMouseLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
  }, [rotateX, rotateY]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: springRX,
        rotateY: springRY,
        transformPerspective: 800,
        transformStyle: "preserve-3d",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================================
   TYPEWRITER — text appears character by character
   ============================================================================ */

interface TypeWriterProps {
  text: string;
  className?: string;
  speed?: number;
  delay?: number;
  cursor?: boolean;
}

export function TypeWriter({
  text,
  className,
  speed = 40,
  delay = 0,
  cursor = true,
}: TypeWriterProps) {
  const [displayText, setDisplayText] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, started]);

  return (
    <span className={className}>
      {displayText}
      {cursor && started && displayText.length < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.6, repeat: Infinity }}
          className="inline-block w-[2px] h-[1em] bg-current ml-0.5 align-middle"
        />
      )}
    </span>
  );
}

/* ============================================================================
   PROGRESS RING — animated circular progress indicator
   ============================================================================ */

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: string;
  trackColor?: string;
  children?: ReactNode;
}

export function ProgressRing({
  progress,
  size = 60,
  strokeWidth = 4,
  className,
  color = "var(--accent)",
  trackColor = "var(--border)",
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const springProgress = useSpring(0, {
    stiffness: 60,
    damping: 20,
  });
  const strokeDashoffset = useTransform(
    springProgress,
    [0, 100],
    [circumference, 0],
  );

  useEffect(() => {
    springProgress.set(progress);
  }, [progress, springProgress]);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   SWIPEABLE CARD — swipe to dismiss (mobile gesture)
   ============================================================================ */

interface SwipeableCardProps {
  children: ReactNode;
  className?: string;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

export function SwipeableCard({
  children,
  className,
  onSwipeLeft,
  onSwipeRight,
  threshold = 100,
}: SwipeableCardProps) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  const rotate = useTransform(x, [-200, 0, 200], [-8, 0, 8]);

  return (
    <motion.div
      style={{ x, opacity, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.4}
      onDragEnd={(_, info) => {
        if (info.offset.x > threshold) {
          onSwipeRight?.();
        } else if (info.offset.x < -threshold) {
          onSwipeLeft?.();
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
