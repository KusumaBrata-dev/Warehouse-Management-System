/*
  Warnings:

  - You are about to drop the column `supplier_id` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the `suppliers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_supplier_id_fkey";

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "supplier_id";

-- DropTable
DROP TABLE "suppliers";
