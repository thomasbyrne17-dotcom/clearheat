import { z } from "zod";

// Convert form inputs (string/number/empty) into a proper number for z.number()
const asNumber = (v: unknown) => {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const s = v.trim();
    if (s === "") return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : v;
  }
  return v;
};

// Common numeric schema builder
const num = (min: number, max: number) =>
  z.preprocess(asNumber, z.number().min(min).max(max));

// Optional number
const numOpt = (min: number, max: number) =>
  z.preprocess(asNumber, z.number().min(min).max(max)).optional();

// Checkbox/boolean coercion
const bool = z.preprocess((v) => {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "on" || v === "1" || v === 1) return true;
  if (v === "false" || v === "off" || v === "0" || v === 0 || v == null || v === "") return false;
  return v;
}, z.boolean());

export const clearHeatSchema = z
  .object({
    ber_band: z.enum(["A", "B", "C", "D", "E", "F", "G"]),

    floor_area_m2: num(20, 1000),

    emitters: z.enum(["radiators", "ufh"]),
    heating_pattern: z.enum(["rare", "normal", "high"]),
    wood_use: z.enum(["none", "some", "lots"]),
    occupants: z.preprocess(asNumber, z.number().int().min(1).max(20)),

    fuel_type: z.enum(["gas", "kerosene"]),
    fuel_price_eur_per_unit: num(0, 10),
    electricity_price_eur_per_kwh: num(0, 10),
    boiler_efficiency: z.preprocess(asNumber, z.number().min(0.3).max(1)),

    hp_quote_eur: num(0, 200000),
    grant_applied: bool,
    grant_value_eur: num(0, 50000),

    bill_mode: z.enum(["annual_fuel_use", "annual_spend", "none"]),

    annual_fuel_use: numOpt(0, 500000),
    annual_spend_eur: numOpt(0, 200000),
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
