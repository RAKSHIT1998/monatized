import type { Metadata } from "next";
import { NewProductForm } from "./new-product-form";

export const metadata: Metadata = {
  title: "New product — Monetized",
};

export default function NewProductPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New product</h1>
        <p className="text-sm text-muted-foreground">
          Upload the file customers will receive after checkout.
        </p>
      </div>
      <NewProductForm />
    </div>
  );
}
