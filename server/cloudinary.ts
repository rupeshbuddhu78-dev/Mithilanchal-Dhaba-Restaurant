import crypto from "node:crypto";

export async function uploadCloudinaryImage(input: { dataUrl: string; folder: string; publicId?: string }) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME; const key = process.env.CLOUDINARY_API_KEY; const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) throw new Error("Cloudinary is not configured.");
  if (!input.dataUrl.startsWith("data:image/")) throw new Error("Please select an image file.");
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const parameters = { folder: input.folder, ...(input.publicId ? { public_id: input.publicId } : {}), timestamp };
  const toSign = Object.entries(parameters).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("&");
  const signature = crypto.createHash("sha1").update(`${toSign}${secret}`).digest("hex");
  const body = new URLSearchParams({ ...parameters, api_key: key, signature, file: input.dataUrl });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/upload`, { method: "POST", body });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || typeof result.secure_url !== "string") throw new Error("Cloudinary upload failed.");
  return { url: result.secure_url as string, publicId: typeof result.public_id === "string" ? result.public_id : null };
}
