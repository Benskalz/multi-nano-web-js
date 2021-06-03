import BigNumber from 'bignumber.js'
//@ts-ignore
import { blake2b } from 'blakejs'

import Ed25519 from './ed25519'
import NanoAddress from './nano-address'
import NanoConverter from './nano-converter'
import Signer from './signer'
import Convert from './util/convert'

export default class BlockSigner {

	nanoAddress = new NanoAddress()
	ed25519 = new Ed25519()
	signer = new Signer()

	preamble: string = 0x6.toString().padStart(64, '0')

	/**
	 * Sign a receive block
	 *
	 * @param {ReceiveBlock} data The data required to sign a receive block
	 * @param {string} privateKey Private key to sign the data with
	 * @returns {SignedBlock} the signed block to publish to the blockchain
	 */
	receive(data: ReceiveBlock, privateKey: string): SignedBlock {
		const validateInputRaw = (input: string) => !!input && !isNaN(+input)
		if (!validateInputRaw(data.walletBalanceRaw)) {
			throw new Error('Invalid format in wallet balance')
		}

		if (!validateInputRaw(data.amountRaw)) {
			throw new Error('Invalid format in send amount')
		}

		if (!this.nanoAddress.validateNanoAddress(data.toAddress)) {
			throw new Error('Invalid toAddress')
		}

		if (!this.nanoAddress.validateNanoAddress(data.representativeAddress)) {
			throw new Error('Invalid representativeAddress')
		}

		if (!data.transactionHash) {
			throw new Error('No transaction hash')
		}

		if (!data.frontier) {
			throw new Error('No frontier')
		}

		if (!privateKey) {
			throw new Error('Please input the private key to sign the block')
		}

		const balanceNano = NanoConverter.convert(data.walletBalanceRaw, 'RAW', 'NANO')
		const amountNano = NanoConverter.convert(data.amountRaw, 'RAW', 'NANO')
		const newBalanceNano = new BigNumber(balanceNano).plus(new BigNumber(amountNano))
		const newBalanceRaw = NanoConverter.convert(newBalanceNano, 'NANO', 'RAW')
		const newBalanceHex = Convert.dec2hex(newBalanceRaw, 16).toUpperCase()
		const account = this.nanoAddress.nanoAddressToHexString(data.toAddress)
		const link = data.transactionHash
		const representative = this.nanoAddress.nanoAddressToHexString(data.representativeAddress)

		const signature = this.signer.sign(
				privateKey,
				this.preamble,
				account,
				data.frontier,
				representative,
				newBalanceHex,
				link)

		return {
			type: 'state',
			account: data.toAddress,
			previous: data.frontier,
			representative: data.representativeAddress,
			balance: newBalanceRaw,
			link: link,
			signature: signature,
			work: data.work || '',
		}
	}

	/**
	 * Sign a send block
	 *
	 * @param {SendBlock} data The data required to sign a send block
	 * @param {string} privateKey Private key to sign the data with
	 * @returns {SignedBlock} the signed block to publish to the blockchain
	 */
	send(data: SendBlock, privateKey: string): SignedBlock {
		const validateInputRaw = (input: string) => !!input && !isNaN(+input)
		if (!validateInputRaw(data.walletBalanceRaw)) {
			throw new Error('Invalid format in wallet balance')
		}

		if (!validateInputRaw(data.amountRaw)) {
			throw new Error('Invalid format in send amount')
		}

		if (!this.nanoAddress.validateNanoAddress(data.toAddress)) {
			throw new Error('Invalid toAddress')
		}

		if (!this.nanoAddress.validateNanoAddress(data.fromAddress)) {
			throw new Error('Invalid fromAddress')
		}

		if (!this.nanoAddress.validateNanoAddress(data.representativeAddress)) {
			throw new Error('Invalid representativeAddress')
		}

		if (!data.frontier) {
			throw new Error('Frontier is not set')
		}

		if (!privateKey) {
			throw new Error('Please input the private key to sign the block')
		}

		const balanceNano = NanoConverter.convert(data.walletBalanceRaw, 'RAW', 'NANO')
		const amountNano = NanoConverter.convert(data.amountRaw, 'RAW', 'NANO')
		const newBalanceNano = new BigNumber(balanceNano).minus(new BigNumber(amountNano))
		const newBalanceRaw = NanoConverter.convert(newBalanceNano, 'NANO', 'RAW')
		const newBalanceHex = Convert.dec2hex(newBalanceRaw, 16).toUpperCase()
		const account = this.nanoAddress.nanoAddressToHexString(data.fromAddress)
		const link = this.nanoAddress.nanoAddressToHexString(data.toAddress)
		const representative = this.nanoAddress.nanoAddressToHexString(data.representativeAddress)

		const signature = this.signer.sign(
				privateKey,
				this.preamble,
				account,
				data.frontier,
				representative,
				newBalanceHex,
				link)

		return {
			type: 'state',
			account: data.fromAddress,
			previous: data.frontier,
			representative: data.representativeAddress,
			balance: newBalanceRaw,
			link: link,
			signature: signature,
			work: data.work || '',
		}
	}

}

export interface ReceiveBlock {
	walletBalanceRaw: string
	toAddress: string
	transactionHash: string
	frontier: string
	representativeAddress: string
	amountRaw: string
	work?: string
}

export interface SendBlock {
	walletBalanceRaw: string
	fromAddress: string
	toAddress: string
	representativeAddress: string
	frontier: string
	amountRaw: string
	work?: string
}

export interface RepresentativeBlock {
	walletBalanceRaw: string
	address: string
	representativeAddress: string
	frontier: string
	work?: string
}

export interface SignedBlock extends BlockData {
	type: 'state'
	work?: string
}

export interface BlockData {
	account: string
	previous: string
	representative: string
	balance: string
	link: string
	signature: string
}
