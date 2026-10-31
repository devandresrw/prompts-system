import { Suspense } from "react";
import WorkspaceShell from "../../WorkspaceShell";
import TopicRouteContent from "./TopicRouteContent";

export default function TopicRoute({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  return (
    <Suspense fallback={<WorkspaceShell section="topics" />}>
      <TopicRouteContent params={params} />
    </Suspense>
  );
}
