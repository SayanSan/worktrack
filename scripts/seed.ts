/**
 * Seeds a fresh Supabase project with a sample org + a couple of projects/tasks,
 * so you can log in as each role and see how visibility differs.
 *
 * Usage: npm run seed
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import path from "node:path";

config({ path: path.resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const SEED_PASSWORD = "worktrack-demo-1234";
const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

type Role = "malik" | "boss" | "manager" | "associate" | "intern";

async function createPerson(name: string, role: Role, managerId: string | null) {
  const email = `${name.toLowerCase().replace(/\s+/g, ".")}@worktrack.demo`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: SEED_PASSWORD,
    email_confirm: true,
    user_metadata: { name, role, manager_id: managerId ?? "" },
  });
  if (error) throw new Error(`Failed to create ${name}: ${error.message}`);
  console.log(`  ${role.padEnd(9)} ${name.padEnd(16)} ${email}`);
  return data.user!.id;
}

async function main() {
  console.log("Creating org...");
  await createPerson("Aarav Malik", "malik", null);
  const bossId = await createPerson("Rhea Boss", "boss", null);

  const mgr1Id = await createPerson("Kabir Manager", "manager", bossId);
  const mgr2Id = await createPerson("Priya Manager", "manager", bossId);

  const assoc1Id = await createPerson("Dev Associate", "associate", mgr1Id);
  const assoc2Id = await createPerson("Anika Associate", "associate", mgr2Id);

  const intern1Id = await createPerson("Sam Intern", "intern", assoc1Id);
  const intern2Id = await createPerson("Zara Intern", "intern", assoc2Id);

  console.log("Creating projects...");
  const { data: project1 } = await admin
    .from("projects")
    .insert({ name: "Website Revamp", description: "Redesign the marketing site", owner_id: mgr1Id })
    .select("id")
    .single();
  const { data: project2 } = await admin
    .from("projects")
    .insert({ name: "Mobile App Launch", description: "Ship v1 of the app", owner_id: mgr2Id })
    .select("id")
    .single();

  const project1Id = project1!.id;
  const project2Id = project2!.id;

  await admin.from("project_members").insert([
    { project_id: project1Id, user_id: mgr1Id },
    { project_id: project1Id, user_id: assoc1Id },
    { project_id: project1Id, user_id: intern1Id },
    { project_id: project2Id, user_id: mgr2Id },
    { project_id: project2Id, user_id: assoc2Id },
    { project_id: project2Id, user_id: intern2Id },
  ]);

  console.log("Creating tasks...");
  await admin.from("tasks").insert([
    {
      project_id: project1Id,
      title: "Wireframe new homepage",
      status: "in_progress",
      priority: "high",
      assignee_id: assoc1Id,
      created_by: mgr1Id,
      due_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    },
    {
      project_id: project1Id,
      title: "Collect stock photography",
      status: "todo",
      priority: "low",
      assignee_id: intern1Id,
      created_by: assoc1Id,
      due_date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    },
    {
      project_id: project1Id,
      title: "Set up staging environment",
      status: "done",
      priority: "medium",
      assignee_id: mgr1Id,
      created_by: mgr1Id,
    },
    {
      project_id: project2Id,
      title: "Draft App Store listing",
      status: "in_review",
      priority: "medium",
      assignee_id: assoc2Id,
      created_by: mgr2Id,
      due_date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    },
    {
      project_id: project2Id,
      title: "QA onboarding flow",
      status: "todo",
      priority: "high",
      assignee_id: intern2Id,
      created_by: assoc2Id,
      due_date: new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10),
    },
  ]);

  console.log("\nDone. All accounts use the password:", SEED_PASSWORD);
  console.log("Log in as any of the emails printed above to see role-based visibility in action.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
