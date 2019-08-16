#! /usr/bin/env node

import EtherscanParser from './etherscanParser'
import { parseUmlClassesFromFiles } from './fileParser'
import { UmlClass} from './umlClass'

const debug = require('debug')('sol2uml')

const program = require('commander')

program
  .usage(`<fileFolderAddress> [options]

Generates UML diagrams from Solidity source code.
If no file, folder or address is passes as the first argument, the working folder is used.
When a folder is used, all *.sol files are found in that folder and all sub folders.
If an Ethereum address with a 0x prefix is passed, the verified source code from Etherscan will be used.`)
  .option('-v, --verbose', 'run with debugging statements')
  .option('-f, --outputFormat <value>', 'output file format: svg, png, dot or all', 'svg')
  .option('-o, --outputFileName <value>', 'output file name')
  .option('-d, --depthLimit <depth>', 'number of sub folders that will be recursively searched for Solidity files. Default -1 is unlimited', -1)
  .option('-n, --network <network>', 'mainnet, ropsten, kovan, rinkeby or goerli', 'mainnet')
  .option('-k, --etherscanApiKey <key>', 'Etherscan API Key')
  .option('-c, --clusterFolders', 'cluster contracts into source folders')
  .parse(process.argv)

if (program.verbose) {
  process.env.DEBUG = 'sol2uml'
}

// This function needs to be loaded after the DEBUG env variable has been set
import { convertUmlClasses } from './converter'

async function sol2uml() {

  let fileFolderAddress: string
  if(program.args.length === 0) {
    fileFolderAddress = process.cwd()
  }
  else {
    fileFolderAddress = program.args[0]
  }

  let umlClasses: UmlClass[]
  if (fileFolderAddress.match(/^0x([A-Fa-f0-9]{40})$/)) {
    debug(`argument ${fileFolderAddress} is an Ethereum address so checking Etherscan for the verified source code`)

    const etherscanApiKey = program.etherscanApiKey || 'ZAD4UI2RCXCQTP38EXS3UY2MPHFU5H9KB1'
    const etherscanParser = new EtherscanParser(etherscanApiKey, program.network)

    umlClasses = await etherscanParser.getUmlClasses(fileFolderAddress)
  }
  else {
    const depthLimit = parseInt(program.depthLimit)
    if (isNaN(depthLimit)) {
      console.error(`depthLimit option must be an integer. Not ${program.depthLimit}`)
      process.exit(1)
    }

    umlClasses = await parseUmlClassesFromFiles([fileFolderAddress], depthLimit)
  }

  convertUmlClasses(umlClasses, fileFolderAddress, program.outputFormat, program.outputFileName, program.clusterFolders).then(() => {
    debug(`Finished`)
  })
}

try {
  sol2uml()
}
catch (err) {
  console.error(`Failed to generate UML diagram ${err.message}`)
}
