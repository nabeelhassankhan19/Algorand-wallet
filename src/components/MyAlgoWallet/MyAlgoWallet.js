import React, { useState, useEffect, useRef } from 'react'
import { loadStdlib } from '@reach-sh/stdlib'
import MyAlgoConnect from '@reach-sh/stdlib/ALGO_MyAlgoConnect';
import ConnectWalletButton from './ConnectButton/ConnectWalletBtn';
import TransferFund from './Transferfund';
import FundAccount from './FundWallet';
import myalgo from '../../assets/images/myaglo-logo.png'
import { MyAlgoWalletMain } from './MyAlgoWallet.styles';
import algosdk from 'algosdk';
import { readFile } from 'fs';
const reach = loadStdlib("ALGO")

reach.setWalletFallback(reach.walletFallback({
  providerEnv: 'TestNet', MyAlgoConnect
}));

const MyAlgoWallet = () => {

  const account = useRef()
  const balance = useRef()


  const [accountBal, setAccountBal] = useState(0);
  const [accountAddress, setAccountAddress] = useState('');


  const connectWallet = async () => {
    try {
      await getAccount()
      await getBalance()

    } catch (err) {
      console.log(err)
    }
  }

  const getAccount = async () => {
    try {
      account.current = await reach.getDefaultAccount()
      setAccountAddress(account.current.networkAccount.addr)
      console.log("Account :" + account.current.networkAccount.addr)
    } catch (err) {
      console.log(err)
    }
  }

  const getBalance = async () => {
    try {
      let rawBalance = await reach.balanceOf(account.current)
      balance.current = reach.formatCurrency(rawBalance, 4)
      setAccountBal(balance.current)
      console.log("Balance :" + balance.current)
    } catch (err) {
      console.log(err)
    }

  }


  async function destroyAsset(algodClient, alice, assetID) {
    console.log("");
    console.log("==> DESTROY ASSET");
    // All of the created assets should now be back in the creators
    // Account so we can delete the asset.
    // If this is not the case the asset deletion will fail
    const params = await algodClient.getTransactionParams().do();
    // Comment out the next two lines to use suggested fee
    // params.fee = 1000;
    // params.flatFee = true;
    // The address for the from field must be the manager account
    const addr = alice.addr;
    // if all assets are held by the asset creator,
    // the asset creator can sign and issue "txn" to remove the asset from the ledger.
    const txn = algosdk.makeAssetDestroyTxnWithSuggestedParamsFromObject({
      from: addr,
      note: undefined,
      assetIndex: assetID,
      suggestedParams: params,
    });
    // The transaction must be signed by the manager which
    // is currently set to alice
    const rawSignedTxn = txn.signTxn(alice.sk);
    const tx = await algodClient.sendRawTransaction(rawSignedTxn).do();
    // Wait for confirmation
    const confirmedTxn = await algosdk.waitForConfirmation(
      algodClient,
      tx.txId,
      4
    );
    //Get the completed Transaction
    console.log(
      "Transaction " +
      tx.txId +
      " confirmed in round " +
      confirmedTxn["confirmed-round"]
    );
    // The account3 and account1 should no longer contain the asset as it has been destroyed
    console.log("Asset ID: " + assetID);
    console.log("Alice = " + alice.addr);
    await printCreatedAsset(algodClient, alice.addr, assetID);
    await printAssetHolding(algodClient, alice.addr, assetID);

    return;
    // Notice that although the asset was destroyed, the asset id and associated
    // metadata still exists in account holdings for any account that optin.
    // When you destroy an asset, the global parameters associated with that asset
    // (manager addresses, name, etc.) are deleted from the creator's account.
    // However, holdings are not deleted automatically -- users still need to
    // use the closeToAccount on the call makePaymentTxnWithSuggestedParams of the deleted asset.
    // This is necessary for technical reasons because we currently can't have a single transaction touch potentially
    // thousands of accounts (all the holdings that would need to be deleted).

    // ==> DESTROY ASSET
    // Transaction QCE52AAX75VBSGDL36VHMNVT6LXSR5M6V5JUNSKE6BXQGLQEMLDA confirmed in round 16833536
    // Asset ID: 28291127
    // Alice = RA6RAUNDQGHRWTCR5YRL2YJMIXTHWD5S3ZYHVBGSNA76AVBAYELSNRVKEI
    // Bob = YC3UYV4JLHD344OC3G7JK37DRVSE7X7U2NOZVWSQNVKNEGV4M3KFA7WZ44
  }

  const printAssetHolding = async function (algodClient, account, assetid) {
    // note: if you have an indexer instance available it is easier to just use this
    //     let accountInfo = await indexerClient.searchAccounts()
    //    .assetID(assetIndex).do();
    // and in the loop below use this to extract the asset for a particular account
    // accountInfo['accounts'][idx][account]);
    let accountInfo = await algodClient.accountInformation(account).do();
    for (let idx = 0; idx < accountInfo["assets"].length; idx++) {
      let scrutinizedAsset = accountInfo["assets"][idx];
      if (scrutinizedAsset["asset-id"] == assetid) {
        let myassetholding = JSON.stringify(scrutinizedAsset, undefined, 2);
        console.log("assetholdinginfo = " + myassetholding);
        break;
      }
    }
  };

  const printCreatedAsset = async function (algodClient, account, assetid) {
    // note: if you have an indexer instance available it is easier to just use this
    //     let accountInfo = await indexerClient.searchAccounts()
    //    .assetID(assetIndex).do();
    // and in the loop below use this to extract the asset for a particular account
    // accountInfo['accounts'][idx][account]);
    let accountInfo = await algodClient.accountInformation(account).do();
    for (let idx = 0; idx < accountInfo["created-assets"].length; idx++) {
      let scrutinizedAsset = accountInfo["created-assets"][idx];
      if (scrutinizedAsset["index"] == assetid) {
        console.log("AssetID = " + scrutinizedAsset["index"]);
        let myparms = JSON.stringify(scrutinizedAsset["params"], undefined, 2);
        console.log("parms = " + myparms);
        break;
      }
    }
  };
  async function createAsset(algodClient, alice) {
    console.log("");
    console.log("==> CREATE ASSET");
    //Check account balance
    const accountInfo = await algodClient.accountInformation(alice).do();
    const startingAmount = accountInfo.amount;
    console.log("Your account balance: %d microAlgos", startingAmount);

    // Construct the transaction
    const params = await algodClient.getTransactionParams().do();
    // comment out the next two lines to use suggested fee
    params.fee = 1000;
    params.flatFee = true;
    // const closeout = receiver; //closeRemainderTo
    // WARNING! all remaining funds in the sender account above will be sent to the closeRemainderTo Account
    // In order to keep all remaining funds in the sender account after tx, set closeout parameter to undefined.
    // For more info see:
    // https://developer.algorand.org/docs/reference/transactions/#payment-transaction
    // Asset creation specific parameters
    // The following parameters are asset specific
    // Throughout the example these will be re-used.

    // Whether user accounts will need to be unfrozen before transacting
    const defaultFrozen = false;
    // Used to display asset units to user
    const unitName = "ALICEART";
    // Friendly name of the asset
    const assetName = "Alice's Artwork@arc3";
    // Optional string pointing to a URL relating to the asset
    const url = "https://s3.amazonaws.com/your-bucket/metadata.json";
    // Optional hash commitment of some sort relating to the asset. 32 character length.
    // metadata can define the unitName and assetName as well.
    // see ASA metadata conventions here: https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0003.md

    // The following parameters are the only ones
    // that can be changed, and they have to be changed
    // by the current manager
    // Specified address can change reserve, freeze, clawback, and manager
    // If they are set to undefined at creation time, you will not be able to modify these later
    const managerAddr = alice; // OPTIONAL: FOR DEMO ONLY, USED TO DESTROY ASSET WITHIN
    // Specified address is considered the asset reserve
    // (it has no special privileges, this is only informational)
    const reserveAddr = undefined;
    // Specified address can freeze or unfreeze user asset holdings
    const freezeAddr = undefined;
    // Specified address can revoke user asset holdings and send
    // them to other addresses
    const clawbackAddr = undefined;

    // Use actual total  > 1 to create a Fungible Token
    // example 1:(fungible Tokens)
    // totalIssuance = 10, decimals = 0, result is 10 total actual
    // example 2: (fractional NFT, each is 0.1)
    // totalIssuance = 10, decimals = 1, result is 1.0 total actual
    // example 3: (NFT)
    // totalIssuance = 1, decimals = 0, result is 1 total actual
    // integer number of decimals for asset unit calculation
    const decimals = 0;
    const total = 1; // how many of this asset there will be

    // temp fix for replit
    //const metadata2 = "16efaa3924a6fd9d3a4824799a4ac65d";

    const fullPath = __dirname + "/NFT/metadata.json";
    const metadatafile = await readFile(fullPath);
    //    const metadatafile = (await fs.readFileSync(fullPath)).toString();
    const hash = crypto.createHash("sha256");
    hash.update(metadatafile);

    // replit error  - work around
    // const metadata = "16efaa3924a6fd9d3a4824799a4ac65d";
    // replit error  - the following only runs in debug mode in replit, and use this in your code
    const metadata = new Uint8Array(hash.digest()); // use this in your code

    const fullPathImage = __dirname + "/NFT/alice-nft.png";
    //    const metadatafileImage = (await fs.readFileSync(fullPathImage));
    const metadatafileImage = await readFile(fullPathImage);
    const hashImage = crypto.createHash("sha256");
    hashImage.update(metadatafileImage);
    const hashImageBase64 = hashImage.digest("base64");
    const imageIntegrity = "sha256-" + hashImageBase64;

    // use this in yout metadata.json file
    console.log("image_integrity : " + imageIntegrity);

    // signing and sending "txn" allows "addr" to create an asset
    const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
      from: alice.addr,
      total,
      decimals,
      assetName,
      unitName,
      assetURL: url,
      assetMetadataHash: metadata,
      defaultFrozen,
      freeze: freezeAddr,
      manager: managerAddr,
      clawback: clawbackAddr,
      reserve: reserveAddr,
      suggestedParams: params,
    });

    const rawSignedTxn = txn.signTxn(alice.sk);
    const tx = await algodClient.sendRawTransaction(rawSignedTxn).do();
    let assetID = null;
    // wait for transaction to be confirmed
    const confirmedTxn = await algosdk.waitForConfirmation(
      algodClient,
      tx.txId,
      4
    );
    //Get the completed Transaction
    console.log(
      "Transaction " +
      tx.txId +
      " confirmed in round " +
      confirmedTxn["confirmed-round"]
    );
    assetID = confirmedTxn["asset-index"];
    // console.log("AssetID = " + assetID);

    await printCreatedAsset(algodClient, alice.addr, assetID);
    await printAssetHolding(algodClient, alice.addr, assetID);
    console.log(
      "You can verify the metadata-hash above in the asset creation details"
    );
    console.log(
      "Using terminal the Metadata hash should appear as identical to the output of"
    );
    console.log(
      "cat aliceAssetMetaData.json | openssl dgst -sha256 -binary | openssl base64 -A"
    );
    console.log("That is: Cii04FOHWE4NiXQ4s4J02we2gnJop5dOfdkBvUoGHQ8=");

    return { assetID };

    // Sample Output similar to
    // ==> CREATE ASSET
    // Alice account balance: 10000000 microAlgos
    // Transaction DM2QAJQ34AHOIH2XPOXB3KDDMFYBTSDM6CGO6SCM6A6VJYF5AUZQ confirmed in round 16833515
    // AssetID = 28291127
    // parms = {
    //   "clawback": "RA6RAUNDQGHRWTCR5YRL2YJMIXTHWD5S3ZYHVBGSNA76AVBAYELSNRVKEI",
    //   "creator": "RA6RAUNDQGHRWTCR5YRL2YJMIXTHWD5S3ZYHVBGSNA76AVBAYELSNRVKEI",
    //   "decimals": 0,
    //   "default-frozen": false,
    //   "freeze": "RA6RAUNDQGHRWTCR5YRL2YJMIXTHWD5S3ZYHVBGSNA76AVBAYELSNRVKEI",
    //   "manager": "RA6RAUNDQGHRWTCR5YRL2YJMIXTHWD5S3ZYHVBGSNA76AVBAYELSNRVKEI",
    //   "metadata-hash": "WQ4GxK4WqdklhWD9zJMfYH+Wgk+rTnqJIdW08Y7eD1U=",
    //   "name": "Alice's Artwork Coins",
    //   "name-b64": "QWxpY2UncyBBcnR3b3JrIENvaW5z",
    //   "reserve": "RA6RAUNDQGHRWTCR5YRL2YJMIXTHWD5S3ZYHVBGSNA76AVBAYELSNRVKEI",
    //   "total": 999,
    //   "unit-name": "ALICECOI",
    //   "unit-name-b64": "QUxJQ0VDT0k=",
    //   "url": "http://someurl",
    //   "url-b64": "aHR0cDovL3NvbWV1cmw="
    // }
    // assetholdinginfo = {
    //   "amount": 999,
    //   "asset-id": 28291127,
    //   "creator": "RA6RAUNDQGHRWTCR5YRL2YJMIXTHWD5S3ZYHVBGSNA76AVBAYELSNRVKEI",
    //   "is-frozen": false
    // }
  }


  // async function createNFT() {
  //     try {
  //       let alice = accountAddress;
  //       console.log("Press any key when the account is funded");
  //       await keypress();
  //       // Connect your client
  //       // const algodToken = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  //       // const algodServer = 'http://localhost';
  //       // const algodPort = 4001;
  //       const algodToken =
  //         "2f3203f21e738a1de6110eba6984f9d03e5a95d7a577b34616854064cf2c0e7b";
  //       const algodServer = "https://testnet-api.algonode.cloud";
  //       const algodPort = 443;

  //       let algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

  //       // CREATE ASSET
  //       const { assetID } = await createAsset(algodClient, alice);
  //       // DESTROY ASSET
  //       await destroyAsset(algodClient, alice, assetID);
  //       // CLOSEOUT ALGOS - Alice closes out Alogs to dispenser
  //       await closeoutAliceAlgos(algodClient, alice);
  //     } catch (err) {
  //       console.log("err", err);
  //     }
  //     process.exit();
  //   }
  return (
    <MyAlgoWalletMain>
      <img src={myalgo} alt="My Algo" height="70px" />
      <ConnectWalletButton accountAddress={accountAddress} connectWallet={connectWallet} accountBal={accountBal} />
      <TransferFund account={account} getBalance={getBalance} />
      <FundAccount account={account} getBalance={getBalance} />
    </MyAlgoWalletMain>
  )
}

export default MyAlgoWallet