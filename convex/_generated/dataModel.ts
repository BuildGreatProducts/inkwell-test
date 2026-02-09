/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * This file is a stub that will be replaced by Convex when you run `npx convex dev`.
 * Run `npx convex dev` to generate the real types based on your schema.
 */

import { GenericId } from "convex/values";

// Define table names
export type TableNames =
  | "users"
  | "projects"
  | "videos"
  | "voiceProfiles"
  | "bookConcepts"
  | "chapters"
  | "chapterDrafts"
  | "covers"
  | "purchases";

// Generic ID type for any table
export type Id<T extends TableNames> = GenericId<T>;

// Data model type (stub)
export type DataModel = any;
