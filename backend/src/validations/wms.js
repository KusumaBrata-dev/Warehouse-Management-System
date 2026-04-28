import { z } from "zod";

export const transactionSchema = z
  .object({
    productId: z.preprocess((val) => parseInt(val, 10), z.number().positive()),
    type: z.enum(["IN", "OUT", "ADJUST", "MOVE"]),
    quantity: z.preprocess(
      (val) => parseInt(val, 10),
      z.number().int().nonnegative("Quantity must be zero or positive"),
    ),
    referenceNo: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
    boxId: z.preprocess(
      (val) => (val ? parseInt(val, 10) : undefined),
      z.number().positive().optional(),
    ),
    targetBoxId: z.preprocess(
      (val) => (val ? parseInt(val, 10) : undefined),
      z.number().positive().optional(),
    ),
    lotNumber: z.string().optional().default(""),
  })
  .superRefine((data, ctx) => {
    if (data.type !== "ADJUST" && data.quantity <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quantity"],
        message: "Quantity must be positive for IN/OUT/MOVE",
      });
    }

    if ((data.type === "IN" || data.type === "OUT") && data.boxId === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["boxId"],
        message: "boxId is required for IN/OUT",
      });
    }

    if (data.type === "MOVE") {
      if (data.boxId === undefined || data.targetBoxId === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["type"],
          message: "Source box (boxId) and destination box (targetBoxId) are required for MOVE",
        });
      }
      if (data.boxId !== undefined && data.targetBoxId !== undefined && data.boxId === data.targetBoxId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["targetBoxId"],
          message: "targetBoxId must be different from boxId for MOVE",
        });
      }
    }
  });

export const moveBulkSchema = z.object({
  sourceType: z.enum(["RACK", "COLUMN", "LEVEL"]),
  sourceCode: z.string().min(1),
  targetLevelCode: z.string().min(1),
});

export const receivePOSchema = z.object({
  palletCode: z.string().optional(),
  note: z.string().optional(),
  products: z
    .array(
      z.object({
        productId: z.preprocess(
          (val) => parseInt(val, 10),
          z.number().positive(),
        ),
        quantity: z.preprocess(
          (val) => parseInt(val, 10),
          z.number().positive(),
        ),
        boxId: z.preprocess((val) => (val ? parseInt(val, 10) : undefined), z.number().positive().optional()),
        lotNumber: z.string().optional().default(""),
      }),
    )
    .min(1, "Minimal satu produk untuk direceive"),
});

export const validate = (schema) => (req, res, next) => {
  try {
    const validData = schema.parse(req.body);
    req.validData = validData;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation Error",
        details: error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      });
    }
    next(error);
  }
};
