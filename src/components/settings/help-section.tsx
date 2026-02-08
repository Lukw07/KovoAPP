"use client";

import { useState } from "react";
import {
  HelpCircle,
  ChevronDown,
  Mail,
  Phone,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FAQ_ITEMS = [
  {
    question: "Jak získám body?",
    answer:
      "Body přiděluje váš nadřízený nebo administrátor za mimořádné výkony, splnění cílů, účast na akcích a další aktivity. Body se zobrazují na dashboardu a můžete je uplatnit v sekci Odměny.",
  },
  {
    question: "Jak si mohu zažádat o dovolenou?",
    answer:
      'Přejděte do sekce "Žádosti" a klikněte na "Nová žádost". Vyberte typ (dovolená, sick day, home office), zadejte termín a odešlete. Váš nadřízený žádost schválí nebo zamítne.',
  },
  {
    question: "Jak fungují rezervace?",
    answer:
      'V sekci "Rezervace" můžete rezervovat firemní auta, zasedací místnosti a další zdroje. Vyberte zdroj, datum a čas. Systém automaticky kontroluje dostupnost.',
  },
  {
    question: "Jak zapnu push notifikace?",
    answer:
      "V Nastavení → Oznámení klikněte na tlačítko Povolit notifikace. Na iOS je nutné nejdříve přidat aplikaci na domovskou obrazovku (Sdílet → Přidat na plochu).",
  },
  {
    question: "Jak změním heslo?",
    answer:
      "V Nastavení → Zabezpečení vyplňte současné heslo a nové heslo (min. 8 znaků, velké písmeno a číslice). Nové heslo potvrďte a odešlete.",
  },
  {
    question: "Jak funguje tržiště?",
    answer:
      'V sekci "Tržiště" mohou zaměstnanci nabízet a prodávat nepotřebné věci kolegům. Můžete přidávat inzeráty s fotkami a popisem. Kontakt probíhá přímo mezi zaměstnanci.',
  },
  {
    question: "Mohu používat aplikaci offline?",
    answer:
      "Aplikace je optimalizovaná jako PWA a základní funkce jsou dostupné i offline. Pro plnou funkčnost je potřeba internetové připojení.",
  },
];

export function HelpSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="animate-fade-in-up stagger-4 space-y-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
          <HelpCircle className="h-5 w-5 text-slate-500 dark:text-slate-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Nápověda
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Často kladené otázky a kontakt
          </p>
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="space-y-1">
        {FAQ_ITEMS.map((item, i) => (
          <div key={i}>
            <button
              onClick={() => toggle(i)}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <span>{item.question}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-300 ease-out",
                  openIndex === i && "rotate-180",
                )}
              />
            </button>
            {openIndex === i && (
              <div className="animate-accordion-open px-3 pb-3 pt-1">
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {item.answer}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Contact section */}
      <div className="border-t border-slate-100 dark:border-slate-700 pt-3 space-y-2">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Potřebujete další pomoc?
        </p>
        <div className="grid gap-2">
          <ContactItem
            icon={<Mail className="h-3.5 w-3.5" />}
            label="E-mail"
            value="podpora@kovoapp.cz"
            href="mailto:podpora@kovoapp.cz"
          />
          <ContactItem
            icon={<Phone className="h-3.5 w-3.5" />}
            label="Telefon"
            value="+420 123 456 789"
            href="tel:+420123456789"
          />
          <ContactItem
            icon={<MessageSquare className="h-3.5 w-3.5" />}
            label="IT podpora"
            value="Helpdesk"
            href="#"
          />
        </div>
      </div>

      {/* App version */}
      <div className="border-t border-slate-100 dark:border-slate-700 pt-3 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          KovoAPP v1.0.0
        </span>
        <a
          href="https://kovoapp.cz"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
        >
          kovoapp.cz
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

/* ----- Helper: Contact row ----- */
function ContactItem({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
    >
      <span className="text-slate-400 dark:text-slate-500 group-hover:text-blue-500 transition-colors">
        {icon}
      </span>
      <div className="flex-1">
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          {label}
        </span>
        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {value}
        </p>
      </div>
    </a>
  );
}
