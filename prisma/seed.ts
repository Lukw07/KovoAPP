// ============================================================================
// KOVO Apka — Database Seed
// Creates: 2 Departments, 1 Admin, 2 Managers, 3 Employees + sample data
// ============================================================================

// Load .env file (only available in local dev, not in Docker)
try { require("dotenv/config"); } catch {}

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// ============================================================================
// MAIN SEED
// ============================================================================

async function main() {
  console.log("🗑️  Cleaning database...");

  // Break circular dependency (department.managerId → user)
  await prisma.department.updateMany({ data: { managerId: null } });

  // Delete all data — order matters (foreign keys)
  await prisma.securityEvent.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.fcmToken.deleteMany();
  await prisma.message.deleteMany();
  await prisma.marketplaceImage.deleteMany();
  await prisma.marketplaceListing.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.jobPosting.deleteMany();
  await prisma.rewardClaim.deleteMany();
  await prisma.reward.deleteMany();
  await prisma.pointTransaction.deleteMany();
  await prisma.pollVote.deleteMany();
  await prisma.poll.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.postTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.post.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.hrRequest.deleteMany();
  await prisma.vacationEntitlement.deleteMany();
  await prisma.employeeDocument.deleteMany();
  await prisma.medicalExamination.deleteMany();
  await prisma.employeeContract.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  console.log("✅ Database cleaned\n");

  // ------------------------------------------------------------------
  // Departments
  // ------------------------------------------------------------------
  console.log("🏭 Creating departments...");

  const vyroba = await prisma.department.create({
    data: { name: "Výroba", code: "VYR", color: "#EF4444" },
  });

  const obrobna = await prisma.department.create({
    data: { name: "Obrobna", code: "OBR", color: "#3B82F6" },
  });

  // ------------------------------------------------------------------
  // Users
  // ------------------------------------------------------------------
  console.log("👥 Creating users...");

  const password = await hashPassword("Heslo123!");

  // ── Admin ──
  const admin = await prisma.user.create({
    data: {
      email: "admin@kovodecin.cz",
      name: "Jan Novák",
      password,
      role: "ADMIN",
      position: "Systémový administrátor",
      phone: "+420 601 111 111",
      pointsBalance: 0,
      departmentId: vyroba.id,
      hireDate: new Date("2020-03-01"),
    },
  });

  // ── Manager Výroba ──
  const managerVyroba = await prisma.user.create({
    data: {
      email: "svoboda@kovodecin.cz",
      name: "Petr Svoboda",
      password,
      role: "MANAGER",
      position: "Vedoucí výroby",
      phone: "+420 602 222 222",
      pointsBalance: 0,
      departmentId: vyroba.id,
      hireDate: new Date("2019-06-15"),
    },
  });

  // ── Manager Obrobna ──
  const managerObrobna = await prisma.user.create({
    data: {
      email: "kral@kovodecin.cz",
      name: "Tomáš Král",
      password,
      role: "MANAGER",
      position: "Vedoucí obrobny",
      phone: "+420 603 333 333",
      pointsBalance: 0,
      departmentId: obrobna.id,
      hireDate: new Date("2021-01-10"),
    },
  });

  // ── Employees ──
  const emp1 = await prisma.user.create({
    data: {
      email: "dvorak@kovodecin.cz",
      name: "Karel Dvořák",
      password,
      role: "EMPLOYEE",
      position: "Operátor CNC",
      phone: "+420 604 444 444",
      pointsBalance: 50,
      departmentId: vyroba.id,
      hireDate: new Date("2022-09-01"),
    },
  });

  const emp2 = await prisma.user.create({
    data: {
      email: "horakova@kovodecin.cz",
      name: "Marie Horáková",
      password,
      role: "EMPLOYEE",
      position: "Kontrolor kvality",
      phone: "+420 605 555 555",
      pointsBalance: 120,
      departmentId: vyroba.id,
      hireDate: new Date("2023-02-15"),
    },
  });

  const emp3 = await prisma.user.create({
    data: {
      email: "nemec@kovodecin.cz",
      name: "Lukáš Němec",
      password,
      role: "EMPLOYEE",
      position: "Soustružník",
      phone: "+420 606 666 666",
      pointsBalance: 30,
      departmentId: obrobna.id,
      hireDate: new Date("2024-05-01"),
    },
  });

  // ── Set department managers ──
  await prisma.department.update({
    where: { id: vyroba.id },
    data: { managerId: managerVyroba.id },
  });
  await prisma.department.update({
    where: { id: obrobna.id },
    data: { managerId: managerObrobna.id },
  });

  // ------------------------------------------------------------------
  // Vacation Entitlements (current year)
  // ------------------------------------------------------------------
  console.log("🏖️  Creating vacation entitlements...");

  const currentYear = new Date().getFullYear();
  const allUsers = [admin, managerVyroba, managerObrobna, emp1, emp2, emp3];

  for (const user of allUsers) {
    await prisma.vacationEntitlement.create({
      data: {
        userId: user.id,
        year: currentYear,
        totalDays: 20,
        usedDays: 0,
        carriedOver: 0,
      },
    });
  }

  // ------------------------------------------------------------------
  // Resources (for reservations)
  // ------------------------------------------------------------------
  console.log("🚗 Creating resources...");

  await prisma.resource.createMany({
    data: [
      {
        name: "Škoda Octavia (1AD 1234)",
        type: "CAR",
        description: "Služební vůz — Škoda Octavia Combi 2.0 TDI",
        location: "Parkoviště u vrátnice",
        isAvailable: true,
      },
      {
        name: "Zasedací místnost A",
        type: "ROOM",
        description: "Kapacita 12 osob, projektor, whiteboard",
        location: "Budova A, 2. patro",
        isAvailable: true,
      },
      {
        name: "Parkovací místo P-05",
        type: "PARKING_SPOT",
        description: "Kryté parkovací stání u hlavního vchodu",
        location: "Garáž A",
        isAvailable: true,
      },
    ],
  });

  // ------------------------------------------------------------------
  // Tags
  // ------------------------------------------------------------------
  console.log("🏷️  Creating tags...");

  const tagDulezite = await prisma.tag.create({
    data: { name: "Důležité", color: "#EF4444" },
  });
  const tagBezpecnost = await prisma.tag.create({
    data: { name: "Bezpečnost", color: "#F59E0B" },
  });
  await prisma.tag.create({
    data: { name: "Akce", color: "#10B981" },
  });

  // ------------------------------------------------------------------
  // News Posts
  // ------------------------------------------------------------------
  console.log("📰 Creating news posts...");

  const post1 = await prisma.post.create({
    data: {
      title: "Nová směna od března",
      content:
        "Od 1. března zavádíme třísměnný provoz na lince B. Rozpis směn bude k dispozici u vedoucího výroby. Prosíme o kontrolu vašeho rozpisu do konce týdne.",
      excerpt: "Zavádíme třísměnný provoz na lince B od 1. března.",
      isPinned: true,
      authorId: admin.id,
    },
  });

  await prisma.postTag.create({
    data: { postId: post1.id, tagId: tagDulezite.id },
  });

  const post2 = await prisma.post.create({
    data: {
      title: "Školení BOZP — povinné pro všechny",
      content:
        "Připomínáme, že v termínu 15.–17. března proběhne povinné školení BOZP. Účast je nutná. Kdo se nemůže v daném termínu zúčastnit, kontaktujte HR oddělení.",
      excerpt: "Povinné školení BOZP 15.–17. března.",
      isPinned: false,
      authorId: managerVyroba.id,
    },
  });

  await prisma.postTag.create({
    data: { postId: post2.id, tagId: tagBezpecnost.id },
  });

  // ------------------------------------------------------------------
  // Polls
  // ------------------------------------------------------------------
  console.log("📊 Creating polls...");

  await prisma.poll.create({
    data: {
      question: "Preferujete ranní nebo odpolední směnu?",
      description: "Anketa pro plánování směn na Q2 2026.",
      options: [
        { index: 0, text: "Ranní (6:00–14:00)" },
        { index: 1, text: "Odpolední (14:00–22:00)" },
        { index: 2, text: "Je mi to jedno" },
      ],
      isAnonymous: true,
      isMultiple: false,
      isActive: true,
      activeUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      creatorId: managerVyroba.id,
    },
  });

  // ------------------------------------------------------------------
  // Rewards
  // ------------------------------------------------------------------
  console.log("🎁 Creating rewards...");

  await prisma.reward.createMany({
    data: [
      {
        name: "Den volna navíc",
        description: "Jeden den placeného volna nad rámec zákonné dovolené.",
        pointsCost: 500,
        stock: -1,
        isActive: true,
      },
      {
        name: "Poukázka Sodexo 500 Kč",
        description: "Stravenková poukázka v hodnotě 500 Kč.",
        pointsCost: 200,
        stock: 50,
        isActive: true,
      },
      {
        name: "Firemní tričko",
        description: "Tričko s logem firmy, výběr velikosti S–XXL.",
        pointsCost: 100,
        stock: 30,
        isActive: true,
      },
    ],
  });

  // ------------------------------------------------------------------
  // Points (give employees some history)
  // ------------------------------------------------------------------
  console.log("⭐ Creating point transactions...");

  await prisma.pointTransaction.createMany({
    data: [
      {
        userId: emp1.id,
        adminId: managerVyroba.id,
        amount: 50,
        reason: "Výborná práce na zakázce Z-2026-001",
        category: "performance",
      },
      {
        userId: emp2.id,
        adminId: managerVyroba.id,
        amount: 120,
        reason: "Nulová zmetkovitost za leden",
        category: "quality",
      },
      {
        userId: emp3.id,
        adminId: managerObrobna.id,
        amount: 30,
        reason: "Pomoc při přesunu materiálu",
        category: "teamwork",
      },
    ],
  });

  // ------------------------------------------------------------------
  // Job Posting
  // ------------------------------------------------------------------
  console.log("💼 Creating job postings...");

  await prisma.jobPosting.create({
    data: {
      title: "Operátor CNC stroje",
      description:
        "Hledáme zkušeného operátora CNC frézky pro třísměnný provoz. Požadujeme min. 2 roky praxe na CNC strojích Okuma nebo Mazak.",
      requirements:
        "Vyučení v oboru, praxe min. 2 roky, znalost G-kódu výhodou.",
      location: "Děčín — hlavní závod",
      salaryRange: "35 000 – 45 000 Kč",
      contractType: "HPP",
      referralBonus: 200,
      status: "ACTIVE",
      publishedAt: new Date(),
    },
  });

  // ------------------------------------------------------------------
  // Employee Contracts
  // ------------------------------------------------------------------
  console.log("📄 Creating employee contracts...");

  await prisma.employeeContract.createMany({
    data: [
      {
        userId: emp1.id,
        type: "HPP",
        status: "ACTIVE",
        startDate: new Date("2022-09-01"),
        position: "Operátor CNC",
        hoursPerWeek: 40,
      },
      {
        userId: emp2.id,
        type: "HPP",
        status: "ACTIVE",
        startDate: new Date("2023-02-15"),
        position: "Kontrolor kvality",
        hoursPerWeek: 40,
      },
      {
        userId: emp3.id,
        type: "HPP",
        status: "ACTIVE",
        startDate: new Date("2024-05-01"),
        position: "Soustružník",
        hoursPerWeek: 40,
      },
    ],
  });

  // ------------------------------------------------------------------
  // Done!
  // ------------------------------------------------------------------
  console.log("");
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║     KOVO Apka — Seed úspěšně dokončen       ║");
  console.log("╠══════════════════════════════════════════════╣");
  console.log("║                                              ║");
  console.log("║  Heslo pro všechny účty:  Heslo123!          ║");
  console.log("║                                              ║");
  console.log("║  Admin:                                      ║");
  console.log(`║    ${admin.email.padEnd(40)}║`);
  console.log("║                                              ║");
  console.log("║  Manažeři:                                   ║");
  console.log(`║    ${managerVyroba.email.padEnd(40)}║`);
  console.log(`║    ${managerObrobna.email.padEnd(40)}║`);
  console.log("║                                              ║");
  console.log("║  Zaměstnanci:                                ║");
  console.log(`║    ${emp1.email.padEnd(40)}║`);
  console.log(`║    ${emp2.email.padEnd(40)}║`);
  console.log(`║    ${emp3.email.padEnd(40)}║`);
  console.log("║                                              ║");
  console.log("╚══════════════════════════════════════════════╝");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
