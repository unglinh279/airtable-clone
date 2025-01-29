import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const tableRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Table name is required"),
        baseId: z.string().min(1, "Base ID is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.table.create({
        data: {
          name: input.name,
          baseId: input.baseId,
        },
      });
    }),

  getTableData: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      const table = await ctx.db.table.findUnique({
        where: { id: input.tableId },
        include: {
          columns: true,
          rows: true,
        },
      });

      if (!table) {
        throw new Error("Table not found");
      }

      return table;
    }),

  saveTableData: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        columns: z.array(z.object({ id: z.string(), title: z.string(), type: z.string() })),
        rows: z.array(z.object({ id: z.string(), cells: z.record(z.string(), z.string()) })),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { tableId, columns, rows } = input;
      const CHUNK_SIZE = 500;

      await ctx.db.$transaction(async (prisma) => {
        await prisma.column.deleteMany({ where: { tableId } });
        await prisma.row.deleteMany({ where: { tableId } });

        if (columns.length > 0) {
          const existingColumnIds = new Set(
            (await prisma.column.findMany({ where: { tableId }, select: { id: true } })).map(
              (col) => col.id
            )
          );

          const newColumns = columns.filter((col) => !existingColumnIds.has(col.id));
          if (newColumns.length > 0) {
            await prisma.column.createMany({
              data: newColumns.map((col) => ({
                id: col.id,
                name: col.title,
                type: col.type,
                tableId,
              })),
              skipDuplicates: true,
            });
          }
        }

        if (rows.length > 0) {
          for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
            const batch = rows.slice(i, i + CHUNK_SIZE);
            await prisma.row.createMany({
              data: batch.map((row) => ({
                id: row.id,
                data: row.cells,
                tableId,
              })),
              skipDuplicates: true,
            });
          }
        }
      });

      return { success: true };
    }),

  saveView: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        name: z.string(),
        sorting: z.array(z.any()),
        filtering: z.array(z.any()),
        hiddenColumns: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.view.create({
        data: {
          name: input.name,
          tableId: input.tableId,
          sorting: input.sorting,
          filtering: input.filtering,
          hiddenColumns: input.hiddenColumns,
        },
      });
    }),

  loadViews: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.view.findMany({
        where: { tableId: input.tableId },
      });
    }),

  deleteView: protectedProcedure
    .input(z.object({ viewId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.view.delete({
        where: { id: input.viewId },
      });
      return { success: true };
    }),
});
