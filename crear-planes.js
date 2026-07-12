import MercadoPagoService from './classes/MercadoPagoService.js';

const mpService = new MercadoPagoService();

async function generarPlanes() {
  console.log("=========================================");
  console.log("🛠️  Iniciando creación de planes en Mercado Pago...");
  console.log("=========================================");

  // 1. Crear Plan Plus
  console.log("\n[1/2] Creando Plan Plus ($5 pesos)...");
  const planPlus = await mpService.crearPlan({
    reason: "Nivel Plus - PawPath",
    amount: 5,
    frequency: 1,
    frequencyType: "months",
    backUrl: "https://tusitio.com/retorno"
  });

  if (planPlus.success) {
    console.log("✅ Plan Plus creado exitosamente!");
    console.log("👉 ID del Plan Plus (Copia este ID):", planPlus.data.id);
  } else {
    console.error("❌ Error al crear Plan Plus:", planPlus.error);
  }

  // 2. Crear Plan Multi
  console.log("\n[2/2] Creando Plan Multi ($12 pesos)...");
  const planMulti = await mpService.crearPlan({
    reason: "Nivel Multi - PawPath",
    amount: 12,
    frequency: 1,
    frequencyType: "months",
    backUrl: "https://tusitio.com/retorno"
  });

  if (planMulti.success) {
    console.log("✅ Plan Multi creado exitosamente!");
    console.log("👉 ID del Plan Multi (Copia este ID):", planMulti.data.id);
  } else {
    console.error("❌ Error al crear Plan Multi:", planMulti.error);
  }
  
  console.log("\n=========================================");
  console.log("Proceso terminado. Si viste errores de tokens,");
  console.log("asegúrate de que tu Access Token en config/mercadopago-config.js es correcto.");
  console.log("=========================================");
}

generarPlanes();
