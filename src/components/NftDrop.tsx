"use client";

import {
  ConnectWallet,
  Web3Button,
  useActiveClaimConditionForWallet,
  useAddress,
  useClaimIneligibilityReasons,
  useClaimerProofs,
  useContract,
} from "@thirdweb-dev/react";
import { ClaimCondition, NFT, detectContractFeature } from "@thirdweb-dev/sdk";
import { BigNumber, utils } from "ethers";
import { useMemo, useState } from "react";
import { parseIneligibility } from "../utils/parseIneligibility";

type Props = {
  contractAddress: string;
  contractMetadata: {
    name: string;
    description?: string | undefined;
    image?: string | undefined;
    external_link?: string | undefined;
    app_uri?: string | undefined;
    social_urls?: Record<string, string> | undefined;
  };
  claimConditions: ClaimCondition[];
  firstNft: NFT;
  claimedSupply: BigNumber;
  unclaimedSupply: BigNumber;
};

export default function NftDrop({
  contractAddress,
  contractMetadata,
  claimConditions,
  firstNft,
  claimedSupply,
  unclaimedSupply,
}: Props) {
  console.log({
    contractAddress,
    contractMetadata,
    claimConditions,
    firstNft,
    claimedSupply,
    unclaimedSupply,
  });
  const {
    contract,
    isLoading: loadingContract,
    error,
  } = useContract(contractAddress);
  const address = useAddress();
  const [quantity, setQuantity] = useState(1);
  const activeClaimCondition = useActiveClaimConditionForWallet(
    contract,
    address
  );
  const claimerProofs = useClaimerProofs(contract, address || "");
  const claimIneligibilityReasons = useClaimIneligibilityReasons(contract, {
    quantity,
    walletAddress: address || "",
  });

  const numberClaimed = BigNumber.from(claimedSupply || 0).toString();
  const numberTotal = BigNumber.from(claimedSupply || 0)
    .add(BigNumber.from(unclaimedSupply || 0))
    .toString();

  const priceToMint = useMemo(() => {
    const bnPrice = BigNumber.from(
      activeClaimCondition.data?.currencyMetadata.value || 0
    );
    return `${utils.formatUnits(
      bnPrice.mul(quantity).toString(),
      activeClaimCondition.data?.currencyMetadata.decimals || 18
    )} ${activeClaimCondition.data?.currencyMetadata.symbol}`;
  }, [
    activeClaimCondition.data?.currencyMetadata.decimals,
    activeClaimCondition.data?.currencyMetadata.symbol,
    activeClaimCondition.data?.currencyMetadata.value,
    quantity,
  ]);

  const maxClaimable = useMemo(() => {
    let bnMaxClaimable;
    try {
      bnMaxClaimable = BigNumber.from(
        activeClaimCondition.data?.maxClaimableSupply || 0
      );
    } catch (e) {
      bnMaxClaimable = BigNumber.from(1_000_000);
    }

    let perTransactionClaimable;
    try {
      perTransactionClaimable = BigNumber.from(
        activeClaimCondition.data?.maxClaimablePerWallet || 0
      );
    } catch (e) {
      perTransactionClaimable = BigNumber.from(1_000_000);
    }

    if (perTransactionClaimable.lte(bnMaxClaimable)) {
      bnMaxClaimable = perTransactionClaimable;
    }

    const snapshotClaimable = claimerProofs.data?.maxClaimable;

    if (snapshotClaimable) {
      if (snapshotClaimable === "0") {
        // allowed unlimited for the snapshot
        bnMaxClaimable = BigNumber.from(1_000_000);
      } else {
        try {
          bnMaxClaimable = BigNumber.from(snapshotClaimable);
        } catch (e) {
          // fall back to default case
        }
      }
    }

    const maxAvailable = BigNumber.from(unclaimedSupply || 0);

    let max;
    if (maxAvailable.lt(bnMaxClaimable)) {
      max = maxAvailable;
    } else {
      max = bnMaxClaimable;
    }

    if (max.gte(1_000_000)) {
      return 1_000_000;
    }
    return max.toNumber();
  }, [
    claimerProofs.data?.maxClaimable,
    unclaimedSupply,
    activeClaimCondition.data?.maxClaimableSupply,
    activeClaimCondition.data?.maxClaimablePerWallet,
  ]);

  const isOpenEdition = useMemo(() => {
    if (contract) {
      const contractWrapper = // @ts-ignore
        (contract as any).contractWrapper as ContractWrapper<any>;

      const featureDetected = detectContractFeature(
        contractWrapper,
        "ERC721SharedMetadata"
      );

      return featureDetected;
    }
    return false;
  }, [contract]);

  const isSoldOut = useMemo(() => {
    try {
      return (
        (activeClaimCondition.isSuccess &&
          BigNumber.from(activeClaimCondition.data?.availableSupply || 0).lte(
            0
          )) ||
        (numberClaimed === numberTotal && !isOpenEdition)
      );
    } catch (e) {
      return false;
    }
  }, [
    activeClaimCondition.data?.availableSupply,
    activeClaimCondition.isSuccess,
    numberClaimed,
    numberTotal,
    isOpenEdition,
  ]);

  const canClaim = useMemo(() => {
    return (
      activeClaimCondition.isSuccess &&
      claimIneligibilityReasons.isSuccess &&
      claimIneligibilityReasons.data?.length === 0 &&
      !isSoldOut
    );
  }, [
    activeClaimCondition.isSuccess,
    claimIneligibilityReasons.data?.length,
    claimIneligibilityReasons.isSuccess,
    isSoldOut,
  ]);

  const isLoading = useMemo(() => {
    return activeClaimCondition.isLoading || !contract;
  }, [activeClaimCondition.isLoading, contract]);

  const buttonLoading = useMemo(
    () => isLoading || claimIneligibilityReasons.isLoading,
    [claimIneligibilityReasons.isLoading, isLoading]
  );

  const buttonText = useMemo(() => {
    if (isSoldOut) {
      return "Sold Out";
    }

    if (canClaim) {
      const pricePerToken = BigNumber.from(
        activeClaimCondition.data?.currencyMetadata.value || 0
      );
      if (pricePerToken.eq(0)) {
        return "Mint (Free)";
      }
      return `Mint (${priceToMint})`;
    }
    if (claimIneligibilityReasons.data?.length) {
      return parseIneligibility(claimIneligibilityReasons.data, quantity);
    }
    if (buttonLoading) {
      return "Checking eligibility...";
    }

    return "Minting not available";
  }, [
    isSoldOut,
    canClaim,
    claimIneligibilityReasons.data,
    buttonLoading,
    activeClaimCondition.data?.currencyMetadata.value,
    priceToMint,
    quantity,
  ]);

  const dropNotReady =
    claimConditions?.length === 0 ||
    claimConditions?.every((cc) => cc.maxClaimableSupply === "0");

  const dropStartingSoon = useMemo(
    () =>
      (claimConditions &&
        claimConditions.length > 0 &&
        activeClaimCondition.isError) ||
      (activeClaimCondition.data &&
        activeClaimCondition.data.startTime > new Date()),
    [activeClaimCondition.data, activeClaimCondition.isError]
  );

  console.log({
    maxClaimable,
    priceToMint,
    numberTotal,
    numberClaimed,
    activeClaimCondition: activeClaimCondition.data,
    claimerProofs: claimerProofs.data,
    claimIneligibilityReasons: claimIneligibilityReasons.data,
    isOpenEdition,
    isSoldOut,
    canClaim,
  });
  return (
    <>
      <div className="navbar bg-base-100">
        <div className="flex-1">
          <a className="btn btn-ghost normal-case text-xl">NFT Drop</a>
        </div>
        <div className="flex-none">
          <ConnectWallet />
        </div>
      </div>
      <div className="flex flex-row flex-wrap justify-center mx-auto gap-5 py-6 px-3">
        <img
          src={contractMetadata.image || firstNft?.metadata.image || ""}
          alt=""
          className="w-[200px] h-[200px] rounded-2xl my-auto border border-gray-500"
        />
        <div className="my-auto">
          <div className="text-3xl">{contractMetadata.name}</div>
          {contractMetadata.description && (
            <div
              className="lg:max-w-[600px] max-h-[150px] overflow-y-auto"
              dangerouslySetInnerHTML={{
                __html: contractMetadata.description.replace(/\n/g, "<br />"),
              }}
            ></div>
          )}
        </div>
      </div>
      <div className="flex h-11 w-full lg:max-w-[320px] max-w-[90vw] mx-auto rounded-lg border border-gray-500 px-2 dark:border-gray-800">
        <button
          onClick={() => {
            const value = quantity - 1;
            if (value > maxClaimable) {
              setQuantity(maxClaimable);
            } else if (value < 1) {
              setQuantity(1);
            } else {
              setQuantity(value);
            }
          }}
          className="flex h-full items-center justify-center rounded-l-md px-2 text-center text-2xl disabled:cursor-not-allowed disabled:text-gray-500 dark:text-white dark:disabled:text-gray-600"
          disabled={isSoldOut || quantity - 1 < 1}
        >
          -
        </button>
        <p className="flex h-full w-full items-center justify-center text-center dark:text-white lg:w-full">
          {!isLoading && isSoldOut ? "Sold Out" : quantity}
        </p>
        <button
          onClick={() => {
            const value = quantity + 1;
            if (value > maxClaimable) {
              setQuantity(maxClaimable);
            } else if (value < 1) {
              setQuantity(1);
            } else {
              setQuantity(value);
            }
          }}
          className={
            "flex h-full items-center justify-center rounded-r-md px-2 text-center text-2xl disabled:cursor-not-allowed disabled:text-gray-500 dark:text-white dark:disabled:text-gray-600"
          }
          disabled={isSoldOut || quantity + 1 > maxClaimable}
        >
          +
        </button>
      </div>
      <div className="flex flex-col gap-2 xs:gap-4 mx-auto mt-6">
        {isLoading ? (
          <div
            role="status"
            className="animate-pulse space-y-8 md:flex md:items-center md:space-x-8 md:space-y-0"
          >
            <div className="w-full">
              <div className="h-10 w-24 rounded-full bg-gray-200 dark:bg-gray-700"></div>
            </div>
          </div>
        ) : isOpenEdition ? null : (
          <p>
            <span className="text-lg font-bold tracking-wider text-gray-500 xs:text-xl lg:text-2xl">
              {numberClaimed}
            </span>{" "}
            <span className="text-lg font-bold tracking-wider xs:text-xl lg:text-2xl">
              / {numberTotal} minted
            </span>
          </p>
        )}
      </div>
      <div className="flex w-full gap-4">
        {dropNotReady ? (
          <span className="text-red-500">
            This drop is not ready to be minted yet. (No claim condition set)
          </span>
        ) : dropStartingSoon ? (
          <span className="text-gray-500">
            Drop is starting soon. Please check back later.
          </span>
        ) : (
          <div className="flex w-full flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-4 mx-auto">
              <Web3Button
                contractAddress={contract?.getAddress() || ""}
                action={(cntr) => cntr.erc721.claim(quantity)}
                isDisabled={!canClaim || buttonLoading}
                onError={(err) => {
                  console.error(err);
                  console.log({ err });
                  //   toast({
                  //     title: "Failed to mint drop",
                  //     description: (err as any).reason || "",
                  //     duration: 9000,
                  //     variant: "destructive",
                  //   });
                }}
                onSuccess={() => {
                  //   toast({
                  //     title: "Successfully minted",
                  //     description:
                  //       "The NFT has been transferred to your wallet",
                  //     duration: 5000,
                  //     className: "bg-green-500",
                  //   });
                }}
              >
                {buttonLoading ? (
                  <div role="status">
                    <svg
                      aria-hidden="true"
                      className="mr-2 h-4 w-4 animate-spin fill-blue-600 text-gray-200 dark:text-gray-600"
                      viewBox="0 0 100 101"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                        fill="currentColor"
                      />
                      <path
                        d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                        fill="currentFill"
                      />
                    </svg>
                    <span className="sr-only">Loading...</span>
                  </div>
                ) : (
                  buttonText
                )}
              </Web3Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
