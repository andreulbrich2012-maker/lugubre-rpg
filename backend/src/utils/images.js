import { z } from 'zod';

const safeDataImage = /^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/\r\n]+={0,2}$/i;
const safeLocalAsset = /^\/assets\/[a-z0-9/_.,@()-]+$/i;

export function isSafeImageReference(value, allowEmpty = true) {
  const image = String(value || '').trim();
  if (!image) return allowEmpty;
  if (safeDataImage.test(image) || safeLocalAsset.test(image)) return true;
  try {
    return new URL(image).protocol === 'https:';
  } catch {
    return false;
  }
}

export function imageReferenceSchema(maxLength = 1_500_000, allowEmpty = true) {
  return z.string().trim().max(maxLength).refine(
    (value) => isSafeImageReference(value, allowEmpty),
    'Use uma imagem PNG, JPEG, WebP ou GIF, uma URL HTTPS ou um arquivo interno seguro.'
  );
}
