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
  const adminGithubUrl = process.env.ADMIN_GITHUB_URL || null;

  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingUser) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        githubUrl: adminGithubUrl,
        passwordHash,
      },
    });
  } else if (adminGithubUrl && existingUser.githubUrl !== adminGithubUrl) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { githubUrl: adminGithubUrl },
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
        roleTitles: [
          "Help Desk",
          "Service Desk",
          "IT Support",
          "Tier 1 Support",
          "Desktop Support",
          "Support Technician",
        ],
        includeKeywords: [
          "ticket",
          "troubleshoot",
          "Windows",
          "Active Directory",
          "O365",
          "Office 365",
          "hardware",
          "VPN",
          "customer service",
        ],
        excludeKeywords: ["clearance required"],
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
