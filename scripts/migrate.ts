import postgres from "postgres";
import { migrar } from "@/lib/db/migrate";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL ausente");
const sql = postgres(url, { max: 1 });
await migrar(sql);
await sql.end();
console.log("Migracao concluida.");
