/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * This file is a stub that will be replaced by Convex when you run `npx convex dev`.
 * Run `npx convex dev` to generate the real types based on your schema.
 */

import { FunctionReference, anyApi } from "convex/server";

// Stub API types - these will be replaced when you run `convex dev`
export const api: typeof anyApi = anyApi as any;
export const internal: typeof anyApi = anyApi as any;

// Type helpers
export type ApiType = typeof api;
