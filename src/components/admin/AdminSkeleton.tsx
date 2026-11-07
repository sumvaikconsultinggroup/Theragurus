import type { CSSProperties, ReactNode } from "react";

export type SkeletonKind =
  | "overview"
  | "analytics"
  | "table"
  | "detail"
  | "calendar"
  | "settings";

function Bone({ style }: { style?: CSSProperties }) {
  return <span className="sk" style={style} />;
}

export function AdminSkeleton({
  error,
  kind = "table",
}: {
  error?: string;
  kind?: SkeletonKind;
}) {
  if (error)
    return (
      <div className="admin-alert" role="alert">
        {error}
      </div>
    );
  return (
    <div
      className={`admin-skeleton admin-skeleton-${kind}`}
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      {body(kind)}
    </div>
  );
}

function body(kind: SkeletonKind): ReactNode {
  if (kind === "overview" || kind === "analytics") {
    return (
      <>
        <div className="sk-cards">
          {Array.from({ length: 6 }, (_, i) => (
            <Bone key={i} />
          ))}
        </div>
        <div className="sk-split">
          <Bone />
          {kind === "analytics" && <Bone />}
        </div>
      </>
    );
  }
  if (kind === "calendar") {
    return (
      <div className="sk-cal">
        {Array.from({ length: 35 }, (_, i) => (
          <Bone key={i} />
        ))}
      </div>
    );
  }
  if (kind === "detail" || kind === "settings") {
    return (
      <div className="sk-split">
        <Bone />
        <Bone />
      </div>
    );
  }
  return (
    <div className="sk-table">
      {Array.from({ length: 6 }, (_, i) => (
        <Bone key={i} />
      ))}
    </div>
  );
}
