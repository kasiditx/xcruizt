"use client";

import { Maximize2, RotateCcw } from "lucide-react";
import Image from "next/image";
import { useId, useRef, useState, type CSSProperties } from "react";

type BeforeAfterSliderProps = {
  afterAlt: string;
  afterLabel?: string;
  afterSrc: string;
  aspectRatio?: `${number}/${number}`;
  beforeAlt: string;
  beforeLabel?: string;
  beforeSrc: string;
  initialPosition?: number;
  priority?: boolean;
};

export function BeforeAfterSlider({
  afterAlt,
  afterLabel = "XCRUIZT",
  afterSrc,
  aspectRatio = "16/9",
  beforeAlt,
  beforeLabel = "Before",
  beforeSrc,
  initialPosition = 50,
  priority = false,
}: BeforeAfterSliderProps) {
  const labelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(
    Math.min(100, Math.max(0, initialPosition)),
  );
  const style = {
    "--slider-position": `${position}%`,
    aspectRatio,
  } as CSSProperties;

  return (
    <figure className="before-after">
      <div className="before-after__viewport" ref={containerRef} style={style}>
        <Image
          alt={beforeAlt}
          fill
          priority={priority}
          sizes="(max-width: 900px) 100vw, 58vw"
          src={beforeSrc}
        />
        <div className="before-after__after">
          <Image
            alt={afterAlt}
            fill
            priority={priority}
            sizes="(max-width: 900px) 100vw, 58vw"
            src={afterSrc}
          />
        </div>
        <span className="before-after__label before-after__label--before">
          {beforeLabel}
        </span>
        <span className="before-after__label before-after__label--after">
          {afterLabel}
        </span>
        <span aria-hidden="true" className="before-after__divider" />
        <label className="sr-only" htmlFor={labelId}>
          เลื่อนเพื่อเปรียบเทียบภาพ Before และ After
        </label>
        <input
          aria-valuetext={`${position}% After`}
          className="before-after__range"
          id={labelId}
          max="100"
          min="0"
          onChange={(event) => setPosition(Number(event.target.value))}
          type="range"
          value={position}
        />
      </div>
      <figcaption className="before-after__controls">
        <span>ใช้ Mouse, Touch หรือ Arrow keys เพื่อเปรียบเทียบ</span>
        <div>
          <button onClick={() => setPosition(50)} type="button">
            <RotateCcw aria-hidden="true" size={15} /> Reset
          </button>
          <button
            onClick={() => void containerRef.current?.requestFullscreen()}
            type="button"
          >
            <Maximize2 aria-hidden="true" size={15} /> Fullscreen
          </button>
        </div>
      </figcaption>
    </figure>
  );
}
