/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message` 
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *  
 */

const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');

class Blockchain {

    /**
     * Constructor of the class, you will need to setup your chain array and the height
     * of your chain (the length of your chain array).
     * Also everytime you create a Blockchain class you will need to initialized the chain creating
     * the Genesis Block.
     * The methods in this class will always return a Promise to allow client applications or
     * other backends to call asynchronous functions.
     */
    constructor() {
        this.chain = [];
        this.height = -1;
        this.initializeChain();
    }

    /**
     * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
     * You should use the `addBlock(block)` to create the Genesis Block
     * Passing as a data `{data: 'Genesis Block'}`
     */
    async initializeChain() {
        if (this.height === -1) {
            let block = new BlockClass.Block({ data: 'Genesis Block' });
            await this._addBlock(block);
        }
    }

    /**
     * Utility method that return a Promise that will resolve with the height of the chain
     */
    getChainHeight() {
        return new Promise((resolve, reject) => {
            resolve(this.height);
        });
    }



    /**
     * The requestMessageOwnershipVerification(address) method
     * will allow you  to request a message that you will use to
     * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
     * This is the first step before submit your Block.
     * The method return a Promise that will resolve with the message to be signed
     * @param {*} address 
     */
    requestMessageOwnershipVerification(address) {
        return new Promise((resolve) => {
            // Construct the message to be signed
            let message = `${address}:${new Date().getTime().toString().slice(0, -3)}:starRegistry`;

            // Resolve with the message to be signed
            resolve(message);
        });
    }

    /**
     * _addBlock(block) will store a block in the chain
     * @param {*} block 
     * The method will return a Promise that will resolve with the block added
     * or reject if an error happen during the execution.
     * You will need to check for the height to assign the `previousBlockHash`,
     * assign the `timestamp` and the correct `height`...At the end you need to 
     * create the `block hash` and push the block into the chain array. Don't for get 
     * to update the `this.height`
     * Note: the symbol `_` in the method name indicates in the javascript convention 
     * that this method is a private method. 
     */

    async _addBlock(block) {
        // Check for the height to assign the `previousBlockHash`
        let self = this;
        const previousBlock = self.chain[self.chain.length - 1];
        return new Promise(async (resolve, reject) => {
            // Check if the height is the Genesis block
            if (previousBlock) {
                // Assign the previous block's hash to the current block
                block.height = self.height;
                block.previousBlockHash = previousBlock.hash;
                block.time = new Date().getTime().toString().slice(0, -3);
            } else {
                // Assign the Genesis block data
                block.height = 0;
                block.previousBlockHash = null;
                block.time = new Date().getTime().toString().slice(0, -3);
            }

            // Generate the block hash
            block.hash = SHA256(JSON.stringify(block)).toString();

            // Validate the chain
            if (this.validateChain()) {
                // Push the block into the chain array
                self.chain.push(block);

                // Update the height of the blockchain
                self.height++;

                // Resolve with the block added
                resolve(block);
            } else {
                // Reject if the chain is invalid
                reject(Error('Error adding block: invalid chain'));
            }
        });
    }


    /**
     * The submitStar(address, message, signature, star) method
     * will allow users to register a new Block with the star object
     * into the chain. This method will resolve with the Block added or
     * reject with an error.
     * Algorithm steps:
     * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
     * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
     * 3. Check if the time elapsed is less than 5 minutes
     * 4. Veify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
     * 5. Create the block and add it to the chain
     * 6. Resolve with the block added.
     * @param {*} address 
     * @param {*} message 
     * @param {*} signature 
     * @param {*} star 
     */
    submitStar(address, message, signature, star) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            // Get the time from the message sent as a parameter
            let messageTime = parseInt(message.split(':')[1]);

            // Get the current time
            let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));

            // Check if the time elapsed is less than 5 minutes
            if (currentTime - messageTime < 300000) {
                // Verify the message with wallet address and signature
                if (bitcoinMessage.verify(message, address, signature)) {
                    // Create the block with owner address information and add it to the chain
                    let block = new BlockClass.Block({ owner: address, data: star });
                    self._addBlock(block).then((block) => {
                        resolve(block);
                    }).catch((error) => {
                        reject(error);
                    });
                } else {
                    reject(new Error('Invalid message or signature'));
                }
            } else {
                reject(new Error('Message expired'));
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block
     *  with the hash passed as a parameter.
     * Search on the chain array for the block that has the hash.
     * @param {*} hash 
     */
    getBlockByHash(hash) {
        let self = this;
        return new Promise((resolve, reject) => {
            // Search on the chain array for the block that has the hash
            let block = self.chain.find(b => b.hash === hash);

            // If the block is found, resolve with the block
            if (block) {
                resolve(block);
            } else {
                // If the block is not found, reject with an error
                reject(new Error('Block not found'));
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block object 
     * with the height equal to the parameter `height`
     * @param {*} height 
     */
    getBlockByHeight(height) {
        let self = this;
        return new Promise((resolve, reject) => {
            let block = self.chain.filter(p => p.height === height)[0];
            if (block) {
                resolve(block);
            } else {
                resolve(null);
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with an array of Stars objects existing in the chain 
     * and are belongs to the owner with the wallet address passed as parameter.
     * Remember the star should be returned decoded.
     * @param {*} address 
     */
    getStarsByWalletAddress(address) {
        let self = this;
        let stars = [];
        return new Promise((resolve) => {
            //create a loop to check blocks
            self.chain.forEach(async (block) => {
                try {
                    let dataB = await block.getBData();
                    //console.log(dataB);

                    //check for data & compare owner address w/star address
                    if (dataB) {
                        if (dataB.owner === address) {
                            stars.push(dataB);
                        } else {
                            console.log("Address data n/a - line 216 in bc.js");
                        }
                    }
                } catch (e) {
                    console.log(e);
                }
            });
            resolve(stars);
        });
    }

    /**
     * This method will return a Promise that will resolve with the list of errors when validating the chain.
     * Steps to validate:
     * 1. You should validate each block using `validateBlock`
     * 2. Each Block should check the with the previousBlockHash
     */
    validateChain() {
        let self = this;
        let errorLog = [];
        return new Promise(async (resolve, reject) => {
            // Iterate through the chain array
            for (let i = 0; i < self.height; i++) {
                // Validate the current block
                let isValid = await self.chain[i].validate();

                // If the block is not valid, add an error to the error log
                if (!isValid) {
                    errorLog.push(new Error(`Block at height ${i} is invalid`));
                }

                // If the block is not the Genesis block, check if the previous block hash matches the current block
                if (i > 0) {
                    let previousBlock = self.chain[i - 1];
                    let currentBlock = self.chain[i];
                    if (currentBlock.previousBlockHash !== previousBlock.hash) {
                        errorLog.push(new Error(`Block at height ${i} has an invalid previous block hash`));
                    }
                }
            }

            // If there are no errors, resolve with an empty array
            if (errorLog.length === 0) {
                resolve([]);
            } else {
                // If there are errors, resolve with the error log
                resolve(errorLog);
            }
        });
    }
}

module.exports.Blockchain = Blockchain;   