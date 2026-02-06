import { z } from "zod";

const num = z.coerce.number().transform((v) => Number(v));

export const clearHeatSchema = z
  .object({
    ber_band: z.enum(["A", "B", "C", "D", "E", "F", "G"]),

    floor_area_m2: num.min(20).max(1000),

    emitters: z.enum(["radiators", "ufh"]),
    heating_pattern: z.enum(["rare", "normal", "high"]),
    wood_use: z.enum(["none", "some", "lots"]),
    occupants: num.int().min(1).max(20),

    fuel_type: z.enum(["gas", "kerosene"]),
    fuel_price_eur_per_unit: num.min(0).max(5),
    electricity_price_eur_per_kwh: num.min(0).max(5),
    boiler_efficiency: num.min(0.5).max(1),

    hp_quote_eur: num.min(0).max(100000),
    grant_applied: z.coerce.boolean(),
    grant_value_eur: num.min(0),

    bill_mode: z.enum(["annual_fuel_use", "annual_spend", "none"]),

    annual_fuel_use: num.min(0).optional(),
    annual_spend_eur: num.min(0).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.bill_mode === "annual_fuel_use" && v.annual_fuel_use == null) {
      ctx.addIssue({
        code: "custom",
        path: ["annual_fuel_use"],
        message: "Required when bill_mode is annual_fuel_use",
      });
    }
    if (v.bill_mode === "annual_spend" && v.annual_spend_eur == null) {
      ctx.addIssue({
        code: "custom",
        path: ["annual_spend_eur"],
        message: "Required when bill_mode is annual_spend",
      });
    }
  });

export type ClearHeatInput = z.infer<typeof clearHeatSchema>;
