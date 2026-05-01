const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

async function addZipCodeColumn() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log("Checking zip_code column...");
  
  const { error } = await supabase
    .from("properties")
    .select("zip_code")
    .limit(1);

  if (error && (error.code === "PGRST204" || error.message.includes("column \"zip_code\" does not exist"))) {
     console.log("\n[ALERTA]: A coluna 'zip_code' não existe na tabela 'properties'.");
     console.log("Executa este comando no SQL Editor do Supabase para corrigir:");
     console.log("ALTER TABLE properties ADD COLUMN IF NOT EXISTS zip_code TEXT;");
  } else if (error) {
     console.error("Erro ao verificar coluna:", error);
  } else {
     console.log("Coluna 'zip_code' já existe!");
  }
}

addZipCodeColumn();
