import { InventoryError } from './errors.js';
import { buildPagination, parseSearch, parseStockFilter } from './query-utils.js';

const buildStockWhere = ({ search }) => {
  if (!search) return {};
  return {
    product: {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ],
    },
  };
};

const withLocationPath = (stocks) =>
  stocks.map((row) => {
    const locations = row.product.boxProducts.map((bp) => {
      const pallet = bp.box.pallet;
      if (!pallet) return `Box: ${bp.box.name}`;

      const level = pallet.rackLevel;
      const section = level.section;
      const rack = section.rack;
      const floor = rack.floor;
      return `${floor.name} > Rak ${rack.letter}${section.number} > L${level.number} > ${bp.box.name}`;
    });

    return {
      ...row,
      locationPath:
        locations.length > 1
          ? `${locations[0]} (+${locations.length - 1} more)`
          : locations.length === 1
            ? locations[0]
            : 'Belum Ada Lokasi',
    };
  });

export const getStockOverview = async ({ prisma, query }) => {
  const { page, limit } = buildPagination(query);
  const search = parseSearch(query.search);
  const filter = parseStockFilter(query.filter || 'all');

  const where = buildStockWhere({ search });

  const summaryRows = await prisma.stock.findMany({
    where,
    select: {
      id: true,
      quantity: true,
      product: { select: { minStock: true } },
    },
  });

  const lowStockCount = summaryRows.filter((s) => s.quantity > 0 && s.quantity <= (s.product?.minStock ?? 0)).length;
  const outOfStockCount = summaryRows.filter((s) => s.quantity === 0).length;
  const totalQty = summaryRows.reduce((acc, s) => acc + s.quantity, 0);

  const filteredIds = summaryRows
    .filter((s) => {
      const minStock = s.product?.minStock ?? 0;
      if (filter === 'low') return s.quantity > 0 && s.quantity <= minStock;
      if (filter === 'out') return s.quantity === 0;
      return true;
    })
    .map((s) => s.id);

  const total = filteredIds.length;
  const pagedIds = filteredIds.slice((page - 1) * limit, (page - 1) * limit + limit);

  if (pagedIds.length === 0) {
    return {
      summary: { total, lowStock: lowStockCount, outOfStock: outOfStockCount, totalQty },
      stocks: [],
      pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  const stocks = await prisma.stock.findMany({
    where: { id: { in: pagedIds } },
    include: {
      product: {
        include: {
          category: true,
          boxProducts: {
            include: {
              box: {
                include: {
                  pallet: {
                    include: {
                      rackLevel: {
                        include: {
                          section: {
                            include: {
                              rack: {
                                include: { floor: true },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const ordered = stocks.sort((a, b) => (a.product?.name || '').localeCompare(b.product?.name || ''));

  return {
    summary: {
      total,
      lowStock: lowStockCount,
      outOfStock: outOfStockCount,
      totalQty,
    },
    stocks: withLocationPath(ordered),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

export const assertSupportedStockFilters = ({ filter }) => {
  try {
    parseStockFilter(filter || 'all');
  } catch (err) {
    if (err instanceof InventoryError) throw err;
    throw new InventoryError(400, 'Invalid stock filter');
  }
};
