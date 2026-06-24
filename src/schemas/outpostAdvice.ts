import { z } from "zod";
import { outpostEffectSchema } from "@/schemas/outpost";

export const outpostAdvisorRoleSchema = z.enum(["veteran", "liaison"]);

export const outpostAdvisorSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(40),
  role: outpostAdvisorRoleSchema,
  title: z.string().min(1).max(48),
  portrait: z.string().min(1).max(32),
  line: z.string().min(1).max(220),
  recommendation: z.string().min(1).max(120),
});

export const outpostAdviceChoiceSchema = z.object({
  id: z.enum(["veteran", "liaison"]),
  advisorId: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1).max(48),
  effects: z.array(outpostEffectSchema).min(1),
  setsFlag: z.string().regex(/^flag:advice:[a-z0-9-]+:(veteran|liaison)$/),
});

export const outpostAdvicePairSchema = z.object({
  outpost: z.string().min(1),
  veteran: outpostAdvisorSchema,
  liaison: outpostAdvisorSchema,
  choices: z.array(outpostAdviceChoiceSchema).length(2),
});

export const outpostAdviceFileSchema = z.array(outpostAdvicePairSchema).min(1);

export type OutpostAdvisorRole = z.infer<typeof outpostAdvisorRoleSchema>;
export type OutpostAdvisor = z.infer<typeof outpostAdvisorSchema>;
export type OutpostAdviceChoice = z.infer<typeof outpostAdviceChoiceSchema>;
export type OutpostAdvicePair = z.infer<typeof outpostAdvicePairSchema>;
