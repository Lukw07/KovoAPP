"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CaretRight,
  CaretLeft,
  CalendarDots,
  Car,
  Newspaper,
  Gift,
  ChatCircle,
  ChartBar,
  Bell,
  Briefcase,
  Storefront,
  Checks,
} from "@phosphor-icons/react";
import { easings } from "@/components/animations/variants";

/* ── Tutorial steps ────────────────────────────────────────── */
const STEPS = [
  {
    icon: CalendarDots,
    color: "from-blue-500 to-indigo-600",
    iconColor: "text-blue-100",
    title: "Žádosti o volno",
    description:
      "Potřebujete dovolenou nebo sick day? V sekci Žádosti jednoduše vytvořte novou žádost. Vedoucí ji schválí a vše se automaticky zapíše do kalendáře.",
    link: "/requests",
  },
  {
    icon: Car,
    color: "from-emerald-500 to-teal-600",
    iconColor: "text-emerald-100",
    title: "Rezervace",
    description:
      "Rezervujte si firemní auto, zasedací místnost nebo jiné vybavení. Stačí vybrat termín a zdroj — systém hlídá kolize za vás.",
    link: "/reservations",
  },
  {
    icon: Newspaper,
    color: "from-sky-500 to-blue-600",
    iconColor: "text-sky-100",
    title: "Novinky",
    description:
      "Firemní zprávy, oznámení nových projektů a důležité informace od vedení. Vše na jednom místě, s možností komentování.",
    link: "/news",
  },
  {
    icon: ChartBar,
    color: "from-violet-500 to-purple-600",
    iconColor: "text-violet-100",
    title: "Ankety",
    description:
      "Hlasujte v anketách a podílejte se na rozhodování. Vedení pravidelně vytváří ankety na důležitá témata.",
    link: "/polls",
  },
  {
    icon: Gift,
    color: "from-amber-500 to-orange-600",
    iconColor: "text-amber-100",
    title: "Body a odměny",
    description:
      "Za dobrou práci sbíráte body, které můžete vyměnit za odměny v našem interním shopu. Body uděluje vedoucí nebo admin.",
    link: "/rewards",
  },
  {
    icon: ChatCircle,
    color: "from-pink-500 to-rose-600",
    iconColor: "text-pink-100",
    title: "Zprávy",
    description:
      "Soukromé zprávy s kolegy. Ideální pro rychlou komunikaci ohledně tržiště nebo pracovních záležitostí.",
    link: "/messages",
  },
  {
    icon: Storefront,
    color: "from-cyan-500 to-teal-600",
    iconColor: "text-cyan-100",
    title: "Tržiště",
    description:
      "Prodávejte, kupujte nebo nabízejte věci kolegům. Interní bazar přímo v aplikaci — bez externích skupin.",
    link: "/marketplace",
  },
  {
    icon: Bell,
    color: "from-rose-500 to-red-600",
    iconColor: "text-rose-100",
    title: "Notifikace",
    description:
      "Povolte push notifikace a nikdy nezmeškáte schválení žádosti, novou anketu nebo zprávu. Funguje i na telefonu!",
    link: "/settings",
  },
];

const STORAGE_KEY = "kovo-onboarding-completed";

/* ── Main component ────────────────────────────────────────── */
export function OnboardingTutorial() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  useEffect(() => {
    // Check if onboarding was already completed
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Small delay to let the hero animate first
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setIsVisible(false);
  };

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    } else {
      completeOnboarding();
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  };

  const skipAll = () => {
    completeOnboarding();
  };

  if (!isVisible) return null;

  const step = STEPS[currentStep];
  const StepIcon = step.icon;
  const isLast = currentStep === STEPS.length - 1;
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={skipAll}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-x-4 top-[15%] z-50 mx-auto max-w-md"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.4, ease: easings.emphasis }}
          >
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
              {/* Progress bar */}
              <div className="h-1 bg-background-tertiary">
                <motion.div
                  className="h-full bg-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>

              {/* Close button */}
              <div className="flex items-center justify-between px-5 pt-4">
                <span className="text-xs font-medium text-foreground-muted">
                  {currentStep + 1} / {STEPS.length}
                </span>
                <button
                  onClick={skipAll}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-muted hover:bg-background-secondary transition-colors"
                  aria-label="Přeskočit"
                >
                  <X className="h-4 w-4" weight="bold" />
                </button>
              </div>

              {/* Step content — animated */}
              <div className="relative overflow-hidden px-6 pb-6 pt-2" style={{ minHeight: 280 }}>
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={currentStep}
                    custom={direction}
                    initial={{ opacity: 0, x: direction * 60 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction * -60 }}
                    transition={{ duration: 0.3, ease: easings.emphasis }}
                    className="flex flex-col items-center text-center"
                  >
                    {/* Icon */}
                    <div
                      className={`mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color} shadow-lg`}
                    >
                      <StepIcon className={`h-10 w-10 ${step.iconColor}`} weight="duotone" />
                    </div>

                    {/* Title */}
                    <h2 className="mb-2 text-xl font-bold text-foreground">
                      {step.title}
                    </h2>

                    {/* Description */}
                    <p className="text-sm leading-relaxed text-foreground-secondary">
                      {step.description}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between border-t border-border px-5 py-4">
                <button
                  onClick={goPrev}
                  disabled={currentStep === 0}
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-foreground-secondary hover:bg-background-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <CaretLeft className="h-4 w-4" weight="bold" />
                  Zpět
                </button>

                <div className="flex items-center gap-3">
                  {!isLast && (
                    <button
                      onClick={skipAll}
                      className="text-xs font-medium text-foreground-muted hover:text-foreground-secondary transition-colors"
                    >
                      Přeskočit vše
                    </button>
                  )}

                  <button
                    onClick={goNext}
                    className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-95 ${
                      isLast
                        ? "bg-emerald-600 hover:bg-emerald-500"
                        : "bg-accent hover:bg-accent-hover"
                    }`}
                  >
                    {isLast ? (
                      <>
                        <Checks className="h-4 w-4" weight="bold" />
                        Hotovo
                      </>
                    ) : (
                      <>
                        Další
                        <CaretRight className="h-4 w-4" weight="bold" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Dots indicator */}
              <div className="flex items-center justify-center gap-1.5 pb-4">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setDirection(i > currentStep ? 1 : -1);
                      setCurrentStep(i);
                    }}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      i === currentStep
                        ? "w-6 bg-accent"
                        : i < currentStep
                          ? "w-1.5 bg-accent/40"
                          : "w-1.5 bg-foreground-muted/30"
                    }`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
