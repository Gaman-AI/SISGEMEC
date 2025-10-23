import { supabase } from "@/lib/supabase";

export type ProfileLite = {
  user_id: string;
  full_name: string;
  email: string;
  active: boolean;
};

export type PagedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
};

export async function listActiveProfilesLite(opts: {
  page?: number;
  size?: number;
  search?: string;
} = {}): Promise<PagedResponse<ProfileLite>> {
  const page = Math.max(1, opts.page ?? 1);
  const size = Math.max(1, opts.size ?? 20);
  const from = (page - 1) * size;
  const to = from + size - 1;

  let query = supabase
    .from("profiles")
    .select("user_id, full_name, email, active", { count: "exact" })
    .eq("active", true)
    .order("full_name", { ascending: true })
    .range(from, to);

  const q = (opts.search ?? "").trim();
  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const total = count ?? 0;
  return {
    data: (data ?? []) as ProfileLite[],
    total,
    page,
    size,
    pages: Math.ceil(total / size),
  };
}