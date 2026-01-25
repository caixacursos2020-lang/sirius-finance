declare module "jsqr" {
  export default function jsQR(
    imageData: Uint8ClampedArray,
    width: number,
    height: number
  ): { data: string } | null;
}
