// ============================================================================
// KOVO Apka - Comprehensive Database Seed Script
// Populates ALL tables with realistic Czech manufacturing company data
// ============================================================================

import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// ============================================================================
// HELPERS
// ============================================================================

const SALT_ROUNDS = 10;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

function futureDate(daysAhead: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d;
}

function pastDate(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

// ============================================================================
// SEED DATA CONSTANTS
// ============================================================================

const DEPARTMENTS = [
  { name: "Výroba", code: "VYR", color: "#EF4444" },
  { name: "Obrobna", code: "OBR", color: "#F97316" },
  { name: "Logistika", code: "LOG", color: "#EAB308" },
  { name: "Kvalita", code: "KVA", color: "#22C55E" },
  { name: "Údržba", code: "UDR", color: "#3B82F6" },
  { name: "IT & Digitalizace", code: "ITD", color: "#8B5CF6" },
  { name: "HR & Administrativa", code: "HRA", color: "#EC4899" },
  { name: "Obchod", code: "OBC", color: "#14B8A6" },
] as const;

const POSITIONS = {
  ADMIN: ["Ředitel IT", "Systémový administrátor"],
  MANAGER: [
    "Vedoucí výroby",
    "Vedoucí obrobny",
    "Vedoucí logistiky",
    "Vedoucí kvality",
    "Vedoucí údržby",
    "IT manažer",
    "HR manažerka",
    "Obchodní ředitel",
  ],
  EMPLOYEE: [
    "Operátor CNC",
    "Svářeč",
    "Zámečník",
    "Soustružník",
    "Frézař",
    "Kontrolor kvality",
    "Skladník",
    "Řidič VZV",
    "Elektrikář",
    "Mechanik",
    "Programátor CNC",
    "Technolog",
    "Plánovač výroby",
    "Referent logistiky",
    "Nákupčí",
    "Obchodní zástupce",
    "Účetní",
    "Personalista",
    "IT technik",
    "Konstruktér",
  ],
};

const CZECH_FIRST_NAMES_MALE = [
  "Jan",
  "Petr",
  "Martin",
  "Tomáš",
  "Josef",
  "Pavel",
  "Jaroslav",
  "Miroslav",
  "Jiří",
  "Zdeněk",
  "František",
  "Michal",
  "Lukáš",
  "David",
  "Ondřej",
  "Radek",
  "Vladimír",
  "Milan",
  "Karel",
  "Stanislav",
];

const CZECH_FIRST_NAMES_FEMALE = [
  "Jana",
  "Marie",
  "Eva",
  "Hana",
  "Anna",
  "Lenka",
  "Kateřina",
  "Lucie",
  "Petra",
  "Markéta",
  "Veronika",
  "Monika",
  "Tereza",
  "Barbora",
  "Michaela",
];

const CZECH_LAST_NAMES = [
  "Novák",
  "Svoboda",
  "Dvořák",
  "Černý",
  "Procházka",
  "Kučera",
  "Veselý",
  "Horák",
  "Němec",
  "Pokorný",
  "Marek",
  "Pospíšil",
  "Hájek",
  "Jelínek",
  "Král",
  "Růžička",
  "Beneš",
  "Fiala",
  "Sedláček",
  "Doležal",
  "Zeman",
  "Kolář",
  "Navrátil",
  "Čermák",
  "Vaněk",
];

const VACATION_REASONS = [
  "Rodinná dovolená u moře",
  "Návštěva příbuzných na Moravě",
  "Lyžování v Alpách",
  "Osobní volno",
  "Svatba kamaráda",
  "Rekonstrukce bytu",
  "Stěhování",
  "Zahraniční dovolená",
  "Wellness víkend",
  "Výlet s dětmi",
  "Dovolená v Chorvatsku",
  "Pobyt na chatě",
];

const CAR_RESOURCES = [
  {
    name: "Škoda Octavia Combi (1AB 2345)",
    metadata: { licensePlate: "1AB 2345", fuel: "diesel", seats: 5, year: 2023 },
  },
  {
    name: "Škoda Fabia (2CD 6789)",
    metadata: { licensePlate: "2CD 6789", fuel: "benzin", seats: 5, year: 2024 },
  },
  {
    name: "VW Transporter (3EF 1234)",
    metadata: { licensePlate: "3EF 1234", fuel: "diesel", seats: 3, year: 2022 },
  },
  {
    name: "Škoda Superb (4GH 5678)",
    metadata: {
      licensePlate: "4GH 5678",
      fuel: "benzin",
      seats: 5,
      year: 2025,
      note: "Manažerské vozidlo",
    },
  },
  {
    name: "Škoda Kodiaq (5IJ 9012)",
    metadata: { licensePlate: "5IJ 9012", fuel: "diesel", seats: 7, year: 2024 },
  },
];

const ROOM_RESOURCES = [
  {
    name: "Zasedací místnost A (velká)",
    location: "Budova 1, 2. patro",
    metadata: { seats: 20, projector: true, whiteboard: true, videoCall: true },
  },
  {
    name: "Zasedací místnost B (malá)",
    location: "Budova 1, 1. patro",
    metadata: { seats: 8, projector: true, whiteboard: true, videoCall: false },
  },
  {
    name: "Školící místnost",
    location: "Budova 2, přízemí",
    metadata: { seats: 30, projector: true, whiteboard: true, videoCall: true },
  },
  {
    name: "Kancelář pro návštěvy",
    location: "Budova 1, přízemí",
    metadata: { seats: 4, projector: false, whiteboard: false, videoCall: false },
  },
];

const TOOL_RESOURCES = [
  {
    name: "Laserový měřič Bosch GLM 50",
    metadata: { brand: "Bosch", serialNumber: "BSH-2024-001" },
  },
  {
    name: "Momentový klíč Tohnichi 200N",
    metadata: { brand: "Tohnichi", serialNumber: "TOH-2023-015" },
  },
  {
    name: "Digitální posuvné měřítko Mitutoyo",
    metadata: { brand: "Mitutoyo", serialNumber: "MIT-2024-042" },
  },
  {
    name: "Termokamera FLIR C5",
    metadata: { brand: "FLIR", serialNumber: "FLR-2023-003" },
  },
  {
    name: "Akumulátorová vrtačka Makita",
    metadata: { brand: "Makita", serialNumber: "MAK-2024-088" },
  },
  {
    name: "Nivelační přístroj Leica NA320",
    metadata: { brand: "Leica", serialNumber: "LCA-2023-007" },
  },
];

const NEWS_POSTS = [
  {
    title: "Nová CNC linka zahájena v provozu",
    content: `S radostí oznamujeme, že nová CNC obráběcí linka v hale B2 byla úspěšně spuštěna do plného provozu. Investice ve výši 15 milionů Kč přinese zvýšení kapacity o 30% a umožní zpracování složitějších dílů.\n\nŠkolení operátorů proběhlo minulý týden a všichni jsou připraveni na ostrý provoz. Děkujeme týmu údržby a IT za bezproblémovou instalaci.\n\nV případě jakýchkoliv dotazů se obraťte na vedoucího výroby.`,
    excerpt: "Nová CNC linka v hale B2 zvýší kapacitu o 30%.",
    isPinned: true,
  },
  {
    title: "Firemní vánoční večírek 2025",
    content: `Srdečně zveme všechny zaměstnance na firemní vánoční večírek, který se bude konat v pátek 19. prosince 2025 od 18:00 v hotelu Černý Orel.\n\nProgram:\n- 18:00 Příchod, welcome drink\n- 19:00 Slavnostní večeře\n- 20:00 Tombola s hodnotnými cenami\n- 21:00 Živá hudba a taneční parket\n\nPartneři jsou vítáni! Prosíme o potvrzení účasti do 10. prosince přes tuto aplikaci nebo u HR oddělení.`,
    excerpt:
      "Vánoční večírek 19. 12. 2025 od 18:00 v hotelu Černý Orel.",
    isPinned: true,
  },
  {
    title: "Aktualizace bezpečnostních pravidel",
    content: `Na základě auditu BOZP byly aktualizovány bezpečnostní předpisy pro práci v halách. Klíčové změny:\n\n1. Povinné nošení ochranných brýlí ve VŠECH výrobních prostorách\n2. Nové značení únikových cest\n3. Aktualizované postupy pro práci ve výškách\n4. Rozšíření požárních hlásičů v hale B3\n\nVšichni zaměstnanci jsou povinni absolvovat e-learning školení do konce měsíce. Odkaz na školení najdete v intranetu.`,
    excerpt:
      "Aktualizované BOZP předpisy - povinné školení do konce měsíce.",
    isPinned: false,
  },
  {
    title: "Zaměstnanec měsíce - Leden 2026",
    content: `S potěšením oznamujeme, že zaměstnancem měsíce za leden 2026 se stává Petr Novák z oddělení Výroby!\n\nPetr se zasloužil o optimalizaci výrobního procesu na lince 3, čímž ušetřil firmě přibližně 200 000 Kč měsíčně. Jeho inovativní přístup a týmová spolupráce jsou příkladem pro nás všechny.\n\nPetr získává 500 bodů do programu odměn. Gratulujeme! 🎉`,
    excerpt: "Petr Novák z Výroby optimalizoval linku 3 a ušetřil 200K/měsíc.",
    isPinned: false,
  },
  {
    title: "Nové parkovací místa k dispozici",
    content: `Informujeme vás, že od příštího pondělí budou k dispozici nová parkovací místa za budovou 3. Celkem přibylo 25 míst.\n\nRezervace parkovacích míst pro služební účely je možná přes tuto aplikaci v sekci Rezervace.\n\nUpozornění: Parkoviště za budovou 1 bude od března uzavřeno z důvodu rekonstrukce na 3 měsíce.`,
    excerpt: "25 nových parkovacích míst za budovou 3 od pondělí.",
    isPinned: false,
  },
  {
    title: "Q4 výsledky - překonali jsme plán!",
    content: `Čtvrtý kvartál 2025 byl nejúspěšnějším obdobím v historii firmy. Klíčové ukazatele:\n\n- Tržby: 142 mil. Kč (plán 128 mil. Kč, +11%)\n- Nové zakázky: 89 (plán 75)\n- Kvalita: 99.2% bez reklamací\n- Bezpečnost: 0 pracovních úrazů\n\nDěkujeme všem za skvělou práci! Na základě těchto výsledků bude v únoru vyplacen mimořádný bonus.`,
    excerpt: "Q4 2025: Tržby 142 mil. Kč (+11% nad plán), 0 úrazů.",
    isPinned: true,
  },
  {
    title: "Nový systém docházky od března",
    content: `Od 1. března přecházíme na nový elektronický systém docházky. Staré čipové karty budou nahrazeny novými, které současně slouží jako přístupové karty do budov.\n\nVýměna karet proběhne:\n- Týden 24.–28.2.: Výroba a Obrobna\n- Týden 3.–7.3.: Ostatní oddělení\n\nVýměna probíhá na vrátnici, budova 1. Nezapomeňte si vzít občanský průkaz!`,
    excerpt: "Nové čipové karty od března - výměna na vrátnici.",
    isPinned: false,
  },
  {
    title: "Fotbalový turnaj firem - hledáme hráče!",
    content: `Firma se přihlásila do regionálního fotbalového turnaje firem, který se koná 15. června 2026.\n\nHledáme hráče do týmu! Trénujeme každé úterý od 17:30 na hřišti TJ Sokol.\n\nZájemci se mohou přihlásit u Martina Dvořáka z logistiky nebo přímo přes tuto aplikaci.\n\nVšichni fanoušci jsou samozřejmě vítáni! Zajistíme dopravu na turnaj.`,
    excerpt: "Fotbalový turnaj 15. 6. 2026 - hledáme hráče do firemního týmu.",
    isPinned: false,
  },
];

const POLL_DATA = [
  {
    question: "Jaký termín preferujete pro firemní teambuilding?",
    description: "Plánujeme jednodenní teambuilding na jaro 2026. Vyberte preferovaný termín.",
    options: [
      { index: 0, text: "Pátek 20. března" },
      { index: 1, text: "Sobota 21. března" },
      { index: 2, text: "Pátek 27. března" },
      { index: 3, text: "Sobota 28. března" },
    ],
    isAnonymous: false,
    activeUntil: futureDate(30),
  },
  {
    question: "Jste spokojeni s novým systémem stravování?",
    description: "Ohodnoťte nový catering ve firemní jídelně.",
    options: [
      { index: 0, text: "Velmi spokojený/á" },
      { index: 1, text: "Spíše spokojený/á" },
      { index: 2, text: "Neutrální" },
      { index: 3, text: "Spíše nespokojený/á" },
      { index: 4, text: "Velmi nespokojený/á" },
    ],
    isAnonymous: true,
    activeUntil: futureDate(14),
  },
  {
    question: "Který benefit byste uvítali?",
    description: "Vyberte jeden nebo více benefitů, které byste chtěli přidat do nabídky.",
    options: [
      { index: 0, text: "Sick days (3 dny navíc)" },
      { index: 1, text: "Home office 2x týdně" },
      { index: 2, text: "Příspěvek na sport" },
      { index: 3, text: "Příspěvek na vzdělávání" },
      { index: 4, text: "Extra týden dovolené" },
    ],
    isAnonymous: true,
    isMultiple: true,
    activeUntil: futureDate(21),
  },
  {
    question: "Jak hodnotíte interní komunikaci ve firmě?",
    description: null,
    options: [
      { index: 0, text: "Výborná" },
      { index: 1, text: "Dobrá" },
      { index: 2, text: "Průměrná" },
      { index: 3, text: "Slabá" },
      { index: 4, text: "Špatná" },
    ],
    isAnonymous: true,
    activeUntil: pastDate(5), // already closed
  },
  {
    question: "Preferujete ranní nebo odpolední směnu?",
    description: "Průzkum pro optimalizaci směnného provozu.",
    options: [
      { index: 0, text: "Ranní (6:00 - 14:00)" },
      { index: 1, text: "Odpolední (14:00 - 22:00)" },
      { index: 2, text: "Je mi to jedno" },
    ],
    isAnonymous: false,
    activeUntil: futureDate(7),
  },
];

const REWARDS_DATA = [
  {
    name: "Poukaz na oběd",
    description: "Poukaz na oběd v partnerské restauraci v hodnotě 200 Kč.",
    pointsCost: 50,
    stock: -1,
  },
  {
    name: "Půlden volna",
    description: "Extra půlden volna navíc (po schválení nadřízeným).",
    pointsCost: 200,
    stock: -1,
  },
  {
    name: "Firemní mikina",
    description: "Kvalitní mikina s logem firmy ve vaší velikosti.",
    pointsCost: 150,
    stock: 50,
  },
  {
    name: "Lístek do kina (2 osoby)",
    description: "Dva lístky do Premiere Cinemas na libovolný film.",
    pointsCost: 100,
    stock: 30,
  },
  {
    name: "Wellness poukaz",
    description: "Poukaz na wellness proceduru v hodnotě 1 000 Kč.",
    pointsCost: 400,
    stock: 10,
  },
  {
    name: "Extra den dovolené",
    description: "Jeden extra den dovolené navíc (po schválení HR).",
    pointsCost: 500,
    stock: -1,
  },
  {
    name: "Multisport karta (1 měsíc)",
    description: "MultiSport karta na 1 měsíc pro vstup do sportovních zařízení.",
    pointsCost: 300,
    stock: 20,
  },
  {
    name: "Powerbank s logem",
    description: "Prémiová powerbank 10000mAh s firemním logem.",
    pointsCost: 75,
    stock: 40,
  },
];

const JOB_POSTINGS_DATA = [
  {
    title: "Operátor CNC strojů",
    description:
      "Hledáme zkušeného operátora CNC obráběcích strojů pro naši novou linku v hale B2. Práce na dvousměnný provoz. Zapracování zajištěno.",
    requirements:
      "- Min. 2 roky praxe na CNC strojích\n- Schopnost číst technické výkresy\n- Znalost programování Fanuc/Siemens výhodou\n- Středoškolské vzdělání technického směru",
    location: "Výrobní hala B2, Ústí nad Labem",
    salaryRange: "35 000 - 45 000 Kč",
    contractType: "HPP",
    referralBonus: 200,
    status: "ACTIVE" as const,
  },
  {
    title: "Svářeč MIG/MAG",
    description:
      "Do našeho výrobního týmu hledáme kvalifikovaného svářeče s oprávněním pro MIG/MAG svařování ocelových konstrukcí.",
    requirements:
      "- Svářečské oprávnění MIG/MAG (ČSN EN ISO 9606-1)\n- Min. 3 roky praxe\n- Schopnost práce dle výkresové dokumentace\n- Fyzická zdatnost",
    location: "Výrobní hala A1, Ústí nad Labem",
    salaryRange: "38 000 - 48 000 Kč",
    contractType: "HPP",
    referralBonus: 250,
    status: "ACTIVE" as const,
  },
  {
    title: "Skladník s VZV průkazem",
    description:
      "Hledáme spolehlivého skladníka s platným průkazem VZV pro práci v našem hlavním skladu.",
    requirements:
      "- Platný průkaz VZV\n- Praxe ve skladu výhodou\n- Základní znalost PC\n- Spolehlivost a pečlivost",
    location: "Sklad, Ústí nad Labem",
    salaryRange: "30 000 - 35 000 Kč",
    contractType: "HPP",
    referralBonus: 150,
    status: "ACTIVE" as const,
  },
  {
    title: "Junior IT technik",
    description:
      "Rozšiřujeme IT tým! Hledáme juniora se zájmem o IT infrastrukturu a podporu uživatelů.",
    requirements:
      "- SŠ/VŠ v oboru IT\n- Základní znalost sítí a Windows Server\n- Komunikativnost\n- Angličtina min. B1\n- Řidičský průkaz sk. B",
    location: "Budova 1, Ústí nad Labem",
    salaryRange: "32 000 - 40 000 Kč",
    contractType: "HPP",
    referralBonus: 200,
    status: "ACTIVE" as const,
  },
  {
    title: "Brigáda - pomocný dělník (léto 2026)",
    description:
      "Sezónní brigáda na léto 2026. Pomocné práce ve výrobě a skladu. Flexibilní pracovní doba.",
    requirements:
      "- Min. 18 let\n- Fyzická zdatnost\n- Spolehlivost\n- Ochota pracovat v ranní a odpolední směně",
    location: "Výrobní areál, Ústí nad Labem",
    salaryRange: "180 Kč/hod",
    contractType: "DPP",
    referralBonus: 50,
    status: "DRAFT" as const,
  },
  {
    title: "Technolog výroby",
    description:
      "Obsazená pozice technologa se zaměřením na optimalizaci výrobních procesů.",
    requirements:
      "- VŠ technického směru\n- 5+ let praxe v technologii obrábění\n- Znalost CAD/CAM\n- Analytické myšlení",
    location: "Budova 1, Ústí nad Labem",
    salaryRange: "45 000 - 55 000 Kč",
    contractType: "HPP",
    referralBonus: 300,
    status: "FILLED" as const,
  },
];

const TAGS_DATA = [
  { name: "Důležité", color: "#EF4444" },
  { name: "HR", color: "#EC4899" },
  { name: "Výroba", color: "#F97316" },
  { name: "Bezpečnost", color: "#EAB308" },
  { name: "Akce", color: "#22C55E" },
  { name: "IT", color: "#8B5CF6" },
  { name: "Sport", color: "#3B82F6" },
  { name: "Finance", color: "#14B8A6" },
];

const POINT_CATEGORIES = [
  "performance",
  "teamwork",
  "innovation",
  "safety",
  "attendance",
  "mentoring",
  "customer_feedback",
];

const POINT_REASONS = [
  { reason: "Vynikající pracovní výkon tento měsíc", amount: 50, category: "performance" },
  { reason: "Pomoc kolegovi s náročným úkolem", amount: 25, category: "teamwork" },
  { reason: "Inovativní návrh na zlepšení procesu", amount: 100, category: "innovation" },
  { reason: "Nulová absence za kvartál", amount: 30, category: "attendance" },
  { reason: "Úspěšné zapracování nového kolegy", amount: 40, category: "mentoring" },
  { reason: "Pozitivní zpětná vazba od zákazníka", amount: 60, category: "customer_feedback" },
  { reason: "Dodržování BOZP pravidel - vzorný příklad", amount: 20, category: "safety" },
  { reason: "Splnění projektu před termínem", amount: 75, category: "performance" },
  { reason: "Organizace týmové akce", amount: 35, category: "teamwork" },
  { reason: "Návrh úspory materiálu", amount: 80, category: "innovation" },
  { reason: "Porušení pravidel BOZP", amount: -30, category: "safety" },
  { reason: "Pozdní příchody v tomto měsíci", amount: -20, category: "attendance" },
];

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  console.log("🌱 Seeding KOVO Apka database...\n");

  // Clean up existing data (in correct order for foreign keys)
  console.log("🧹 Cleaning existing data...");
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.fcmToken.deleteMany();
  await prisma.rewardClaim.deleteMany();
  await prisma.pointTransaction.deleteMany();
  await prisma.reward.deleteMany();
  await prisma.pollVote.deleteMany();
  await prisma.poll.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.postTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.post.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.hrRequest.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.jobPosting.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  // Unlink departments before deleting users
  await prisma.department.updateMany({ data: { managerId: null } });
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  console.log("  ✅ All tables cleaned\n");

  // ------------------------------------------------------------------
  // 1. CREATE DEPARTMENTS
  // ------------------------------------------------------------------
  console.log("🏢 Creating departments...");
  const departments = await Promise.all(
    DEPARTMENTS.map((d) =>
      prisma.department.create({
        data: { name: d.name, code: d.code, color: d.color },
      })
    )
  );
  console.log(`  ✅ ${departments.length} departments created\n`);

  // ------------------------------------------------------------------
  // 2. CREATE USERS
  // ------------------------------------------------------------------
  console.log("👥 Creating users...");
  const hashedPassword = await hashPassword("Heslo123!");

  // Admin users
  const admins = await Promise.all([
    prisma.user.create({
      data: {
        email: "admin@kovo.cz",
        name: "Ing. Libor Macháček",
        password: hashedPassword,
        role: "ADMIN",
        position: "Ředitel IT",
        phone: "+420 777 111 001",
        pointsBalance: 0,
        departmentId: departments.find((d) => d.code === "ITD")!.id,
        hireDate: new Date("2018-03-15"),
      },
    }),
    prisma.user.create({
      data: {
        email: "sysadmin@kovo.cz",
        name: "Bc. Tomáš Šťastný",
        password: hashedPassword,
        role: "ADMIN",
        position: "Systémový administrátor",
        phone: "+420 777 111 002",
        pointsBalance: 120,
        departmentId: departments.find((d) => d.code === "ITD")!.id,
        hireDate: new Date("2020-09-01"),
      },
    }),
  ]);

  // Manager users (one per department)
  const managerNames = [
    { name: "Ing. Pavel Horák", email: "horak@kovo.cz", deptCode: "VYR" },
    { name: "Jiří Kučera", email: "kucera@kovo.cz", deptCode: "OBR" },
    { name: "Martin Dvořák", email: "dvorak@kovo.cz", deptCode: "LOG" },
    { name: "Ing. Zdeněk Pokorný", email: "pokorny@kovo.cz", deptCode: "KVA" },
    { name: "Stanislav Marek", email: "marek@kovo.cz", deptCode: "UDR" },
    { name: "Bc. Radek Fiala", email: "fiala@kovo.cz", deptCode: "ITD" },
    { name: "Mgr. Lenka Veselá", email: "vesela@kovo.cz", deptCode: "HRA" },
    { name: "Ing. Karel Němec", email: "nemec@kovo.cz", deptCode: "OBC" },
  ];

  const managers = await Promise.all(
    managerNames.map((m) =>
      prisma.user.create({
        data: {
          email: m.email,
          name: m.name,
          password: hashedPassword,
          role: "MANAGER",
          position: POSITIONS.MANAGER[managerNames.indexOf(m)],
          phone: `+420 777 222 ${String(managerNames.indexOf(m) + 1).padStart(3, "0")}`,
          pointsBalance: randomInt(50, 300),
          departmentId: departments.find((d) => d.code === m.deptCode)!.id,
          hireDate: randomDate(new Date("2015-01-01"), new Date("2022-06-01")),
        },
      })
    )
  );

  // Assign managers to departments
  await Promise.all(
    managers.map((mgr, idx) =>
      prisma.department.update({
        where: { id: departments.find((d) => d.code === managerNames[idx].deptCode)!.id },
        data: { managerId: mgr.id },
      })
    )
  );

  // Regular employees (40 employees spread across departments)
  const employeeData: Array<{
    name: string;
    email: string;
    deptCode: string;
    position: string;
  }> = [];

  let emailCounter = 1;
  for (const dept of DEPARTMENTS) {
    const count = dept.code === "VYR" || dept.code === "OBR" ? 8 : dept.code === "LOG" ? 5 : 3;
    for (let i = 0; i < count; i++) {
      const isMale = Math.random() > 0.3; // 70% male for manufacturing
      const firstName = isMale
        ? randomItem(CZECH_FIRST_NAMES_MALE)
        : randomItem(CZECH_FIRST_NAMES_FEMALE);
      const lastName = randomItem(CZECH_LAST_NAMES);
      const fullName = `${firstName} ${lastName}`;
      const emailName = `${firstName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}.${lastName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`;

      employeeData.push({
        name: fullName,
        email: `${emailName}${emailCounter}@kovo.cz`,
        deptCode: dept.code,
        position: randomItem(POSITIONS.EMPLOYEE),
      });
      emailCounter++;
    }
  }

  const employees = await Promise.all(
    employeeData.map((emp) =>
      prisma.user.create({
        data: {
          email: emp.email,
          name: emp.name,
          password: hashedPassword,
          role: "EMPLOYEE",
          position: emp.position,
          phone: `+420 ${randomInt(600, 799)} ${randomInt(100, 999)} ${randomInt(100, 999)}`,
          pointsBalance: randomInt(0, 500),
          departmentId: departments.find((d) => d.code === emp.deptCode)!.id,
          hireDate: randomDate(new Date("2016-01-01"), new Date("2025-12-01")),
        },
      })
    )
  );

  const allUsers = [...admins, ...managers, ...employees];
  const nonAdminUsers = [...managers, ...employees];
  console.log(`  ✅ ${allUsers.length} users created (${admins.length} admins, ${managers.length} managers, ${employees.length} employees)\n`);

  // ------------------------------------------------------------------
  // 3. CREATE HR REQUESTS
  // ------------------------------------------------------------------
  console.log("📋 Creating HR requests...");
  const hrRequestTypes: Array<"VACATION" | "SICK_DAY" | "DOCTOR" | "PERSONAL_DAY" | "HOME_OFFICE"> = [
    "VACATION",
    "SICK_DAY",
    "DOCTOR",
    "PERSONAL_DAY",
    "HOME_OFFICE",
  ];

  const hrRequests = [];
  for (const user of nonAdminUsers) {
    const numRequests = randomInt(1, 5);
    for (let i = 0; i < numRequests; i++) {
      const type = randomItem(hrRequestTypes);
      const startDate = randomDate(pastDate(180), futureDate(60));
      const days =
        type === "VACATION"
          ? randomInt(1, 14)
          : type === "SICK_DAY"
            ? randomInt(1, 5)
            : type === "HOME_OFFICE"
              ? 1
              : randomInt(1, 2);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + days - 1);

      const status = randomItem(["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const);
      const approver =
        status !== "PENDING" && status !== "CANCELLED"
          ? randomItem([...admins, ...managers])
          : null;

      hrRequests.push(
        prisma.hrRequest.create({
          data: {
            type,
            status,
            startDate,
            endDate,
            totalDays: days,
            reason:
              type === "VACATION"
                ? randomItem(VACATION_REASONS)
                : type === "SICK_DAY"
                  ? "Nemoc"
                  : type === "DOCTOR"
                    ? "Návštěva lékaře"
                    : type === "HOME_OFFICE"
                      ? "Práce z domova"
                      : "Osobní důvody",
            note: status === "REJECTED" ? "Nedostatek kapacit v daném termínu." : null,
            userId: user.id,
            approverId: approver?.id ?? null,
          },
        })
      );
    }
  }
  const createdHrRequests = await Promise.all(hrRequests);
  console.log(`  ✅ ${createdHrRequests.length} HR requests created\n`);

  // ------------------------------------------------------------------
  // 4. CREATE RESOURCES
  // ------------------------------------------------------------------
  console.log("🚗 Creating resources...");
  const carResources = await Promise.all(
    CAR_RESOURCES.map((car) =>
      prisma.resource.create({
        data: {
          name: car.name,
          type: "CAR",
          description: `Služební vozidlo - ${car.metadata.fuel}, ${car.metadata.seats} míst, rok ${car.metadata.year}`,
          location: "Firemní parkoviště",
          metadata: car.metadata,
          isAvailable: true,
        },
      })
    )
  );

  const roomResources = await Promise.all(
    ROOM_RESOURCES.map((room) =>
      prisma.resource.create({
        data: {
          name: room.name,
          type: "ROOM",
          description: `Zasedací místnost - ${room.metadata.seats} míst`,
          location: room.location,
          metadata: room.metadata,
          isAvailable: true,
        },
      })
    )
  );

  const toolResources = await Promise.all(
    TOOL_RESOURCES.map((tool) =>
      prisma.resource.create({
        data: {
          name: tool.name,
          type: "TOOL",
          description: `Měřicí/pracovní nástroj - ${tool.metadata.brand}`,
          metadata: tool.metadata,
          isAvailable: true,
        },
      })
    )
  );

  const allResources = [...carResources, ...roomResources, ...toolResources];
  console.log(`  ✅ ${allResources.length} resources created (${carResources.length} cars, ${roomResources.length} rooms, ${toolResources.length} tools)\n`);

  // ------------------------------------------------------------------
  // 5. CREATE RESERVATIONS
  // ------------------------------------------------------------------
  console.log("📅 Creating reservations...");
  const reservations = [];

  // Car reservations
  for (let i = 0; i < 25; i++) {
    const car = randomItem(carResources);
    const user = randomItem(nonAdminUsers);
    const startDay = randomDate(pastDate(30), futureDate(30));
    startDay.setHours(randomItem([7, 8, 9, 10, 11, 12, 13]), 0, 0, 0);
    const duration = randomInt(2, 8);

    reservations.push(
      prisma.reservation.create({
        data: {
          startTime: startDay,
          endTime: addHours(startDay, duration),
          status: randomItem(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const),
          purpose: randomItem([
            "Služební cesta k zákazníkovi",
            "Odvoz materiálu",
            "Jednání na pobočce",
            "Školení mimo firmu",
            "Veletrh/výstava",
            "Přeprava dílů do kooperace",
          ]),
          resourceId: car.id,
          userId: user.id,
        },
      })
    );
  }

  // Room reservations
  for (let i = 0; i < 30; i++) {
    const room = randomItem(roomResources);
    const user = randomItem([...admins, ...managers]);
    const startDay = randomDate(pastDate(14), futureDate(14));
    startDay.setHours(randomItem([8, 9, 10, 11, 13, 14, 15]), 0, 0, 0);
    const duration = randomItem([1, 1.5, 2, 3]);

    reservations.push(
      prisma.reservation.create({
        data: {
          startTime: startDay,
          endTime: addHours(startDay, duration),
          status: randomItem(["CONFIRMED", "CONFIRMED", "COMPLETED"] as const),
          purpose: randomItem([
            "Porada vedení",
            "Týmový meeting",
            "Pohovor s kandidátem",
            "Školení BOZP",
            "Videokonference se zákazníkem",
            "Prezentace výsledků Q4",
            "Brainstorming - nový produkt",
            "1:1 s podřízeným",
          ]),
          resourceId: room.id,
          userId: user.id,
        },
      })
    );
  }

  // Tool reservations
  for (let i = 0; i < 15; i++) {
    const tool = randomItem(toolResources);
    const user = randomItem(employees);
    const startDay = randomDate(pastDate(14), futureDate(7));
    startDay.setHours(6, 0, 0, 0);

    reservations.push(
      prisma.reservation.create({
        data: {
          startTime: startDay,
          endTime: addHours(startDay, randomInt(4, 10)),
          status: randomItem(["CONFIRMED", "COMPLETED", "COMPLETED"] as const),
          purpose: randomItem([
            "Kalibrace strojů",
            "Měření dílů na zakázce",
            "Kontrola kvality",
            "Diagnostika závady",
            "Instalační práce",
          ]),
          resourceId: tool.id,
          userId: user.id,
        },
      })
    );
  }

  const createdReservations = await Promise.all(reservations);
  console.log(`  ✅ ${createdReservations.length} reservations created\n`);

  // ------------------------------------------------------------------
  // 6. CREATE TAGS
  // ------------------------------------------------------------------
  console.log("🏷️  Creating tags...");
  const tags = await Promise.all(
    TAGS_DATA.map((t) => prisma.tag.create({ data: t }))
  );
  console.log(`  ✅ ${tags.length} tags created\n`);

  // ------------------------------------------------------------------
  // 7. CREATE NEWS POSTS & COMMENTS
  // ------------------------------------------------------------------
  console.log("📰 Creating news posts and comments...");
  const posts = [];
  for (let i = 0; i < NEWS_POSTS.length; i++) {
    const postData = NEWS_POSTS[i];
    const author = randomItem([...admins, ...managers]);
    const publishedAt = pastDate(randomInt(1, 90));

    const post = await prisma.post.create({
      data: {
        title: postData.title,
        content: postData.content,
        excerpt: postData.excerpt,
        isPinned: postData.isPinned,
        allowComments: true,
        publishedAt,
        authorId: author.id,
      },
    });
    posts.push(post);

    // Assign 1-3 random tags
    const numTags = randomInt(1, 3);
    const shuffledTags = [...tags].sort(() => Math.random() - 0.5).slice(0, numTags);
    await Promise.all(
      shuffledTags.map((tag) =>
        prisma.postTag.create({
          data: { postId: post.id, tagId: tag.id },
        })
      )
    );

    // Add 2-6 comments per post
    const numComments = randomInt(2, 6);
    for (let c = 0; c < numComments; c++) {
      const commenter = randomItem(allUsers);
      await prisma.comment.create({
        data: {
          content: randomItem([
            "Skvělá zpráva, děkuji za info! 👍",
            "Díky za aktualizaci.",
            "Už se těším!",
            "To je super, konečně!",
            "Mám dotaz - kde najdu více informací?",
            "Můžeme to probrat na poradě?",
            "Paráda, dobrá práce všech zúčastněných.",
            "A co zaměstnanci na noční směně?",
            "Souhlasím, je to krok správným směrem.",
            "Děkuji za organizaci!",
            "Bude k tomu i podrobnější návod?",
            "👏👏👏",
          ]),
          authorId: commenter.id,
          postId: post.id,
          createdAt: new Date(publishedAt.getTime() + randomInt(1, 72) * 3600 * 1000),
        },
      });
    }
  }
  console.log(`  ✅ ${posts.length} posts with comments created\n`);

  // ------------------------------------------------------------------
  // 8. CREATE POLLS & VOTES
  // ------------------------------------------------------------------
  console.log("📊 Creating polls and votes...");
  const createdPolls = [];
  for (const pollData of POLL_DATA) {
    const creator = randomItem([...admins, ...managers]);
    const isActive = pollData.activeUntil > new Date();
    const poll = await prisma.poll.create({
      data: {
        question: pollData.question,
        description: pollData.description,
        options: pollData.options,
        isAnonymous: pollData.isAnonymous,
        isMultiple: pollData.isMultiple ?? false,
        activeUntil: pollData.activeUntil,
        isActive,
        creatorId: creator.id,
      },
    });
    createdPolls.push(poll);

    // Generate votes (60-90% of users vote)
    const voterCount = Math.floor(nonAdminUsers.length * (0.6 + Math.random() * 0.3));
    const shuffledVoters = [...nonAdminUsers]
      .sort(() => Math.random() - 0.5)
      .slice(0, voterCount);

    for (const voter of shuffledVoters) {
      const optionIndex = randomInt(0, pollData.options.length - 1);
      await prisma.pollVote.create({
        data: {
          optionIndex,
          userId: voter.id,
          pollId: poll.id,
        },
      });
    }
  }
  console.log(`  ✅ ${createdPolls.length} polls with votes created\n`);

  // ------------------------------------------------------------------
  // 9. CREATE REWARDS
  // ------------------------------------------------------------------
  console.log("🎁 Creating rewards...");
  const rewards = await Promise.all(
    REWARDS_DATA.map((r) => prisma.reward.create({ data: r }))
  );
  console.log(`  ✅ ${rewards.length} rewards created\n`);

  // ------------------------------------------------------------------
  // 10. CREATE POINT TRANSACTIONS
  // ------------------------------------------------------------------
  console.log("⭐ Creating point transactions...");
  const pointTransactions = [];
  for (const user of nonAdminUsers) {
    const numTransactions = randomInt(2, 6);
    for (let i = 0; i < numTransactions; i++) {
      const template = randomItem(POINT_REASONS);
      const admin = randomItem(admins);

      pointTransactions.push(
        prisma.pointTransaction.create({
          data: {
            amount: template.amount,
            reason: template.reason,
            category: template.category,
            userId: user.id,
            adminId: admin.id,
            createdAt: randomDate(pastDate(180), new Date()),
          },
        })
      );
    }
  }

  // Some reward claims that spent points
  for (let i = 0; i < 15; i++) {
    const user = randomItem(nonAdminUsers);
    const reward = randomItem(rewards);
    pointTransactions.push(
      prisma.pointTransaction.create({
        data: {
          amount: -reward.pointsCost,
          reason: `Uplatnění odměny: ${reward.name}`,
          category: "reward_claim",
          userId: user.id,
          createdAt: randomDate(pastDate(90), new Date()),
        },
      })
    );

    // Also create the reward claim
    await prisma.rewardClaim.create({
      data: {
        userId: user.id,
        rewardId: reward.id,
        status: randomItem(["PENDING", "FULFILLED", "FULFILLED"]),
        createdAt: randomDate(pastDate(90), new Date()),
      },
    });
  }

  const createdPoints = await Promise.all(pointTransactions);
  console.log(`  ✅ ${createdPoints.length} point transactions created\n`);

  // ------------------------------------------------------------------
  // 11. CREATE JOB POSTINGS & REFERRALS
  // ------------------------------------------------------------------
  console.log("💼 Creating job postings and referrals...");
  const jobPostings = await Promise.all(
    JOB_POSTINGS_DATA.map((jp) =>
      prisma.jobPosting.create({
        data: {
          title: jp.title,
          description: jp.description,
          requirements: jp.requirements,
          location: jp.location,
          salaryRange: jp.salaryRange,
          contractType: jp.contractType,
          referralBonus: jp.referralBonus,
          status: jp.status,
          publishedAt: jp.status !== "DRAFT" ? pastDate(randomInt(5, 60)) : null,
          closesAt: jp.status === "ACTIVE" ? futureDate(randomInt(14, 90)) : null,
        },
      })
    )
  );

  // Create some referrals
  const activeJobs = jobPostings.filter((_, i) => JOB_POSTINGS_DATA[i].status === "ACTIVE");
  const referrals = [];
  for (const job of activeJobs) {
    const numReferrals = randomInt(1, 3);
    for (let i = 0; i < numReferrals; i++) {
      const referrer = randomItem(employees);
      const firstName = randomItem([...CZECH_FIRST_NAMES_MALE, ...CZECH_FIRST_NAMES_FEMALE]);
      const lastName = randomItem(CZECH_LAST_NAMES);
      referrals.push(
        prisma.referral.create({
          data: {
            candidateName: `${firstName} ${lastName}`,
            candidateEmail: `${firstName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}.${lastName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}@email.cz`,
            candidatePhone: `+420 ${randomInt(600, 799)} ${randomInt(100, 999)} ${randomInt(100, 999)}`,
            note: randomItem([
              "Bývalý kolega, velmi šikovný.",
              "Doporučuje se, má relevantní zkušenosti.",
              "Známý z oboru, hledá novou příležitost.",
              "Absolvent s praxí z brigády.",
              null,
            ]),
            status: randomItem(["SUBMITTED", "SUBMITTED", "INTERVIEWING", "HIRED", "REJECTED"]),
            referrerId: referrer.id,
            jobPostingId: job.id,
          },
        })
      );
    }
  }
  const createdReferrals = await Promise.all(referrals);
  console.log(`  ✅ ${jobPostings.length} job postings, ${createdReferrals.length} referrals created\n`);

  // ------------------------------------------------------------------
  // 12. CREATE FCM TOKENS
  // ------------------------------------------------------------------
  console.log("🔔 Creating FCM tokens...");
  const fcmTokens = [];
  for (const user of allUsers) {
    // Each user has 1-2 devices
    const numDevices = randomInt(1, 2);
    for (let i = 0; i < numDevices; i++) {
      const deviceType = randomItem(["WEB", "ANDROID", "IOS"] as const);
      fcmTokens.push(
        prisma.fcmToken.create({
          data: {
            token: `fcm_${user.id}_${i}_${Math.random().toString(36).substring(2, 15)}`,
            deviceType,
            deviceName:
              deviceType === "WEB"
                ? "Chrome Desktop"
                : deviceType === "ANDROID"
                  ? randomItem(["Samsung Galaxy S24", "Pixel 8", "Xiaomi 14"])
                  : randomItem(["iPhone 15", "iPhone 14", "iPhone SE"]),
            isActive: Math.random() > 0.1, // 90% active
            userId: user.id,
          },
        })
      );
    }
  }
  const createdTokens = await Promise.all(fcmTokens);
  console.log(`  ✅ ${createdTokens.length} FCM tokens created\n`);

  // ------------------------------------------------------------------
  // 13. CREATE NOTIFICATIONS
  // ------------------------------------------------------------------
  console.log("📬 Creating notifications...");
  const notifications = [];
  for (const user of nonAdminUsers) {
    const numNotifs = randomInt(3, 8);
    for (let i = 0; i < numNotifs; i++) {
      const type = randomItem([
        "HR_REQUEST_APPROVED",
        "HR_REQUEST_REJECTED",
        "NEW_POST",
        "NEW_POLL",
        "POINTS_RECEIVED",
        "RESERVATION_CONFIRMED",
        "SYSTEM",
      ] as const);

      let title: string;
      let body: string;
      let link: string | null = null;

      switch (type) {
        case "HR_REQUEST_APPROVED":
          title = "Žádost schválena";
          body = "Vaše žádost o dovolenou byla schválena.";
          link = "/hr/requests";
          break;
        case "HR_REQUEST_REJECTED":
          title = "Žádost zamítnuta";
          body = "Vaše žádost o dovolenou byla zamítnuta. Kontaktujte svého vedoucího.";
          link = "/hr/requests";
          break;
        case "NEW_POST":
          title = "Nový příspěvek";
          body = `Byl publikován nový příspěvek: "${randomItem(NEWS_POSTS).title}"`;
          link = "/news";
          break;
        case "NEW_POLL":
          title = "Nová anketa";
          body = `Nová anketa k hlasování: "${randomItem(POLL_DATA).question}"`;
          link = "/polls";
          break;
        case "POINTS_RECEIVED":
          title = "Body připsány!";
          body = `Obdrželi jste ${randomInt(20, 100)} bodů za ${randomItem(POINT_REASONS).reason.toLowerCase()}.`;
          link = "/points";
          break;
        case "RESERVATION_CONFIRMED":
          title = "Rezervace potvrzena";
          body = "Vaše rezervace vozidla/místnosti byla potvrzena.";
          link = "/reservations";
          break;
        default:
          title = "Systémové oznámení";
          body = "Systémová údržba proběhne o víkendu 22:00 - 06:00.";
          break;
      }

      notifications.push(
        prisma.notification.create({
          data: {
            type,
            title,
            body,
            link,
            isRead: Math.random() > 0.4, // 60% read
            userId: user.id,
            createdAt: randomDate(pastDate(30), new Date()),
          },
        })
      );
    }
  }
  const createdNotifications = await Promise.all(notifications);
  console.log(`  ✅ ${createdNotifications.length} notifications created\n`);

  // ------------------------------------------------------------------
  // 14. CREATE AUDIT LOGS
  // ------------------------------------------------------------------
  console.log("📝 Creating audit logs...");
  const auditLogs = [];
  const auditActions = [
    { action: "HR_REQUEST_APPROVED", entityType: "HrRequest" },
    { action: "HR_REQUEST_REJECTED", entityType: "HrRequest" },
    { action: "POINTS_AWARDED", entityType: "PointTransaction" },
    { action: "POINTS_DEDUCTED", entityType: "PointTransaction" },
    { action: "USER_ROLE_CHANGED", entityType: "User" },
    { action: "RESOURCE_CREATED", entityType: "Resource" },
    { action: "JOB_POSTING_PUBLISHED", entityType: "JobPosting" },
    { action: "REWARD_FULFILLED", entityType: "RewardClaim" },
  ];

  for (let i = 0; i < 50; i++) {
    const template = randomItem(auditActions);
    const admin = randomItem(admins);
    auditLogs.push(
      prisma.auditLog.create({
        data: {
          action: template.action,
          entityType: template.entityType,
          entityId: `cuid_placeholder_${i}`,
          details: { note: "Seeded audit log entry" },
          performedBy: admin.id,
          ipAddress: `192.168.1.${randomInt(10, 250)}`,
          createdAt: randomDate(pastDate(90), new Date()),
        },
      })
    );
  }
  const createdAuditLogs = await Promise.all(auditLogs);
  console.log(`  ✅ ${createdAuditLogs.length} audit log entries created\n`);

  // ------------------------------------------------------------------
  // SUMMARY
  // ------------------------------------------------------------------
  console.log("═══════════════════════════════════════════════════════");
  console.log("✅ SEED COMPLETE! Database populated with:");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  🏢 ${departments.length} departments`);
  console.log(`  👥 ${allUsers.length} users (${admins.length} admins, ${managers.length} managers, ${employees.length} employees)`);
  console.log(`  📋 ${createdHrRequests.length} HR requests`);
  console.log(`  🚗 ${allResources.length} resources (${carResources.length} cars, ${roomResources.length} rooms, ${toolResources.length} tools)`);
  console.log(`  📅 ${createdReservations.length} reservations`);
  console.log(`  📰 ${posts.length} news posts with comments`);
  console.log(`  📊 ${createdPolls.length} polls with votes`);
  console.log(`  🎁 ${rewards.length} rewards`);
  console.log(`  ⭐ ${createdPoints.length} point transactions`);
  console.log(`  💼 ${jobPostings.length} job postings, ${createdReferrals.length} referrals`);
  console.log(`  🔔 ${createdTokens.length} FCM tokens`);
  console.log(`  📬 ${createdNotifications.length} notifications`);
  console.log(`  📝 ${createdAuditLogs.length} audit logs`);
  console.log("═══════════════════════════════════════════════════════");
  console.log("\n🔑 Login credentials:");
  console.log("   Admin:   admin@kovo.cz / Heslo123!");
  console.log("   Manager: horak@kovo.cz / Heslo123!");
  console.log("   All passwords: Heslo123!");
  console.log("═══════════════════════════════════════════════════════\n");
}

// ============================================================================
// EXECUTE
// ============================================================================

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
