import { getAdminUser } from "@/lib/auth";
import { uploadImage } from "@/lib/storage";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!(await getAdminUser())) return Response.json({ error: "Please sign in again." }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  const folder = form.get("folder") === "site" ? "site" : "products";
  if (!(file instanceof File)) return Response.json({ error: "No file received." }, { status: 400 });

  try {
    return Response.json({ url: await uploadImage(file, folder) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 400 });
  }
}
