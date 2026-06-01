import { buildDailyQueue } from "@/lib/queue/build";

async function main() {
  await buildDailyQueue();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
