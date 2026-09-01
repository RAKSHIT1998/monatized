import type { Metadata } from "next";
import { FindOrderForm } from "./find-order-form";

export const metadata: Metadata = {
  title: "Find your order — Monetized",
};

export default function FindOrderPage() {
  return <FindOrderForm />;
}
