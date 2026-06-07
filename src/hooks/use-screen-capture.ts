import { useEffect, useRef, useState } from "react";

/**
 * Manages a single getDisplayMedia stream for random screenshot capture.
 * Returns: a `request()` that asks the user once, a `capture()` that returns
 * a Blob frame from the active stream, and a `stop()` to release.
 */
export function useScreenCapture() {
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const request = async (): Promise<boolean> => {
    setError(null);
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
        setError("Screen capture not supported in this browser.");
        return false;
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 1 },
        audio: false,
      });
      streamRef.current = stream;
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        streamRef.current = null;
        setActive(false);
      });
      setActive(true);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };

  const capture = async (blur = false): Promise<Blob | null> => {
    const stream = streamRef.current;
    if (!stream) return null;
    const track = stream.getVideoTracks()[0];
    if (!track) return null;
    // ImageCapture is the modern API; fall back to video element if missing.
    try {
      const win = window as unknown as { ImageCapture?: new (t: MediaStreamTrack) => { grabFrame: () => Promise<ImageBitmap> } };
      if (win.ImageCapture) {
        const ic = new win.ImageCapture(track);
        const bitmap = await ic.grabFrame();
        return await bitmapToBlob(bitmap, blur);
      }
    } catch {
      // fall through
    }
    return await videoToBlob(stream, blur);
  };

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  };

  return { active, error, request, capture, stop };
}

async function bitmapToBlob(bitmap: ImageBitmap, blur: boolean): Promise<Blob | null> {
  // Cap longest edge at 1280 to keep storage small
  const max = 1280;
  const ratio = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * ratio);
  const h = Math.round(bitmap.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  if (blur) ctx.filter = "blur(10px)";
  ctx.drawImage(bitmap, 0, 0, w, h);
  return await new Promise((res) => canvas.toBlob((b) => res(b), "image/jpeg", 0.7));
}

async function videoToBlob(stream: MediaStream, blur: boolean): Promise<Blob | null> {
  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  await video.play();
  await new Promise((r) => setTimeout(r, 100));
  const canvas = document.createElement("canvas");
  canvas.width = Math.min(1280, video.videoWidth);
  canvas.height = Math.round((canvas.width / video.videoWidth) * video.videoHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  if (blur) ctx.filter = "blur(10px)";
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), "image/jpeg", 0.7));
  video.pause();
  video.srcObject = null;
  return blob;
}
