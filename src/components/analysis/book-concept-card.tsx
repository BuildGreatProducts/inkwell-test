"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button, Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface BookConcept {
  _id: Id<"bookConcepts">;
  title: string;
  subtitle?: string;
  blurb: string;
  primaryThemes: string[];
  isSelected: boolean;
}

interface BookConceptCardProps {
  concept: BookConcept;
  onSelect?: () => void;
  isSelecting?: boolean;
}

export function BookConceptCard({ concept, onSelect, isSelecting = false }: BookConceptCardProps) {
  const selectBookConcept = useMutation(api.ai.selectBookConcept);
  const [isLocalSelecting, setIsLocalSelecting] = useState(false);

  const handleSelect = async () => {
    if (onSelect) {
      onSelect();
      return;
    }

    setIsLocalSelecting(true);
    try {
      await selectBookConcept({ conceptId: concept._id });
    } catch (error) {
      console.error("Failed to select concept:", error);
    } finally {
      setIsLocalSelecting(false);
    }
  };

  const isLoading = isSelecting || isLocalSelecting;

  return (
    <Card
      variant={concept.isSelected ? "default" : "bordered"}
      className={cn(
        "p-6 cursor-pointer transition-all duration-200 hover:shadow-md",
        concept.isSelected && "ring-2 ring-primary-500 bg-primary-50/30"
      )}
      onClick={!isLoading ? handleSelect : undefined}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-heading font-semibold text-lg text-neutral-900">{concept.title}</h3>
          {concept.subtitle && (
            <p className="text-neutral-600 text-sm mt-0.5">{concept.subtitle}</p>
          )}
        </div>
        {concept.isSelected && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 ml-3">
            Selected
          </span>
        )}
      </div>

      <p className="text-neutral-600 mb-4 leading-relaxed">{concept.blurb}</p>

      <div>
        <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
          Primary Themes
        </h4>
        <div className="flex flex-wrap gap-2">
          {concept.primaryThemes.map((theme, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-100 text-neutral-700"
            >
              {theme}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-neutral-100 flex justify-end">
        <Button
          size="sm"
          variant={concept.isSelected ? "secondary" : "primary"}
          onClick={(e) => {
            e.stopPropagation();
            handleSelect();
          }}
          isLoading={isLoading}
          disabled={concept.isSelected}
        >
          {concept.isSelected ? "Selected" : "Select This Concept"}
        </Button>
      </div>
    </Card>
  );
}

interface BookConceptGridProps {
  concepts: BookConcept[];
  onRequestMore?: () => Promise<void>;
  isLoadingMore?: boolean;
}

export function BookConceptGrid({
  concepts,
  onRequestMore,
  isLoadingMore = false,
}: BookConceptGridProps) {
  if (concepts.length === 0) {
    return (
      <Card variant="bordered" className="p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-neutral-400"
          >
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
          </svg>
        </div>
        <h3 className="font-heading font-semibold text-lg text-neutral-900 mb-2">
          No Book Concepts Yet
        </h3>
        <p className="text-neutral-500 text-sm">
          Generate book concepts based on your content and voice profile.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {concepts.map((concept) => (
          <BookConceptCard key={concept._id} concept={concept} />
        ))}
      </div>

      {onRequestMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await onRequestMore();
              } catch (error) {
                console.error("Failed to generate more concepts:", error);
              }
            }}
            isLoading={isLoadingMore}
          >
            Generate More Concepts
          </Button>
        </div>
      )}
    </div>
  );
}
