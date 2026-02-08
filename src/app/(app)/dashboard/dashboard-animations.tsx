"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { easings } from "@/components/animations/variants";

const containerVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  initial: { opacity: 0, y: 20, filter: "blur(4px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.5,
      ease: easings.emphasis,
    },
  },
};

const heroVariants = {
  initial: { opacity: 0, y: 24, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: easings.emphasis,
    },
  },
};

const bentoItemVariants = {
  initial: { opacity: 0, scale: 0.92 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 25,
      mass: 0.8,
    },
  },
};

export function DashboardAnimations({ children }: { children: ReactNode }) {
  // Convert children to array to apply different animations
  const childArray = Array.isArray(children) ? children : [children];

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {childArray.map((child, i) => {
        // First child is the hero card — gets special animation
        if (i === 0) {
          return (
            <motion.div key={i} variants={heroVariants}>
              {child}
            </motion.div>
          );
        }
        return (
          <motion.div key={i} variants={itemVariants}>
            {child}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
