import LoadWidget from "@/src/components/LoadWidget";
import { ThirdwebProvider, ThirdwebSDKProvider } from "@thirdweb-dev/react";
import Image from "next/image";

export default function Home() {
  return (
    <>
      <div className="navbar bg-base-100">
        <a className="btn btn-ghost normal-case text-xl">Load widget</a>
      </div>
      <LoadWidget />
    </>
  );
}
