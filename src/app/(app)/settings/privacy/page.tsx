import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export const metadata = { title: "Zásady ochrany osobních údajů" };

export default function PrivacyPolicyPage() {
  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background-secondary text-foreground-secondary hover:bg-background-tertiary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" weight="bold" />
        </Link>
        <h1 className="text-xl font-bold text-foreground">
          Zásady ochrany osobních údajů
        </h1>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-6 text-sm text-foreground-secondary leading-relaxed">
        {/* 1. Správce */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            1. Správce osobních údajů
          </h2>
          <p>
            Správcem osobních údajů je provozovatel aplikace KOVO Apka (dále jen
            „Správce"). Kontakt na Správce:{" "}
            <a
              href="mailto:podpora@kovoapp.cz"
              className="text-accent hover:underline"
            >
              podpora@kovoapp.cz
            </a>
            .
          </p>
        </section>

        {/* 2. Účel zpracování */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            2. Účel a právní základ zpracování
          </h2>
          <p>
            Osobní údaje zaměstnanců jsou zpracovávány za následujícími účely:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>
              <strong>Plnění pracovní smlouvy</strong> (čl. 6 odst. 1 písm. b
              GDPR) — identifikace, správa docházky, dovolených, pracovních
              smluv
            </li>
            <li>
              <strong>Plnění zákonných povinností</strong> (čl. 6 odst. 1 písm.
              c GDPR) — pracovnělékařské prohlídky, mzdová evidence
            </li>
            <li>
              <strong>Oprávněný zájem</strong> (čl. 6 odst. 1 písm. f GDPR) —
              interní komunikace, bodový systém, marketplace, bezpečnostní
              monitoring
            </li>
            <li>
              <strong>Souhlas</strong> (čl. 6 odst. 1 písm. a GDPR) — push
              notifikace, doporučení kandidátů
            </li>
          </ul>
        </section>

        {/* 3. Kategorie dat */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            3. Kategorie zpracovávaných osobních údajů
          </h2>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>
              <strong>Identifikační údaje:</strong> jméno, e-mail, telefon,
              profilová fotografie
            </li>
            <li>
              <strong>Pracovní údaje:</strong> pozice, oddělení, datum nástupu,
              typ úvazku, pracovní smlouvy
            </li>
            <li>
              <strong>Údaje o nepřítomnosti:</strong> dovolené, nemocenské, home
              office
            </li>
            <li>
              <strong>Zdravotní údaje (zvláštní kategorie):</strong> výsledky
              pracovnělékařských prohlídek
            </li>
            <li>
              <strong>Finanční údaje:</strong> mzdové informace (pokud zadány)
            </li>
            <li>
              <strong>Technické údaje:</strong> IP adresa, identifikátor
              zařízení pro push notifikace
            </li>
            <li>
              <strong>Komunikace:</strong> interní zprávy, komentáře, hlasování
              v anketách
            </li>
          </ul>
        </section>

        {/* 4. Doba uchovávání */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            4. Doba uchovávání dat
          </h2>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>
              <strong>Bezpečnostní záznamy:</strong> 90 dní
            </li>
            <li>
              <strong>Notifikace:</strong> 90 dní od přečtení
            </li>
            <li>
              <strong>Přihlašovací relace:</strong> max. 8 hodin
            </li>
            <li>
              <strong>Pracovní údaje:</strong> po dobu trvání pracovního poměru
              + zákonná archivační lhůta
            </li>
            <li>
              <strong>Lékařské prohlídky:</strong> dle zákonných požadavků
            </li>
          </ul>
        </section>

        {/* 5. Příjemci */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            5. Příjemci a předávání dat
          </h2>
          <p>
            Data nejsou sdílena s třetími stranami pro marketingové účely.
            Zpracovatelé:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>
              <strong>Firebase Cloud Messaging (Google):</strong> technicky
              nezbytné pro doručování push notifikací. Předávány jsou pouze
              technické identifikátory zařízení.
            </li>
          </ul>
          <p>
            Obrázky a dokumenty jsou ukládány lokálně na server Správce, nikoli
            v cloudových úložištích třetích stran.
          </p>
        </section>

        {/* 6. Práva */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            6. Vaše práva
          </h2>
          <p>Jako subjekt údajů máte právo na:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>
              <strong>Přístup k údajům</strong> (čl. 15) — přehled a export
              vašich dat v sekci{" "}
              <Link
                href="/settings/my-data"
                className="text-accent hover:underline"
              >
                Moje data
              </Link>
            </li>
            <li>
              <strong>Opravu údajů</strong> (čl. 16) — v profilu aplikace
            </li>
            <li>
              <strong>Výmaz údajů</strong> (čl. 17) — žádost o výmaz v{" "}
              <Link
                href="/settings/my-data"
                className="text-accent hover:underline"
              >
                Nastavení → Moje data
              </Link>
            </li>
            <li>
              <strong>Přenositelnost</strong> (čl. 20) — export dat ve formátu
              JSON/CSV
            </li>
            <li>
              <strong>Námitku</strong> (čl. 21) — proti zpracování na základě
              oprávněného zájmu
            </li>
            <li>
              <strong>Stížnost</strong> — u Úřadu pro ochranu osobních údajů
              (ÚOOÚ), <span className="text-foreground">www.uoou.cz</span>
            </li>
          </ul>
        </section>

        {/* 7. Bezpečnost */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            7. Zabezpečení dat
          </h2>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Šifrování citlivých údajů (AES-256-GCM)</li>
            <li>Hashování hesel (bcrypt, 12 kol)</li>
            <li>Rate limiting a ochrana proti brute force</li>
            <li>
              Bezpečnostní hlavičky (HSTS, CSP, X-Frame-Options)
            </li>
            <li>Audit log všech důležitých operací</li>
            <li>TLS/HTTPS pro veškerou komunikaci</li>
          </ul>
        </section>

        {/* 8. Cookies */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            8. Cookies
          </h2>
          <p>
            Aplikace používá pouze <strong>technicky nezbytné cookies</strong>{" "}
            pro přihlášení (session JWT cookie). Nepoužíváme analytické,
            marketingové ani reklamní cookies.
          </p>
        </section>

        {/* 9. Kontakt */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            9. Kontakt
          </h2>
          <p>
            Máte-li dotazy ohledně zpracování osobních údajů, kontaktujte nás na{" "}
            <a
              href="mailto:podpora@kovoapp.cz"
              className="text-accent hover:underline"
            >
              podpora@kovoapp.cz
            </a>
            .
          </p>
        </section>

        <p className="text-xs text-foreground-muted pt-2 border-t border-border">
          Poslední aktualizace: únor 2026
        </p>
      </div>
    </div>
  );
}
