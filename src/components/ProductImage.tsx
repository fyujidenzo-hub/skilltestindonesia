import { useEffect, useState, type ImgHTMLAttributes } from "react";

const fallbackImage = "/assets/customer-logo.jpeg";

export function normalizeProductImage(value?: string) {
  const trimmed = String(value ?? "").trim();
  const bbCodeImage = trimmed.match(/\[img\](https?:\/\/[^\[]+)\[\/img\]/i)?.[1];
  const candidate = bbCodeImage?.trim() || trimmed;
  return /^(https?:\/\/|data:image\/|blob:|\/)/i.test(candidate) ? candidate : fallbackImage;
}

export default function ProductImage({
  src,
  className = "",
  onError,
  onLoad,
  style,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const normalizedSource = normalizeProductImage(String(src ?? ""));
  const [resolvedSource, setResolvedSource] = useState(normalizedSource);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setResolvedSource(normalizedSource);
    setLoaded(false);
  }, [normalizedSource]);

  useEffect(() => {
    if (loaded || resolvedSource === fallbackImage) return;
    const timeout = window.setTimeout(() => setResolvedSource(fallbackImage), 3500);
    return () => window.clearTimeout(timeout);
  }, [loaded, resolvedSource]);

  const usingFallback = resolvedSource === fallbackImage;

  return (
    <img
      {...props}
      className={`${className} bg-white`}
      src={resolvedSource}
      style={{
        ...style,
        objectFit: usingFallback ? "contain" : style?.objectFit,
        padding: usingFallback ? "0.75rem" : style?.padding,
      }}
      onLoad={(event) => {
        setLoaded(true);
        onLoad?.(event);
      }}
      onError={(event) => {
        onError?.(event);
        if (resolvedSource !== fallbackImage) setResolvedSource(fallbackImage);
      }}
    />
  );
}
