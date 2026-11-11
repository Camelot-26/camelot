import { getUserImageStorage } from "@/lib/user-image-storage";

const IMAGE_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/user-images/[filename]">,
) {
  const { filename } = await params;
  const match =
    /^([0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})\.(jpg|png|webp)$/.exec(
      filename,
    );
  if (!match) {
    return new Response("Image not found.", { status: 404 });
  }

  const image = await getUserImageStorage().get(filename);
  if (!image) {
    return new Response("Image not found.", { status: 404 });
  }

  const body = new ArrayBuffer(image.body.byteLength);
  new Uint8Array(body).set(image.body);
  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(image.body.byteLength),
      "Content-Type": IMAGE_TYPES[match[2]],
      "X-Content-Type-Options": "nosniff",
    },
  });
}
