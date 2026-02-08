// ============================================================================
// KOVO Apka - Clean Database Seed
// Creates only: 1 Admin, 1 Manager, 1 Employee - no extra data
// ============================================================================

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient({}); // Pass empty config object to satisfy runtime constraint

const SALT_ROUNDS = 10;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// ============================================================================
// MAIN SEED
// ============================================================================

async function main() {
  console.log("Cleaning database...");

  // Delete all data in correct order (respecting foreign keys)
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
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  console.log("Database cleaned");

  // ------------------------------------------------------------------
  // Create one department
  // ------------------------------------------------------------------
  console.log("Creating department...");

  const dept = await prisma.department.create({
    data: {
      name: "Vyroba",
      code: "VYR",
      color: "#EF4444",
    },
  });

  // ------------------------------------------------------------------
  // Create users: 1 Admin, 1 Manager, 1 Employee
  // ------------------------------------------------------------------
  console.log("Creating users...");

  const password = await hashPassword("heslo123");

  const admin = await prisma.user.create({
    data: {
      email: "admin@kovodecin.cz",
      name: "Jan Novak",
      password,
      role: "ADMIN",
      position: "Systemovy administrator",
      pointsBalance: 0,
      departmentId: dept.id,
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: "manager@kovodecin.cz",
      name: "Petr Svoboda",
      password,
      role: "MANAGER",
      position: "Vedouci vyroby",
      pointsBalance: 0,
      departmentId: dept.id,
    },
  });

  const employee = await prisma.user.create({
    data: {
      email: "zamestnanec@kovodecin.cz",
      name: "Karel Dvorak",
      password,
      role: "EMPLOYEE",
      position: "Operator CNC",
      pointsBalance: 0,
      departmentId: dept.id,
    },
  });

  // Set manager as department manager
  await prisma.department.update({
    where: { id: dept.id },
    data: { managerId: manager.id },
  });

  console.log("");
  console.log("============================================");
  console.log("  KOVO Apka - Cisty seed dokoncen");
  console.log("============================================");
  console.log("");
  console.log("  Prihlasovaci udaje (heslo pro vsechny: heslo123):");
  console.log("");
  console.log("  Admin:       " + admin.email);
  console.log("  Manager:     " + manager.email);
  console.log("  Zamestnanec: " + employee.email);
  console.log("");
  console.log("============================================");
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
