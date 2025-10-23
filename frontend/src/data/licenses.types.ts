// Tipos base
export type ID = number;
export type UUID = string;

// Paginación y respuestas
export type Pagination = { page?: number; size?: number };
export type PagedResponse<T> = { data: T[]; total: number; page: number; size: number; pages: number };

// Vendors
export type Vendor = { vendor_id: ID; name: string; website?: string | null; created_at: string };
export type VendorCreate = { name: string; website?: string | null };
export type VendorUpdate = Partial<VendorCreate>;
export type VendorFilters = { search?: string } & Pagination;

// Products
export type Product = { product_id: ID; vendor_id: ID; name: string; description?: string | null; vendor_name?: string };
export type ProductCreate = { vendor_id: ID; name: string; description?: string | null };
export type ProductUpdate = Partial<ProductCreate>;
export type ProductFilters = { vendor_id?: ID; search?: string } & Pagination;

// Plans
export type BillingCycle = "annual" | "monthly";
export type Currency = "MXN" | "USD";
export type Plan = {
  plan_id: ID; product_id: ID; plan_name: string;
  billing_cycle: BillingCycle; seat_limit?: number | null; features: Record<string, any>;
  currency?: Currency; cost_per_cycle?: number | null;
  product_name?: string; vendor_name?: string;
};
export type PlanCreate = {
  product_id: ID; plan_name: string; billing_cycle: BillingCycle;
  seat_limit?: number | null; features?: Record<string, any>;
  currency?: Currency; cost_per_cycle?: number | null;
};
export type PlanUpdate = Partial<PlanCreate>;
export type PlanFilters = {
  product_id?: ID; billing_cycle?: BillingCycle; currency?: Currency;
  price_min?: number; price_max?: number; search?: string;
} & Pagination;

// Licenses
export type License = {
  license_id: ID; plan_id: ID; code?: string | null;
  seats_total: number; seats_in_use: number; start_date?: string | null;
  end_date?: string | null; renewal_date?: string | null; notes?: string | null;
  created_by?: UUID | null; created_at: string; updated_at: string;
  seats_available: number; plan_name?: string; product_name?: string; vendor_name?: string;
};
export type LicenseCreate = {
  plan_id: ID; code?: string | null; seats_total: number;
  start_date?: string | null; end_date?: string | null; renewal_date?: string | null; notes?: string | null;
};
export type LicenseUpdate = Partial<LicenseCreate> & { seats_total?: number };
export type LicenseFilters = {
  vendor_id?: ID; product_id?: ID; plan_id?: ID; code?: string; date_from?: string; date_to?: string; search?: string;
} & Pagination;
export type LicenseCapacity = { seats_total: number; seats_in_use: number; seats_available: number };

// Assignments
export type AssignmentStatus = "active" | "revoked" | "expired";
export type Assignment = {
  assignment_id: ID; license_id: ID; user_id: UUID; status: AssignmentStatus;
  assigned_at: string; revoked_at?: string | null; notes?: string | null;
  license_code?: string; plan_name?: string; user_full_name?: string; user_email?: string;
};
export type AssignmentCreate = { license_id: ID; user_id: UUID; notes?: string | null };
export type AssignmentUpdate = { status?: AssignmentStatus; notes?: string | null };
export type AssignmentFilters = {
  license_id?: ID; user_id?: UUID; status?: AssignmentStatus; date_from?: string; date_to?: string; search?: string;
} & Pagination;


