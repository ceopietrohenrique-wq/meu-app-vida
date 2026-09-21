/**
 * IMC = peso_kg / (altura_m * altura_m). Nunca é tratado como diagnóstico
 * médico — só um indicador geral (ver aviso na UI). Ver
 * docs/business-rules.md > 8.
 */

export type BmiCategory =
  "abaixo_do_peso" | "peso_normal" | "sobrepeso" | "obesidade";

export const BMI_CATEGORY_LABELS: Record<BmiCategory, string> = {
  abaixo_do_peso: "Abaixo do peso",
  peso_normal: "Peso normal",
  sobrepeso: "Sobrepeso",
  obesidade: "Obesidade",
};

const MIN_WEIGHT_KG = 0;
const MAX_WEIGHT_KG = 500;
const MIN_HEIGHT_CM = 0;
const MAX_HEIGHT_CM = 300;

export function classifyBmi(bmi: number): BmiCategory {
  if (bmi < 18.5) return "abaixo_do_peso";
  if (bmi < 25) return "peso_normal";
  if (bmi < 30) return "sobrepeso";
  return "obesidade";
}

/**
 * Calcula o IMC. Lança erro para peso/altura impossíveis em vez de
 * retornar NaN/Infinity — a validação acontece sempre antes da divisão, então
 * uma altura de 0 (ou negativa) nunca chega a ser usada como denominador.
 */
export function calculateBmi(
  weightKg: number,
  heightCm: number,
): { bmi: number; category: BmiCategory } {
  if (
    !Number.isFinite(weightKg) ||
    weightKg <= MIN_WEIGHT_KG ||
    weightKg >= MAX_WEIGHT_KG
  ) {
    throw new Error("Peso inválido. Informe um valor entre 0 e 500 kg.");
  }
  if (
    !Number.isFinite(heightCm) ||
    heightCm <= MIN_HEIGHT_CM ||
    heightCm >= MAX_HEIGHT_CM
  ) {
    throw new Error("Altura inválida. Informe um valor entre 0 e 300 cm.");
  }

  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);

  return { bmi: Math.round(bmi * 10) / 10, category: classifyBmi(bmi) };
}
