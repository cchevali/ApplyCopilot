import cron from "node-cron";
import { runJobsRefresh } from "@/lib/jobs/refresh";
import { buildDailyQueue } from "@/lib/queue/build";

const disabled = process.env.APPLYCOPILOT_DAEMON === "0";

async function runDaily() {
  await runJobsRefresh();
  await buildDailyQueue();
}

if (!disabled) {
  cron.schedule("0 6 * * *", runJobsRefresh);
  cron.schedule("10 6 * * *", buildDailyQueue);
  console.log("ApplyCopilot daemon scheduled for 06:00 and 06:10 local time.");
} else {
  console.log("ApplyCopilot daemon disabled (APPLYCOPILOT_DAEMON=0).");
}

// Keep process alive
setInterval(() => {}, 60 * 60 * 1000);
