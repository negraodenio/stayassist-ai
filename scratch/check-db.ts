import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

async function addZipCodeColumn() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log("Adding zip_code column to properties table...");
  
  // Usar query direta via rpc ou apenas tentar um update para ver se falha
  // No Supabase, o jeito mais fácil de rodar DDL sem CLI é via SQL Editor, 
  // mas aqui vamos tentar usar o client para verificar se a coluna existe.
  
  const { error } = await supabase
    .from("properties")
    .select("zip_code")
    .limit(1);

  if (error && error.code === "PGRST204") {
     console.log("Column zip_code missing. Please run this SQL in Supabase SQL Editor:");
     console.log("ALTER TABLE properties ADD COLUMN IF NOT EXISTS zip_code TEXT;");
  } else if (error) {
     console.error("Error checking column:", error);
  } else {
     console.log("Column zip_code already exists.");
  }
}

addZipCodeColumn();
