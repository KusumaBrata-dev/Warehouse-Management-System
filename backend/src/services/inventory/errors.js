export class InventoryError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.name = 'InventoryError';
    this.status = status;
    this.details = details;
  }
}

export const isInventoryError = (err) => err instanceof InventoryError;
