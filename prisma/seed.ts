import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const defaultLocations = [
  "Reston",
  "Tysons",
  "Arlington",
  "Alexandria",
  "Fairfax",
  "McLean",
  "Herndon",
  "Vienna",
  "Ashburn",
  "Sterling",
  "Falls Church",
];

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "changeme";
  const adminName = process.env.ADMIN_NAME || "Admin";

  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingUser) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        passwordHash,
      },
    });
  }

  const existingTarget = await prisma.targetProfile.findFirst({
    where: { name: "Northern Virginia" },
  });

  if (!existingTarget) {
    await prisma.targetProfile.create({
      data: {
        name: "Northern Virginia",
        locations: defaultLocations,
        remoteAllowed: true,
        roleTitles: [],
        includeKeywords: [],
        excludeKeywords: [],
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
