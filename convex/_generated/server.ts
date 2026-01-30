/**
 * This file is a stub that will be replaced by Convex when you run `npx convex dev`.
 * Run `npx convex dev` to generate the real types based on your schema.
 */

import {
  QueryBuilder,
  MutationBuilder,
  ActionBuilder,
  GenericQueryCtx,
  GenericMutationCtx,
  GenericActionCtx,
  GenericDataModel,
  httpActionGeneric,
} from "convex/server";

// Create stub builders with proper types
export const query = ((fn: unknown) => fn) as QueryBuilder<GenericDataModel, "public">;
export const mutation = ((fn: unknown) => fn) as MutationBuilder<GenericDataModel, "public">;
export const action = ((fn: unknown) => fn) as ActionBuilder<GenericDataModel, "public">;
export const internalQuery = ((fn: unknown) => fn) as QueryBuilder<GenericDataModel, "internal">;
export const internalMutation = ((fn: unknown) =>
  fn) as MutationBuilder<GenericDataModel, "internal">;
export const internalAction = ((fn: unknown) => fn) as ActionBuilder<GenericDataModel, "internal">;
export const httpAction = httpActionGeneric;

// Context types
export type QueryCtx = GenericQueryCtx<GenericDataModel>;
export type MutationCtx = GenericMutationCtx<GenericDataModel>;
export type ActionCtx = GenericActionCtx<GenericDataModel>;
