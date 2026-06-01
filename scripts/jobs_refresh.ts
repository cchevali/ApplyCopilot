import { runJobsRefresh } from "@/lib/jobs/refresh";

async function main() {
  await runJobsRefresh();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
