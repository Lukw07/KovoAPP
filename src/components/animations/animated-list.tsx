"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

const containerVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.08,
    },
  },
};

const itemVariants = {
  initial: { opacity: 0, x: -16, filter: "blur(3px)" },
  animate: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

interface AnimatedListProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedList({ children, className }: AnimatedListProps) {
  const childArray = Array.isArray(children) ? children : [children];

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {childArray.map((child, i) => (
        <motion.div key={i} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

/* Stagger wrapper for page-level content blocks */
const pageVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const pageItemVariants = {
  initial: { opacity: 0, y: 16, filter: "blur(4px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

export function AnimatedPage({ children, className }: AnimatedListProps) {
  const childArray = Array.isArray(children) ? children : [children];

  return (
    <motion.div
      className={className}
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      {childArray.map((child, i) => (
        <motion.div key={i} variants={pageItemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

/* Grid stagger – for bento/card grids */
const gridVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const gridItemVariants = {
  initial: { opacity: 0, scale: 0.92, y: 12 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 25,
      mass: 0.8,
    },
  },
};

interface AnimatedGridProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedGrid({ children, className }: AnimatedGridProps) {
  const childArray = Array.isArray(children) ? children : [children];

  return (
    <motion.div
      className={className}
      variants={gridVariants}
      initial="initial"
      animate="animate"
    >
      {childArray.map((child, i) => (
        <motion.div key={i} variants={gridItemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
