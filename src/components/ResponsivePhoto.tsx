import Image, { type ImageProps } from "next/image";
import type { CSSProperties } from "react";

const mobilePhotos: Record<string, string> = {
  "/hero-wellness.jpg": "/mobile/yoga-portrait.jpg",
  "/movement-wellness.jpg": "/mobile/yoga-portrait.jpg",
  "/mindful-wellness.jpg": "/mobile/mindful-portrait.jpg",
  "/workplace-wellness.jpg": "/mobile/workplace-portrait.jpg",
  "/journey-woodland.jpg": "/mobile/woodland-portrait.jpg",
  "/breathing-ocean.jpg": "/mobile/coast-portrait.jpg",
  "/footer-meadow.jpg": "/mobile/woodland-portrait.jpg",
};

export function ResponsivePhoto({
  src,
  mobileSrc,
  pictureClassName = "",
  alt,
  priority,
  ...props
}: Omit<ImageProps, "src"> & {
  src: string;
  mobileSrc?: string;
  pictureClassName?: string;
}) {
  const portrait = mobileSrc || mobilePhotos[src];
  const ratios: Record<string, string> = {
    "/mobile/yoga-portrait.jpg": "4 / 5",
    "/mobile/mindful-portrait.jpg": "80 / 93",
    "/mobile/workplace-portrait.jpg": "480 / 853",
    "/mobile/woodland-portrait.jpg": "2 / 3",
    "/mobile/coast-portrait.jpg": "2 / 3",
  };
  return (
    <picture
      className={`responsive-photo ${pictureClassName}`}
      style={
        {
          "--mobile-photo-aspect": ratios[portrait] || "3 / 4",
        } as CSSProperties
      }
    >
      {portrait && <source media="(max-width: 760px)" srcSet={portrait} />}
      <Image
        {...props}
        src={src}
        alt={alt}
        loading={priority ? "eager" : props.loading}
        fetchPriority={priority ? "high" : props.fetchPriority}
      />
    </picture>
  );
}
