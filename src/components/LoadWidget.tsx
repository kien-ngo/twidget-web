"use client";

import { ThirdwebSDK } from "@thirdweb-dev/react";
import { useEffect, useRef, useState } from "react";
import { MinimalRPCChain, getAllChains } from "../utils/getAllChains";
import ThirdwebProviderWrapper from "./ThirdwebProviderWrapper";
import { useRouter } from "next/navigation";

export default function LoadWidget() {
  return (
    <ThirdwebProviderWrapper>
      <Content />
    </ThirdwebProviderWrapper>
  );
}

const CONTRACT_TYPES = [
  "split",
  "custom",
  "edition-drop",
  "edition",
  "marketplace",
  "marketplace-v3",
  "multiwrap",
  "nft-collection",
  "nft-drop",
  "pack",
  "signature-drop",
  "token-drop",
  "token",
  "vote",
];
// https://thirdweb.com/ethereum/0xCD4Ef397D4f1c936336C19fbc4ac43b78708C439
const allChains = getAllChains();
const Content = () => {
  const router = useRouter();
  const [contractAddress, setContractAddress] = useState<string>("");
  const [chain, setChain] = useState<string>("");
  const [importError, setImportError] = useState<string>("");
  if (importError) console.log({ importError });
  const contractAddressInputRef = useRef<HTMLInputElement>(null);
  const chainSlugRef = useRef<HTMLInputElement>(null);
  const dashboardUrlInputRef = useRef<HTMLInputElement>(null);
  const widgetUrlInputRef = useRef<HTMLInputElement>(null);
  const [isLoadingContract, setIsLoadingContract] = useState<boolean>(false);

  useEffect(() => {
    if (!contractAddress) return;
    if (!chain) return;
    async function load() {
      setIsLoadingContract(true);
      const sdk = new ThirdwebSDK(chain);
      const contractType = await sdk.resolveContractType(contractAddress);
      // Only support ERC721 widget atm
      if (!CONTRACT_TYPES.includes(contractType)) {
        setImportError("Contract is not supported by Thirdweb");
        setIsLoadingContract(false);
        return;
      }
      if (contractType !== "nft-drop") {
        setImportError("Only NFTDrop contract is supported at the moment");
        setIsLoadingContract(false);
        return;
      }
      console.log("NFT Drop contract detected");
      setIsLoadingContract(false);
      const queryParams = {
        contractAddress: contractAddress,
        network: chain,
      };
      router.push(
        `/nft-drop?contractAddress=${contractAddress}&network=${chain}`
      );
    }
    load();
  }, [contractAddress, chain]);

  const LOAD_OPTIONS = [
    {
      label: "Dashboard URL",
      id: "dashboardUrl",
      component: (
        <>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Enter Dashboard URL</span>
            </label>
            <label className="input-group">
              <span>URL</span>
              <input
                ref={dashboardUrlInputRef}
                type="text"
                placeholder="https://thirdweb.com/ethereum/0x..."
                className="input input-bordered w-full"
              />
            </label>
          </div>
          <button
            className="btn btn-primary mx-auto mt-6 w-[200px]"
            onClick={() => {
              const value = dashboardUrlInputRef.current?.value;
              if (!value)
                return setImportError("Please enter a TW dashboard URL");
              try {
                const url = new URL(String(value));
                if (url.origin !== "https://thirdweb.com")
                  return setImportError("URL is invalid");
                const [, , , _chain, address] = url.href.split("/");
                // make sure `chain` belong to one of the chains supported by thirdweb
                const found = allChains.find((item) => item.slug === _chain);
                if (!found)
                  return setImportError(`Invalid/unsupported chain: ${_chain}`);
                // todo: validate contract address
                setChain(_chain);
                setContractAddress(address);
              } catch (err) {
                setImportError("URL is invalid");
              }
            }}
          >
            {isLoadingContract ? (
              <span className="loading loading-spinner"></span>
            ) : (
              "Load"
            )}
          </button>
        </>
      ),
    },
    {
      label: "Embed URL",
      id: "widgetUrl",
      component: (
        <>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Enter Embed URL</span>
            </label>
            <label className="input-group">
              <span>URL</span>
              <input
                type="text"
                ref={widgetUrlInputRef}
                placeholder="https://bafy...blim7zum.gateway.ipfscdn.io/?contract=0x...&chain=..."
                className="input input-bordered w-full"
              />
            </label>
          </div>
          <button
            className="btn btn-primary mx-auto mt-6 w-[200px]"
            onClick={() => {
              const value = widgetUrlInputRef.current?.value;
              if (!value) return setImportError("Please enter a TW widget URL");
              try {
                const url = new URL(String(value));
                const searchParams = url.searchParams;
                const chainParam = searchParams.get("chain");
                if (!chainParam) return setImportError("Invalid chain param");
                const contractParam = searchParams.get("contract");
                if (!contractParam)
                  return setImportError("Invalid contractParam");

                const chainObject = JSON.parse(chainParam) as MinimalRPCChain;
                const found = allChains.find(
                  (item) => item.slug === chainObject.slug
                );
                if (!found)
                  return setImportError(
                    `Invalid/unsupported chain: ${chainParam}`
                  );
                setChain(chainObject.slug);
                setContractAddress(contractParam);
              } catch (err) {
                setImportError("URL is invalid");
              }
            }}
          >
            {isLoadingContract ? (
              <span className="loading loading-spinner"></span>
            ) : (
              "Load"
            )}
          </button>
        </>
      ),
    },
    {
      label: "Contract address",
      id: "contractAddress",
      component: (
        <>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Enter Contract address</span>
            </label>
            <label className="input-group">
              <span>Address</span>
              <input
                type="text"
                ref={contractAddressInputRef}
                placeholder="0x..."
                className="input input-bordered w-full"
              />
            </label>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Select network</span>
            </label>
            <label className="input-group" htmlFor="networkInput">
              <span>Network</span>
              <input
                type="text"
                list="network-list"
                name="networkInput"
                id="networkInput"
                ref={chainSlugRef}
                placeholder="ex: ethereum"
                className="input input-bordered w-full"
              />
              <datalist id="network-list">
                {allChains.map((item) => (
                  <option key={item.chainId} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </datalist>
            </label>
          </div>
          <button
            className="btn btn-primary mx-auto mt-6 w-[200px]"
            onClick={() => {
              const _addr = contractAddressInputRef.current?.value;
              if (!_addr) return setImportError("Please enter a contract");
              setContractAddress(String(_addr));
              const _chain = chainSlugRef.current?.value;
              if (!_chain) return setImportError("Please enter a network");
              // make sure `chain` belong to one of the chains supported by thirdweb
              const found = allChains.find((item) => item.slug === _chain);
              if (!found)
                return setImportError(`Invalid/unsupported chain: ${_chain}`);
              // todo: validate contract address
              setChain(_chain);
            }}
          >
            {isLoadingContract ? (
              <span className="loading loading-spinner"></span>
            ) : (
              "Load"
            )}
          </button>
        </>
      ),
    },
  ] as const;

  return (
    <>
      {LOAD_OPTIONS.map((item, index) => (
        <div
          className="collapse collapse-arrow bg-base-200 rounded-none join-item border border-base-300"
          key={item.id}
        >
          <input
            type="radio"
            name="my-accordion-2"
            disabled={isLoadingContract}
            defaultChecked={index === 0}
          />
          <div className="collapse-title text-xl font-medium">
            Load with {item.label}
          </div>
          <div className="collapse-content flex flex-col">{item.component}</div>
        </div>
      ))}
    </>
  );
};
