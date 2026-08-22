"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOnboardedCreator } from "@/lib/dal";
import { updateCustomerDetailsSchema } from "@/lib/validation/customer";

export type CustomerFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

export async function updateCustomerDetails(
  _prevState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const user = await requireOnboardedCreator();
  const customerId = String(formData.get("customerId"));

  const customer = await db.customer.findUnique({ where: { id: customerId } });
  if (!customer || customer.creatorProfileId !== user.creatorProfile.id) {
    return { message: "Customer not found." };
  }

  const validatedFields = updateCustomerDetailsSchema.safeParse({
    tags: formData.get("tags") ?? "",
    notes: formData.get("notes") || undefined,
  });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { tags, notes } = validatedFields.data;

  await db.customer.update({
    where: { id: customerId },
    data: { tags, notes: notes ?? null },
  });

  revalidatePath("/dashboard/customers");
  return {};
}
