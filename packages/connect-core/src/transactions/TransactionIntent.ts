import { ethers } from 'ethers'

import TransactionPath from './TransactionPath'
import TransactionRequest from './TransactionRequest'
import Organization from '../entities/Organization'
import { calculateTransactionPath, calculateTransactionPaths } from '../utils/path/calculatePath'
import { describeTransactionPath } from '../utils/descriptions'

export interface TransactionIntentData {
  contractAddress: string
  functionName: string
  functionArgs: any[]
}

export default class TransactionIntent {
  readonly contractAddress!: string
  readonly functionName!: string
  readonly functionArgs!: any[]

  #org: Organization
  #provider: ethers.providers.Provider

  constructor(
    data: TransactionIntentData,
    org: Organization,
    provider: ethers.providers.Provider
  ) {
    this.#org = org
    this.#provider = provider

    this.contractAddress = data.contractAddress
    this.functionArgs = data.functionArgs
    this.functionName = data.functionName
  }

  async path(
    account: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: { as?: string; path?: string[] }
  ): Promise<TransactionPath> {
    const apps = await this.#org.apps()

    const {
      forwardingFeePretransaction,
      path,
    } = await calculateTransactionPath(
      account,
      this.contractAddress,
      this.functionName,
      this.functionArgs,
      apps,
      this.#provider
    )

    const describedPath = await describeTransactionPath(
      path,
      apps,
      this.#provider
    )

    return new TransactionPath({
      apps: apps.filter(app =>
        path
          .map(transaction => transaction.to)
          .some(address => address === app.address)
      ),
      destination: apps.find(app => app.address == this.contractAddress)!,
      forwardingFeePretransaction,
      transactions: describedPath,
    })
  }


  async paths(
    account: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: { as?: string; path?: string[] }
  ): Promise<TransactionPath[] | undefined> {
    const transactionPaths: TransactionPath[] = [];
    const apps = await this.#org.apps()

    const paths = await calculateTransactionPaths(
      account,
      this.contractAddress,
      this.functionName,
      this.functionArgs,
      apps,
      this.#provider
    )

    for (let i = 0; i < paths.length; i++) {
      const describedPath = await describeTransactionPath(
        paths[i].path,
        apps,
        this.#provider
      )

      transactionPaths.push(
        new TransactionPath({
          apps: apps.filter(app =>
            paths[i].path
              .map(transaction => transaction.to)
              .some(address => address === app.address)
          ),
          destination: apps.find(app => app.address == this.contractAddress)!,
          forwardingFeePretransaction: paths[i].forwardingFeePretransaction,
          transactions: describedPath,
        })
      )

      if (i === paths.length - 1) {
        return transactionPaths;
      }
    }
  }

  async transactions(
    account: string,
    options?: { as: string; path?: string[] }
  ): Promise<TransactionRequest[]> {
    return (await this.path(account, options)).transactions
  }
}
