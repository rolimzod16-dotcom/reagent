import { revalidatePath, revalidateTag } from "next/cache";

export function bustCms() {
  try {
    revalidateTag("cms", "max");
    revalidatePath("/ru");
    revalidatePath("/en");
    revalidatePath("/ru/about");
    revalidatePath("/en/about");
    revalidatePath("/ru/contact");
    revalidatePath("/en/contact");
    revalidatePath("/ru/solutions");
    revalidatePath("/en/solutions");
    revalidatePath("/ru/articles", "layout");
    revalidatePath("/en/articles", "layout");
    revalidatePath("/ru/brands", "layout");
    revalidatePath("/en/brands", "layout");
    revalidatePath("/ru", "layout");
    revalidatePath("/en", "layout");
  } catch {
    /* ignore */
  }
}
