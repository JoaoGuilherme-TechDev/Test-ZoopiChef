// ================================================================
// FILE: waiter/api.ts
// All API calls for the waiter module in one place
// ================================================================

import api from "@/lib/api";
import { WaitlistEntry, WaitlistResponse } from "./types";

export const waitlistApi = {
  fetchActive: (): Promise<WaitlistResponse> =>
    api.get("/waitlist").then((r) => r.data),

  create: (data: {
    customer_name: string;
    customer_phone?: string;
    party_size: number;
    special_requests?: string;
  }): Promise<WaitlistEntry> =>
    api.post("/waitlist", data).then((r) => r.data),

  notify: (id: string): Promise<WaitlistEntry> =>
    api.patch(`/waitlist/${id}/notify`).then((r) => r.data),

  seat: (id: string, table_id: string): Promise<WaitlistEntry> =>
    api.patch(`/waitlist/${id}/seat`, { table_id }).then((r) => r.data),

  cancel: (id: string, no_show: boolean): Promise<WaitlistEntry> =>
    api.patch(`/waitlist/${id}/cancel`, { no_show }).then((r) => r.data),
};