import { z } from "zod";

import { optionalCoercedNumber } from "@/shared/lib/zod";

export const createMeasurementSchema = z
  .object({
    date: z.string().trim().min(1, "Selecione a data."),
    waistCm: optionalCoercedNumber(z.coerce.number().gt(0).lt(300)),
    hipCm: optionalCoercedNumber(z.coerce.number().gt(0).lt(300)),
    chestCm: optionalCoercedNumber(z.coerce.number().gt(0).lt(300)),
    armCm: optionalCoercedNumber(z.coerce.number().gt(0).lt(100)),
    thighCm: optionalCoercedNumber(z.coerce.number().gt(0).lt(150)),
    notes: z.string().trim().max(500).optional(),
  })
  .refine(
    (data) =>
      data.waistCm != null ||
      data.hipCm != null ||
      data.chestCm != null ||
      data.armCm != null ||
      data.thighCm != null,
    { message: "Preencha ao menos uma medida.", path: ["waistCm"] },
  );

export type CreateMeasurementInput = z.output<typeof createMeasurementSchema>;
export type CreateMeasurementFormValues = z.input<
  typeof createMeasurementSchema
>;
