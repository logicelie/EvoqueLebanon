/** Shared by the storefront checkout, the order API and the portal. */
export const DELIVERY_FEE = 4;
export const FREE_OVER = 100;
export const deliveryFee = (subtotal: number) => (subtotal >= FREE_OVER || subtotal <= 0 ? 0 : DELIVERY_FEE);

export const AREAS = ["Beirut", "Mount Lebanon", "North", "Akkar", "Beqaa", "Baalbek-Hermel", "South", "Nabatieh"] as const;

export const PAYMENTS = { cod: "Cash on delivery", whish: "Whish Money", omt: "OMT" } as const;
export type Payment = keyof typeof PAYMENTS;

export const STATUSES = {
  new: "New",
  confirmed: "Confirmed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
} as const;
export type Status = keyof typeof STATUSES;
