import { z } from "zod";

export const resourceIdSchema = z.uuid();

export const pageSearchParamSchema = z.coerce
  .number()
  .finite()
  .transform((page) => Math.max(1, Math.trunc(page)))
  .catch(1);
