import { z } from "zod";

const num = z.coerce.number();

const bool = z.preprocess((v) => {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "on" || v === "1" || v === 1) return true;
  if (v === "false" || v === "off" || v === "0" || v === 0 || v == null || v === "") return false;
  return v;
}, z.boolean());

export const clearHeatSchema = z.object({
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
  grant_applied: bool,
  grant_value_eur: num.min(0),

  bill_mode: z.enum(["annual_fuel_use", "annual_spend", "none"]),

  annual_fuel_use: num.min(0).optional(),
  annual_spend_eur: num.min(0).optional(),
});

export type ClearHeatInput = z.infer<typeof clearHeatSchema>;
