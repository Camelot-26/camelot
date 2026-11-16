import "server-only";

const MAX_PROFILE_IMAGE_BYTES = 512 * 1024;
const MAX_PROFILE_IMAGE_DATA_URL_LENGTH =
  Math.ceil(MAX_PROFILE_IMAGE_BYTES / 3) * 4 + 64;

export function parseUploadedProfileImage(image: string) {
  const match =
    /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
  if (!match || image.length > MAX_PROFILE_IMAGE_DATA_URL_LENGTH) {
    return null;
  }

  const [, type, encodedImage] = match;
  const bytes = Buffer.from(encodedImage, "base64");
  if (
    bytes.length === 0 ||
    bytes.length > MAX_PROFILE_IMAGE_BYTES ||
    bytes.toString("base64") !== encodedImage
  ) {
    return null;
  }

  if (type === "png") {
    if (
      !bytes.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      )
    ) {
      return null;
    }
    return { bytes, extension: "png" };
  }
  if (type === "jpeg") {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
      return null;
    }
    return { bytes, extension: "jpg" };
  }
  if (
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { bytes, extension: "webp" };
  }
  return null;
}
