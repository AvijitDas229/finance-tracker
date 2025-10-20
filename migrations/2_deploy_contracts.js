const FinanceTracker = artifacts.require("FinanceTracker");

module.exports = function(deployer) {
    deployer.deploy(FinanceTracker);
};