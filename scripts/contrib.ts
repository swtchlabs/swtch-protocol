// const { ethers } = require("ethers");

async function signContribution(contentHash:string, contributorAddress:string, contributionTypeId:number) {
    const provider = new ethers.providers.JSONProvider("http://127.0.0.1:8545");
    const signer = provider.getSigner();
    
    const message = ethers.utils.solidityKeccak256(["string", "address", "uint256"], [contentHash, contributorAddress, contributionTypeId]);
    const signature = await signer.signMessage(ethers.utils.arrayify(message));
    
    return { contentHash, contributorAddress, contributionTypeId, signature };
}

// How the signing process should be implemented on the front end.
(async () => {
    const contentHash = "content123"; // replace with actual content hash
    const contributorAddress = "0xe688b84b23f322a994A53dbF8E15FA82CDB71127"; // replace with actual contributor address
    const contributionTypeId = 1; // replace with actual contribution type ID
    const signedContribution = await signContribution(contentHash, contributorAddress, contributionTypeId);
    console.log(signedContribution);
})();
