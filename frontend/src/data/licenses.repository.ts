import { apiGet, apiPost, apiPut, apiDelete } from '@/services/api';
import type {
  ID,
  PagedResponse,
  Vendor, VendorCreate, VendorUpdate, VendorFilters,
  Product, ProductCreate, ProductUpdate, ProductFilters,
  Plan, PlanCreate, PlanUpdate, PlanFilters,
  License, LicenseCreate, LicenseUpdate, LicenseFilters, LicenseCapacity,
  Assignment, AssignmentCreate, AssignmentUpdate, AssignmentFilters,
} from './licenses.types';

// Asegura "/" al final en rutas de colección (¡no usar en rutas de detalle!)
function ensureSlash(path: string) {
  return path.endsWith('/') ? path : path + '/';
}

function toQuery(params: Record<string, unknown>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

// ---------------------------
// Vendors
// ---------------------------
export async function listVendors(filters: VendorFilters): Promise<PagedResponse<Vendor>> {
  const page = filters.page ?? 1;
  const size = filters.size ?? 20;
  const search = filters.search ?? undefined;
  const q = toQuery({ page, size, search });
  const base = ensureSlash('/licenses/vendors');
  const res = await apiGet(`${base}${q}`);
  return res as PagedResponse<Vendor>;
}

export async function getVendor(vendor_id: number): Promise<Vendor> {
  const res = await apiGet(`/licenses/vendors/${vendor_id}`);
  return res as Vendor;
}

export async function createVendor(payload: VendorCreate): Promise<{ ok: boolean; id: number }> {
  const res = await apiPost(ensureSlash('/licenses/vendors'), payload) as Vendor;
  return { ok: true, id: res.vendor_id };
}

export async function updateVendor(vendor_id: number, payload: VendorUpdate): Promise<{ ok: boolean; id: number }> {
  const res = await apiPut(`/licenses/vendors/${vendor_id}`, payload);
  const vendor = res.data as Vendor;
  return { ok: true, id: vendor.vendor_id };
}

export async function removeVendor(vendor_id: number): Promise<{ ok: boolean; id: number }> {
  const res = await apiDelete(`/licenses/vendors/${vendor_id}`) as { ok: boolean; message: string; id: number };
  return { ok: res.ok, id: res.id };
}

// ---------------------------
// Products
// ---------------------------
export async function listProducts(filters: ProductFilters): Promise<PagedResponse<Product>> {
  const page = filters.page ?? 1;
  const size = filters.size ?? 20;
  const search = filters.search ?? undefined;
  const vendor_id = filters.vendor_id ?? undefined;
  const q = toQuery({ page, size, search, vendor_id });
  const base = ensureSlash('/licenses/products');
  const res = await apiGet(`${base}${q}`);
  return res as PagedResponse<Product>;
}

export async function getProduct(product_id: number): Promise<Product> {
  const res = await apiGet(`/licenses/products/${product_id}`);
  return res as Product;
}

export async function createProduct(payload: ProductCreate): Promise<{ ok: boolean; id: number }> {
  const res = await apiPost(ensureSlash('/licenses/products'), payload) as Product;
  return { ok: true, id: res.product_id };
}

export async function updateProduct(product_id: number, payload: ProductUpdate): Promise<{ ok: boolean; id: number }> {
  const res = await apiPut(`/licenses/products/${product_id}`, payload);
  const product = res.data as Product;
  return { ok: true, id: product.product_id };
}

export async function removeProduct(product_id: number): Promise<{ ok: boolean; id: number }> {
  const res = await apiDelete(`/licenses/products/${product_id}`) as { ok: boolean; message: string; id: number };
  return { ok: res.ok, id: res.id };
}

// ---------------------------
// Plans
// ---------------------------
export async function listPlans(filters: PlanFilters): Promise<PagedResponse<Plan>> {
  const page = filters.page ?? 1;
  const size = filters.size ?? 20;
  const search = filters.search ?? undefined;
  const product_id = filters.product_id ?? undefined;
  const billing_cycle = filters.billing_cycle ?? undefined;
  const currency = filters.currency ?? undefined;
  const price_min = filters.price_min ?? undefined;
  const price_max = filters.price_max ?? undefined;
  const q = toQuery({ page, size, search, product_id, billing_cycle, currency, price_min, price_max });
  const base = ensureSlash('/licenses/plans');
  const res = await apiGet(`${base}${q}`);
  return res as PagedResponse<Plan>;
}

export async function getPlan(plan_id: number): Promise<Plan> {
  const res = await apiGet(`/licenses/plans/${plan_id}`);
  return res as Plan;
}

export async function createPlan(payload: PlanCreate): Promise<{ ok: boolean; id: number }> {
  const res = await apiPost(ensureSlash('/licenses/plans'), payload) as Plan;
  return { ok: true, id: res.plan_id };
}

export async function updatePlan(plan_id: number, payload: PlanUpdate): Promise<{ ok: boolean; id: number }> {
  const res = await apiPut(`/licenses/plans/${plan_id}`, payload);
  const plan = res.data as Plan;
  return { ok: true, id: plan.plan_id };
}

export async function removePlan(plan_id: number): Promise<{ ok: boolean; id: number }> {
  const res = await apiDelete(`/licenses/plans/${plan_id}`) as { ok: boolean; message: string; id: number };
  return { ok: res.ok, id: res.id };
}

// ---------------------------
// Licenses (pools)
// ---------------------------
export async function listLicenses(filters: LicenseFilters): Promise<PagedResponse<License>> {
  const page = filters.page ?? 1;
  const size = filters.size ?? 20;
  const search = filters.search ?? undefined;
  const vendor_id = filters.vendor_id ?? undefined;
  const product_id = filters.product_id ?? undefined;
  const plan_id = filters.plan_id ?? undefined;
  const code = filters.code ?? undefined;
  const date_from = filters.date_from ?? undefined;
  const date_to = filters.date_to ?? undefined;
  const q = toQuery({ page, size, search, vendor_id, product_id, plan_id, code, date_from, date_to });
  const base = ensureSlash('/licenses');
  const res = await apiGet(`${base}${q}`);
  return res as PagedResponse<License>;
}

export async function getLicense(license_id: number): Promise<License> {
  const res = await apiGet(`/licenses/${license_id}`);
  return res as License;
}

export async function createLicense(payload: LicenseCreate): Promise<{ ok: boolean; id: number }> {
  const res = await apiPost(ensureSlash('/licenses'), payload) as License;
  return { ok: true, id: res.license_id };
}

export async function updateLicense(license_id: number, payload: LicenseUpdate): Promise<{ ok: boolean; id: number }> {
  const res = await apiPut(`/licenses/${license_id}`, payload);
  const license = res.data as License;
  return { ok: true, id: license.license_id };
}

export async function removeLicense(license_id: number): Promise<{ ok: boolean; id: number }> {
  const res = await apiDelete(`/licenses/${license_id}`) as { ok: boolean; message: string; id: number };
  return { ok: res.ok, id: res.id };
}

export async function getLicenseCapacity(license_id: number): Promise<LicenseCapacity> {
  const res = await apiGet(`/licenses/${license_id}/capacity`);
  return res as LicenseCapacity;
}

// ---------------------------
// Assignments
// ---------------------------
export async function listAssignments(filters: AssignmentFilters): Promise<PagedResponse<Assignment>> {
  const page = filters.page ?? 1;
  const size = filters.size ?? 20;
  const search = filters.search ?? undefined;
  const license_id = filters.license_id ?? undefined;
  const user_id = filters.user_id ?? undefined;
  const status = filters.status ?? undefined;
  const date_from = filters.date_from ?? undefined;
  const date_to = filters.date_to ?? undefined;
  const q = toQuery({ page, size, search, license_id, user_id, status, date_from, date_to });
  const base = ensureSlash('/licenses/assignments');
  const res = await apiGet(`${base}${q}`);
  return res as PagedResponse<Assignment>;
}

export async function getAssignment(assignment_id: number): Promise<Assignment> {
  const res = await apiGet(`/licenses/assignments/${assignment_id}`);
  return res as Assignment;
}

export async function createAssignment(payload: AssignmentCreate, idempotencyKey?: string): Promise<{ ok: boolean; id: number }> {
  const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
  const res = await apiPost(ensureSlash('/licenses/assignments'), payload, headers) as Assignment;
  return { ok: true, id: res.assignment_id };
}

export async function updateAssignment(assignment_id: number, payload: AssignmentUpdate): Promise<{ ok: boolean; id: number }> {
  const res = await apiPut(`/licenses/assignments/${assignment_id}`, payload);
  const assignment = res.data as Assignment;
  return { ok: true, id: assignment.assignment_id };
}

export async function revokeAssignment(assignment_id: number): Promise<{ ok: boolean; id: number }> {
  const res = await apiDelete(`/licenses/assignments/${assignment_id}`) as Assignment;
  return { ok: true, id: res.assignment_id };
}

// ---------------------------
// My Assignments (responsable)
// ---------------------------
export async function listMyAssignments(filters?: Partial<AssignmentFilters>): Promise<PagedResponse<Assignment>> {
  const page = filters?.page ?? 1;
  const size = filters?.size ?? 20;
  const status = filters?.status ?? undefined;
  const q = toQuery({ page, size, status });
  const base = ensureSlash('/licenses/assignments/my');
  const res = await apiGet(`${base}${q}`);
  return res as PagedResponse<Assignment>;
}
