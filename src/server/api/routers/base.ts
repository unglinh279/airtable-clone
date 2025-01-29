import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const baseRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return await ctx.db.base.findMany({
      where: { userId },
      include: { tables: true },
    });
  }),

  getBase: protectedProcedure
    .input(
      z.object({
        baseId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const base = await ctx.db.base.findUnique({
        where: { id: input.baseId },
        include: { tables: true },
      });

      if (!base) {
        throw new Error("Base not found");
      }

      return base;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Base name is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const base = await ctx.db.base.create({
        data: {
          name: input.name,
          userId,
        },
      });

      await ctx.db.table.create({
        data: {
          name: "Table 1",
          baseId: base.id,
        },
      });

      return base;
    }),
});
