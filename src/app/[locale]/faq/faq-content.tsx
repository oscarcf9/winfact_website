"use client";

import { useState } from "react";
import { Accordion, AccordionItem } from "@/components/ui/accordion";

type FaqItem = {
  question: string;
  answer: string;
  category: string;
};

type FaqContentProps = {
  items: FaqItem[];
  categories: Record<string, string>;
};

const ALL_KEY = "all";

export function FaqContent({ items, categories }: FaqContentProps) {
  const [activeCategory, setActiveCategory] = useState<string>(ALL_KEY);

  const filteredItems =
    activeCategory === ALL_KEY
      ? items
      : items.filter((item) => item.category === categories[activeCategory] || item.category === activeCategory);

  const categoryEntries = Object.entries(categories);

  return (
    <div>
      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
        <button
          onClick={() => setActiveCategory(ALL_KEY)}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-colors cursor-pointer ${
            activeCategory === ALL_KEY
              ? "bg-primary text-white shadow-md"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        {categoryEntries.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors cursor-pointer ${
              activeCategory === key
                ? "bg-primary text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* FAQ Accordion */}
      <Accordion>
        {filteredItems.map((item, idx) => (
          <AccordionItem
            key={`${item.category}-${idx}`}
            question={item.question}
            answer={item.answer}
          />
        ))}
      </Accordion>

      {filteredItems.length === 0 && (
        <p className="text-center text-gray-400 py-8">
          No questions found in this category.
        </p>
      )}
    </div>
  );
}
