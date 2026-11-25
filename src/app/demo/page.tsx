import { PublicAnalytics } from "@/components/public-analytics";
import { Workspace } from "@/components/workspace";
export default function Demo() {
  return (
    <>
      <PublicAnalytics />
      <Workspace user={{ name: "Demo workspace", image: null }} demo />
    </>
  );
}
