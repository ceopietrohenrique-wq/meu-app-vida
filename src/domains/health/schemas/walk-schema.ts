import { z } from "zod";

import { optionalCoercedNumber } from "@/shared/lib/zod";

export const logWalkSchema = z.object({
  date: z.string().trim().min(1),
  durationMinutes: z.coerce
    .number()
    .int()
    .gt(0, "Informe uma duração maior que 0.")
    .lte(600, "Informe uma duração de até 600 minutos."),
  distanceKm: optionalCoercedNumber(z.coerce.number().gt(0).lt(200)),
});

export type LogWalkInput = z.output<typeof logWalkSchema>;
export type LogWalkFormValues = z.input<typeof logWalkSchema>;
