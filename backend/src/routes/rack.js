import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

export const rackRouter = Router();
rackRouter.use(authenticate);

// GET /api/rack/:productId
rackRouter.get("/:productId", async (req, res, next) => {
  try {
    const racks = await prisma.rackLocation.findMany({
      where: { productId: parseInt(req.params.productId) },
      orderBy: { rackCode: "asc" },
    });
    res.json(racks);
  } catch (err) {
    next(err);
  }
});

// POST /api/rack — Assign rack to item
rackRouter.post("/", async (req, res, next) => {
  try {
    const { productId, rackCode, row, level, notes } = req.body;
    if (!productId || !rackCode || !row || level === undefined) {
      return res
        .status(400)
        .json({ error: "productId, rackCode, row, and level are required" });
    }
    const rack = await prisma.rackLocation.create({
      data: {
        productId: parseInt(productId),
        rackCode: rackCode.toUpperCase(),
        row: row.toUpperCase(),
        level: parseInt(level),
        notes,
      },
    });
    res.status(201).json(rack);
  } catch (err) {
    next(err);
  }
});

// PUT /api/rack/:id
rackRouter.put("/:id", async (req, res, next) => {
  try {
    const { rackCode, row, level, notes } = req.body;
    const rack = await prisma.rackLocation.update({
      where: { id: parseInt(req.params.id) },
      data: {
        rackCode: rackCode?.toUpperCase(),
        row: row?.toUpperCase(),
        level: level ? parseInt(level) : undefined,
        notes,
      },
    });
    res.json(rack);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/rack/:id
rackRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.rackLocation.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: "Rack location removed" });
  } catch (err) {
    next(err);
  }
});
