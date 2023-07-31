import NftDrop from "@/src/components/NftDrop";
import ThirdwebProviderWrapper from "@/src/components/ThirdwebProviderWrapper";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { notFound } from "next/navigation";

type Props = {
  //   params: { collectionName: string; tokenId: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function Page({ searchParams }: Props) {
  let { contractAddress, network } = searchParams;
  if (!contractAddress || !network) return notFound();
  contractAddress = String(contractAddress);
  network = String(network);
  const sdk = new ThirdwebSDK(network);
  const contract = await sdk.getContract(contractAddress);
  if (!contract.erc721) return notFound();
  const [
    contractMetadata,
    claimConditions,
    firstNft,
    claimedSupply,
    unclaimedSupply,
  ] = await Promise.all([
    contract.metadata.get(),
    contract.erc721.claimConditions.getAll(),
    contract.erc721.get(0),
    contract.erc721.totalClaimedSupply(),
    contract.erc721.totalUnclaimedSupply(),
  ]);
  return (
    <>
      <ThirdwebProviderWrapper activeChain={network}>
        <NftDrop
          contractAddress={contractAddress}
          contractMetadata={contractMetadata}
          claimConditions={claimConditions}
          firstNft={firstNft}
          claimedSupply={claimedSupply}
          unclaimedSupply={unclaimedSupply}
        />
      </ThirdwebProviderWrapper>
    </>
  );
}
