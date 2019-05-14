const readline = require('readline');
const { Client, providers, crypto } = require('@liquality/chainabstractionlayer')
const LN = require('./ln')
const networks = providers.bitcoin.networks

const waitForInput = async () => {
  const rl = readline.createInterface({input: process.stdin, output: process.stdout});

  return new Promise(resolve => rl.question('', ans => {
    rl.close();
    resolve(ans);
  }))
}

const bitcoin = new Client()
bitcoin.addProvider(new providers.bitcoin.BitcoreRPCProvider('http://localhost:18332', 'bitcoin', 'local321'))
bitcoin.addProvider(new providers.bitcoin.BitcoinJsLibSwapProvider({ network: networks.bitcoin_testnet }))

const lnA = new LN('https://localhost:8886/v1', '<admin.macaroon>')
const lnB = new LN('https://localhost:8883/v1', '<admin.macaroon>')

async function run () {
  const secret = await bitcoin.generateSecret('test')
  const secretHash = crypto.sha256(secret)
  const recipientAddress = (await bitcoin.getUnusedAddress()).address
  const refundAddress = (await bitcoin.getUnusedAddress()).address
  const expiration = 1557400000
  const value = 50000

  const initiationTxHash = await bitcoin.initiateSwap(value, recipientAddress, refundAddress, secretHash, expiration)
  console.log(`A: I locked BTC. TX: ${initiationTxHash}`)
  await bitcoin.generateBlock(1)
  const invoice = await lnA.addInvoice(value.toString(), 'Swap', secret)
  console.log(`A: Pay me for the secret. Invoice ${invoice.payment_request}`)
  await waitForInput()
  console.log(`B: I can see from the invoice that the secret hash and amount matches the bitcoin smart contract`)
  console.log(`B: So I'll pay the invoice`)
  await waitForInput()
  const payment = await lnB.payInvoice(invoice.payment_request)
  const secretFromPayment = Buffer.from(payment.payment_preimage, 'base64').toString('hex')
  console.log(`B: Paying the invoice got me the secret! ${secretFromPayment}`)
  console.log(`B: Now I can claim my funds from the smart contract`)
  const claimTxHash = await bitcoin.claimSwap(initiationTxHash, recipientAddress, refundAddress, secretFromPayment, expiration)
  await waitForInput()
  await bitcoin.generateBlock(1)
  const revealedSecret = await bitcoin.getSwapSecret(claimTxHash)
  console.log(`A: I don't have to do anything. The LN payment is one step!`)
}

(async () => {
  await run()
})()

