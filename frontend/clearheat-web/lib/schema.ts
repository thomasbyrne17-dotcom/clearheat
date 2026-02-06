import { z } from "zod";

/**
 * NOTE:
 * - We use z.coerce.number() so form inputs (strings) become numbers.
 * - This also guarantees the inferred TS type is `number` (not `unknown`),
 *   which fixes the Vercel build error with zodResolver + useForm<ClearHeatInput>.
 */

export const clearHeatSchema = z
  .object({
    ber_band: z.enum(["A", "B", "C", "D", "E", "F", "G"]),

    floor_area_m2: z.coerce.number().min(20).max(1000),

    emitters: z.enum(["radiators", "ufh"]),
    heating_pattern: z.enum(["rare", "normal", "high"]),
    wood_use: z.enum(["none", "some", "lots"]),
    occupants: z.coerce.number().int().min(1).max(20),

    fuel_type: z.enum(["gas", "kerosene"]),
    fuel_price_eur_per_unit: z.coerce.number().min(0).max(5),
    electricity_price_eur_per_kwh: z.coerce.number().min(0).max(5),
    boiler_efficiency: z.coerce.number().min(0.5).max(1.0),

    hp_quote_eur: z.coerce.number().min(0).max(100000),
    grant_applied: z.coerce.boolean().default(true),
    grant_value_eur: z.coerce.number().min(0).default(6500),

    bill_mode: z
      .enum(["annual_fuel_use", "annual_spend", "none"])
      .default("annual_spend"),

    // Keep these numeric (not unknown) while still optional
    annual_fuel_use: z.coerce.number().min(0).optional(),
    annual_spend_eur: z.coerce.number().min(0).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.bill_mode === "annual_fuel_use" && v.annual_fuel_use == null) {
      ctx.addIssue({
        code: "custom",
        path: ["annual_fuel_use"],
        message: "Required when bill mode is annual fuel use.",
      });
    }

    if (v.bill_mode === "annual_spend" && v.annual_spend_eur == null) {
      ctx.addIssue({
        code: "custom",
        path: ["annual_spend_eur"],
        message: "Required when bill mode is annual spend.",
      });
    }
  });

export type ClearHeatInput = z.infer<typeof clearHeatSchema>;
