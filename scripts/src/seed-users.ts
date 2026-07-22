/**
 * Seed admin and demo user accounts.
 * Run: pnpm --filter @workspace/scripts run seed-users
 */
import pg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pg;

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const SALT_ROUNDS = 10;

  const accounts = [
    {
      fullName: "Admin SiapCPNS",
      email: "arsiimam28@gmail.com",
      password: "SiapCPNS@Admin2024",
      role: "admin",
    },
    {
      fullName: "Demo Peserta",
      email: "peserta@siapcpns.id",
      password: "SiapCPNS@User2024",
      role: "participant",
    },
  ];

  for (const acc of accounts) {
    const passwordHash = await bcrypt.hash(acc.password, SALT_ROUNDS);

    await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, auth_provider)
       VALUES ($1, $2, $3, $4, 'email')
       ON CONFLICT (email) DO UPDATE
         SET full_name    = EXCLUDED.full_name,
             role         = EXCLUDED.role,
             password_hash = EXCLUDED.password_hash,
             auth_provider = EXCLUDED.auth_provider,
             updated_at   = NOW()`,
      [acc.fullName, acc.email, passwordHash, acc.role]
    );

    console.log(`✓ [${acc.role.padEnd(11)}] ${acc.email}  |  password: ${acc.password}`);
  }

  await pool.end();
  console.log("\nSeeding complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
