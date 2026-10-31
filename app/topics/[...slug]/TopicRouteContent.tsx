"use client";

import { use } from "react";
import WorkspaceShell from "../../WorkspaceShell";

export default function TopicRouteContent({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = use(params);
  return <WorkspaceShell topicSlugs={slug} section="topics" />;
}
