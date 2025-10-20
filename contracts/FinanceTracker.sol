// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FinanceTracker {
    struct Transaction {
        uint id;
        string description;
        uint amount;
        string transactionType;
        address sender;
        uint timestamp;
    }
    
    mapping(uint => Transaction) public transactions;
    uint public transactionCount;
    address public owner;
    
    event TransactionAdded(
        uint id,
        string description,
        uint amount,
        string transactionType,
        address sender,
        uint timestamp
    );
    
    constructor() {
        owner = msg.sender;
        transactionCount = 0;
    }
    
    function addTransaction(
        string memory _description,
        uint _amount,
        string memory _transactionType
    ) public {
        transactionCount++;
        transactions[transactionCount] = Transaction(
            transactionCount,
            _description,
            _amount,
            _transactionType,
            msg.sender,
            block.timestamp
        );
        
        emit TransactionAdded(
            transactionCount,
            _description,
            _amount,
            _transactionType,
            msg.sender,
            block.timestamp
        );
    }
    
    function getTransaction(uint _id) public view returns (
        uint,
        string memory,
        uint,
        string memory,
        address,
        uint
    ) {
        Transaction memory t = transactions[_id];
        return (
            t.id,
            t.description,
            t.amount,
            t.transactionType,
            t.sender,
            t.timestamp
        );
    }
    
    function getAllTransactions() public view returns (Transaction[] memory) {
        Transaction[] memory allTransactions = new Transaction[](transactionCount);
        for (uint i = 0; i < transactionCount; i++) {
            allTransactions[i] = transactions[i + 1];
        }
        return allTransactions;
    }
}